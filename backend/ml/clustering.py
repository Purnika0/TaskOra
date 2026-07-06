from sklearn.cluster import KMeans
from sklearn.ensemble import IsolationForest
from sklearn.preprocessing import StandardScaler
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
    K-Means Clustering — group students into
    High Performer / Average / At-Risk.
    """
    df = build_student_features(teacher)

    if len(df) < 3:
        return {
            "error": "Not enough students to cluster (minimum 3 required).",
            "groups": []
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
    scaler   = StandardScaler()
    scaled   = scaler.fit_transform(features)

    kmeans      = KMeans(n_clusters=3, random_state=42, n_init=10)
    df['cluster'] = kmeans.fit_predict(scaled)

    # Label clusters by average completion rate (highest → High Performer)
    cluster_means   = df.groupby('cluster')['completion_rate'].mean()
    sorted_clusters = cluster_means.sort_values(ascending=False).index.tolist()
    label_map = {
        sorted_clusters[0]: 'High Performer',
        sorted_clusters[1]: 'Average',
        sorted_clusters[2]: 'At-Risk',
    }
    df['group'] = df['cluster'].map(label_map)

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