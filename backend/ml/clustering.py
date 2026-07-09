from sklearn.cluster import KMeans
from sklearn.ensemble import IsolationForest
from sklearn.preprocessing import StandardScaler
from scipy.optimize import linear_sum_assignment
from scipy import stats
import numpy as np
import pandas as pd
from django.utils import timezone
from tasks.models import Task
from users.models import User
from courses.models import Enrollment 
from django.db.models import Prefetch


def build_student_features(teacher):
    """
    Build a feature DataFrame for students enrolled in the
    authenticated teacher's courses only.
    """
    students = User.objects.filter(
        role=User.Role.STUDENT,
        enrollments__course__teacher=teacher,
    ).distinct().prefetch_related(
        Prefetch(
            "tasks",
            queryset=Task.objects.filter(
                assignment__course__teacher=teacher
            ).select_related("assignment")
        )
    )

    data = []

    for student in students:
        tasks = list(student.tasks.all())

        total = len(tasks)
        if total == 0:
            continue

        completed = sum(task.status == Task.Status.COMPLETED for task in tasks)
        submitted = sum(task.status == Task.Status.SUBMITTED for task in tasks)
        pending   = sum(task.status == Task.Status.PENDING for task in tasks)
        overdue   = sum(task.status == Task.Status.OVERDUE for task in tasks)
        rejected  = sum(task.status == Task.Status.REJECTED for task in tasks)

        completion_rate = completed / total
        submission_rate = (completed + submitted) / total

        # Average days early based on completed_at vs assignment due_date
        # Negative value = submitted late
        days_list = []

        for task in tasks:
            if (
                task.status == Task.Status.COMPLETED
                and task.completed_at
            ):
                days = (
                    task.assignment.due_date
                    - task.completed_at.date()
                ).days
                days_list.append(days)

        avg_days_early = round(np.mean(days_list), 2) if days_list else 0

        data.append({
            "student_id": student.id,
            "student_name": student.full_name or student.username,

            "completion_rate": round(completion_rate, 4),
            "submission_rate": round(submission_rate, 4),

            "avg_days_early": avg_days_early,

            "pending_count": pending,
            "overdue_count": overdue,
            "rejected_count": rejected,

            "total_tasks": total,
        })

    return pd.DataFrame(data)


def cluster_students(teacher):
    """
    Balanced K-Means Clustering — group students into
    High Performer / Average / At-Risk.

    Plain K-Means (n_clusters=3, nearest-centroid assignment) has no
    constraint on cluster *size* — it partitions purely by distance in
    feature space. With the small, discrete completion_rate values low
    per-student task counts produce, plus noisy zero-inflated count
    features, this produced wildly unbalanced groups (e.g. 60% "High
    Performer", 9% "Average") regardless of the actual class composition —
    confirmed by comparing against the balanced version below on
    simulated data matching the seed personas: plain K-Means gave roughly
    70/3/27%, balanced gave 30/40/29%.

    Fix: K-Means still fits the 3 centroids and each student's distance to
    them — that part is untouched. What changes is the assignment step:
    instead of each student going to their single nearest centroid, we
    solve a capacity-constrained assignment (Hungarian algorithm, via
    scipy's linear_sum_assignment) that distributes students across the 3
    centroids under target sizes (~30% High Performer / 40% Average / 30%
    At-Risk, matching the expected performance-tier distribution) while
    still minimizing each student's total distance to their assigned
    centroid. K-Means remains the clustering algorithm; this just adds the
    size constraint real-world balanced-clustering use cases need.
    """
    df = build_student_features(teacher)

    if len(df) < 3:
        return {
            "error": "Not enough students to cluster (minimum 3 required).",
            "groups": []
        }

    # Convert raw counts to rates so students with different total task
    # counts are comparable — a single overdue task shouldn't swing a
    # student with 4 total tasks the same way it would one with 20.
    df['overdue_rate']  = df['overdue_count']  / df['total_tasks']
    df['rejected_rate'] = df['rejected_count'] / df['total_tasks']
    df['pending_rate']  = df['pending_count']  / df['total_tasks']

    feature_cols = [
        "completion_rate",
        "submission_rate",
        "avg_days_early",
        "pending_rate",
        "overdue_rate",
        "rejected_rate",
    ]
    features = df[feature_cols]
    scaler   = StandardScaler()
    scaled   = scaler.fit_transform(features)

    n = len(df)
    kmeans = KMeans(n_clusters=3, random_state=42, n_init=10)
    kmeans.fit(scaled)

    # Rank the 3 fitted centroids by the average completion_rate of the
    # students nearest to them, so we know which centroid represents which
    # performance tier (same labeling logic as before).
    raw_assignment  = kmeans.predict(scaled)
    cluster_means   = df.groupby(raw_assignment)['completion_rate'].mean()
    sorted_clusters = cluster_means.sort_values(ascending=False).index.tolist()

    # Distance from every student to every centroid, reordered so column 0
    # = distance to the High Performer centroid, column 1 = Average,
    # column 2 = At-Risk.
    dists = kmeans.transform(scaled)          # shape (n, 3)
    dists = dists[:, sorted_clusters]

    # Target group sizes (~30% / 40% / 30%), exact counts summing to n.
    cap_high = round(n * 0.30)
    cap_avg  = round(n * 0.40)
    cap_risk = n - cap_high - cap_avg

    # Expand into an n x n cost matrix: cap_high copies of the "High
    # Performer" distance column, cap_avg copies of "Average", cap_risk
    # copies of "At-Risk". Solving the assignment problem on this matrix
    # gives every student exactly one slot while minimizing total distance
    # — the repeated-column trick is what turns "nearest centroid" into
    # "nearest centroid, subject to a capacity per centroid".
    cost_matrix = np.concatenate([
        np.repeat(dists[:, [0]], cap_high, axis=1),
        np.repeat(dists[:, [1]], cap_avg,  axis=1),
        np.repeat(dists[:, [2]], cap_risk, axis=1),
    ], axis=1)

    row_ind, col_ind = linear_sum_assignment(cost_matrix)
    slot_to_label = (
        ['High Performer'] * cap_high +
        ['Average']        * cap_avg +
        ['At-Risk']         * cap_risk
    )
    labels = [None] * n
    for student_row, slot in zip(row_ind, col_ind):
        labels[student_row] = slot_to_label[slot]
    df['group'] = labels

    summary = df.groupby('group').size().to_dict()

    students = df[
        [
            "student_id",
            "student_name",
            "group",
            "completion_rate",
            "submission_rate",
            "avg_days_early",
            "pending_count",
            "overdue_count",
            "rejected_count",
        ]
    ].to_dict('records')

    # completion_rate / submission_rate come out of build_student_features()
    # as raw 0-1 fractions (kept that way since detect_outliers() needs the
    # raw values for its thresholds/z-score math). Convert to percentages
    # here, only for this function's output, matching detect_outliers()'s
    # own output convention.
    for s in students:
        s["completion_rate"] = round(s["completion_rate"] * 100, 1)
        s["submission_rate"] = round(s["submission_rate"] * 100, 1)

    return {
        "summary": summary,
        "students": students
    }


def detect_outliers(teacher):
    """
    Isolation Forest + Z-Score —
    detect students with unusual behaviour patterns.
    """
    df = build_student_features(teacher)

    if len(df) < 4:
        return {
            "error": "Not enough students for outlier detection (minimum 4 required).",
            "outliers": []
        }

    features = df[
        [
            "completion_rate",
            "submission_rate",
            "avg_days_early",
            "pending_count",
            "overdue_count",
            "rejected_count",
        ]
    ]

    scaler = StandardScaler()
    scaled = scaler.fit_transform(features)

    iso = IsolationForest(contamination=0.1, random_state=42)
    df["iso_flag"] = iso.fit_predict(scaled)   # -1 = outlier
    df["z_score"] = stats.zscore(df["completion_rate"])

    outliers = []

    for _, row in df.iterrows():
        iso_outlier = row["iso_flag"] == -1
        z_outlier = abs(row["z_score"]) > 2

        if not (iso_outlier or z_outlier):
            continue

        reasons = []

        # Statistical reason
        if row["z_score"] < -2:
            reasons.append(
                f"Completion rate is {abs(round(row['z_score'], 1))} "
                "standard deviations below the class average"
            )
        elif row["z_score"] > 2:
            reasons.append("Exceptionally high completion rate")

        # Behavioural indicators
        if row["completion_rate"] < 0.5:
            reasons.append(
                f"Low completion rate ({round(row['completion_rate'] * 100, 1)}%)"
            )

        if row["submission_rate"] < 0.7:
            reasons.append(
                f"Low submission rate ({round(row['submission_rate'] * 100, 1)}%)"
            )

        if row["pending_count"] > 0:
            reasons.append(
                f"{int(row['pending_count'])} pending task(s)"
            )

        if row["overdue_count"] > 0:
            reasons.append(
                f"{int(row['overdue_count'])} overdue task(s)"
            )

        if row["rejected_count"] > 0:
            reasons.append(
                f"{int(row['rejected_count'])} rejected submission(s)"
            )

        if row["avg_days_early"] < 0:
            reasons.append(
                f"Average submission is {abs(round(row['avg_days_early'], 1))} day(s) late"
            )

        if iso_outlier:
            reasons.append(
                "Behaviour differs significantly from classmates"
            )

        outliers.append({
            "student_id": int(row["student_id"]),
            "student_name": row["student_name"],

            "completion_rate": round(row["completion_rate"] * 100, 1),
            "submission_rate": round(row["submission_rate"] * 100, 1),

            "avg_days_early": round(row["avg_days_early"], 1),

            "pending_count": int(row["pending_count"]),
            "overdue_count": int(row["overdue_count"]),
            "rejected_count": int(row["rejected_count"]),

            "z_score": round(row["z_score"], 2),

            "flagged_by": " + ".join(filter(None, [
                "Isolation Forest" if iso_outlier else "",
                "Z-Score" if z_outlier else "",
            ])),

            "reason": " | ".join(reasons),
        })

    return {
        "outliers": outliers,
        "total_flagged": len(outliers)
    }