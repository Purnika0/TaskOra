from sklearn.metrics.pairwise import cosine_similarity
import numpy as np
from tasks.models import Task
from users.models import User


def get_task_recommendations(student):
    """
    Collaborative Filtering — recommend task types
    based on what similar students have completed.
    """
    all_students = User.objects.filter(role='student')
    task_types = ['assignment', 'exam', 'project', 'homework', 'quiz', 'personal']

    # Build vector for each student
    student_vectors = {}
    for s in all_students:
        vector = [
            Task.objects.filter(
                student=s,
                is_completed=True,
                task_type=t
            ).count()
            for t in task_types
        ]
        student_vectors[s.id] = vector

    if student.id not in student_vectors:
        return []

    student_ids = list(student_vectors.keys())
    matrix = np.array(list(student_vectors.values()))

    if len(student_ids) < 2:
        return []

    # Compute cosine similarity
    student_idx = student_ids.index(student.id)
    student_vector = matrix[student_idx].reshape(1, -1)
    similarities = cosine_similarity(student_vector, matrix)[0]

    # Top 3 most similar students (excluding self)
    similar_indices = np.argsort(similarities)[::-1]
    similar_student_ids = [
        student_ids[i]
        for i in similar_indices
        if student_ids[i] != student.id
    ][:3]

    # Find task types student hasn't done but similar students have
    student_counts = dict(zip(task_types, student_vectors[student.id]))
    recommendations = []

    for sim_id in similar_student_ids:
        sim_counts = dict(zip(task_types, student_vectors[sim_id]))
        sim_score = round(float(similarities[student_ids.index(sim_id)]), 2)

        for task_type, count in sim_counts.items():
            if count > 2 and student_counts.get(task_type, 0) == 0:
                # Check if already recommended
                already = any(r['task_type'] == task_type for r in recommendations)
                if not already:
                    recommendations.append({
                        "task_type": task_type,
                        "reason": f"Students similar to you frequently complete {task_type} tasks",
                        "similarity_score": sim_score
                    })

    return sorted(recommendations, key=lambda x: x['similarity_score'], reverse=True)