from sklearn.cluster import KMeans
from sklearn.ensemble import IsolationForest
from sklearn.preprocessing import StandardScaler
from scipy import stats
import numpy as np
import pandas as pd
from django.utils import timezone
from tasks.models import Task
from users.models import User


def build_student_features():
    """Build a feature DataFrame for all students."""
    students = User.objects.filter(role='student')
    data = []

    for student in students:
        tasks = Task.objects.filter(student=student)
        total = tasks.count()
        if total == 0:
            continue

        completed       = tasks.filter(status=Task.Status.COMPLETED).count()
        completion_rate = completed / total

        overdue = tasks.filter(status=Task.Status.OVERDUE).count()

        # Average days early based on completed_at vs assignment due_date
        # Negative value = submitted late
        days_list = []
        for task in tasks.filter(
            status=Task.Status.COMPLETED,
            completed_at__isnull=False
        ):
            days = (task.assignment.due_date - task.completed_at.date()).days
            days_list.append(days)

        avg_days_early = round(np.mean(days_list), 2) if days_list else 0

        data.append({
            'student_id':       student.id,
            'student_name':     student.full_name or student.username,
            'completion_rate':  round(completion_rate, 4),
            'avg_days_early':   avg_days_early,
            'overdue_count':    overdue,
            'total_tasks':      total,
        })

    return pd.DataFrame(data)


def cluster_students():
    """
    K-Means Clustering — group students into
    High Performer / Average / At-Risk.
    """
    df = build_student_features()

    if len(df) < 3:
        return {
            "error": "Not enough students to cluster (minimum 3 required).",
            "groups": []
        }

    features = df[['completion_rate', 'avg_days_early', 'overdue_count']]
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

    return {
        "summary": summary,
        "students": df[[
            'student_id', 'student_name', 'group',
            'completion_rate', 'avg_days_early', 'overdue_count'
        ]].to_dict('records')
    }


def detect_outliers():
    """
    Isolation Forest + Z-Score —
    detect students with unusual behaviour patterns.
    """
    df = build_student_features()

    if len(df) < 4:
        return {
            "error": "Not enough students for outlier detection (minimum 4 required).",
            "outliers": []
        }

    features = df[['completion_rate', 'avg_days_early', 'overdue_count']]
    scaler   = StandardScaler()
    scaled   = scaler.fit_transform(features)

    iso           = IsolationForest(contamination=0.1, random_state=42)
    df['iso_flag'] = iso.fit_predict(scaled)   # -1 = outlier
    df['z_score']  = stats.zscore(df['completion_rate'])

    outliers = []
    for _, row in df.iterrows():
        iso_outlier = row['iso_flag'] == -1
        z_outlier   = abs(row['z_score']) > 2

        if iso_outlier or z_outlier:
            reasons = []
            if row['z_score'] < -2:
                reasons.append(
                    f"Completion rate is {abs(round(row['z_score'], 1))} "
                    f"standard deviations below class average"
                )
            elif row['z_score'] > 2:
                reasons.append("Exceptionally high performer")
            if iso_outlier:
                reasons.append(
                    "Unusual combination of completion rate, "
                    "submission timing, and overdue tasks"
                )

            outliers.append({
                'student_id':       int(row['student_id']),
                'student_name':     row['student_name'],
                'completion_rate':  round(row['completion_rate'] * 100, 1),
                'avg_days_early':   round(row['avg_days_early'], 1),
                'overdue_count':    int(row['overdue_count']),
                'z_score':          round(row['z_score'], 2),
                'flagged_by':       ' + '.join(filter(None, [
                    'Isolation Forest' if iso_outlier else '',
                    'Z-Score'          if z_outlier   else '',
                ])),
                'reason': ' | '.join(reasons),
            })

    return {"outliers": outliers, "total_flagged": len(outliers)}