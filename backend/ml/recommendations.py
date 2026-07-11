"""
Personalized task recommendations via item-based collaborative filtering:
"students similar to you have completed X, and you haven't yet" — see
get_task_recommendations()'s docstring for the full algorithm.
"""
from sklearn.metrics.pairwise import cosine_similarity
import numpy as np
from tasks.models import Task, Assignment
from courses.models import Enrollment


def get_task_recommendations(student):
    """
    True Collaborative Filtering using a user-item matrix.

    Matrix structure:
        rows    = students in the same batch
        columns = assignments shared within that batch
        values  = 1 if completed, 0 otherwise

    Steps:
        1. Build the user-item matrix for same-batch students
        2. Compute cosine similarity between this student and all others
        3. Find assignments completed by similar students but not this student
        4. Return top 5 pending/overdue tasks from those assignments
    """

    # ----------------------------------------------------------------
    # Step 1: Get all students in the same batch (sharing at least one course)
    # ----------------------------------------------------------------
    enrolled_course_ids = list(
        Enrollment.objects.filter(student=student)
        .values_list('course_id', flat=True)
    )

    if not enrolled_course_ids:
        return []

    same_batch_student_ids = list(
        Enrollment.objects.filter(course_id__in=enrolled_course_ids)
        .exclude(student=student)
        .values_list('student_id', flat=True)
        .distinct()
    )

    if not same_batch_student_ids:
        return []

    all_student_ids = [student.id] + same_batch_student_ids

    # ----------------------------------------------------------------
    # Step 2: Get all assignments in this batch's courses
    # ----------------------------------------------------------------
    assignment_ids = list(
        Assignment.objects.filter(course_id__in=enrolled_course_ids)
        .values_list('id', flat=True)
    )

    if not assignment_ids:
        return []

    # ----------------------------------------------------------------
    # Step 3: Build the user-item matrix
    # rows = students, columns = assignments, values = 1/0
    # ----------------------------------------------------------------
    # Get all completed tasks in one query
    completed_pairs = set(
        Task.objects.filter(
            student_id__in=all_student_ids,
            assignment_id__in=assignment_ids,
            status=Task.Status.COMPLETED,
        ).values_list('student_id', 'assignment_id')
    )

    # Build matrix
    student_idx_map    = {sid: i for i, sid in enumerate(all_student_ids)}
    assignment_idx_map = {aid: j for j, aid in enumerate(assignment_ids)}

    matrix = np.zeros((len(all_student_ids), len(assignment_ids)), dtype=float)
    for (sid, aid) in completed_pairs:
        if sid in student_idx_map and aid in assignment_idx_map:
            matrix[student_idx_map[sid]][assignment_idx_map[aid]] = 1.0

    # ----------------------------------------------------------------
    # Step 4: Compute cosine similarity
    # ----------------------------------------------------------------
    this_student_row = matrix[0].reshape(1, -1)  # student is always index 0

    # Handle zero vector — student has no completions yet
    if this_student_row.sum() == 0:
        # Fall back: recommend overdue tasks first, then pending by due date
        fallback = Task.objects.filter(
            student=student,
            status__in=[Task.Status.PENDING, Task.Status.OVERDUE],
            assignment_id__in=assignment_ids,
        ).select_related('assignment', 'assignment__course').order_by(
            'assignment__due_date'
        )[:5]

        return [_format_recommendation(task, 0, 1.0) for task in fallback]

    similarities = cosine_similarity(this_student_row, matrix[1:])[0]  # exclude self

    # Top 5 most similar students
    top_indices = np.argsort(similarities)[::-1][:5]
    top_student_ids = [same_batch_student_ids[i] for i in top_indices]
    top_similarities = {
        same_batch_student_ids[i]: float(similarities[i])
        for i in top_indices
    }

    # ----------------------------------------------------------------
    # Step 5: Find assignments completed by similar students
    # but this student hasn't completed (and still pending/overdue)
    # ----------------------------------------------------------------
    similar_completed_ids = set(
        Task.objects.filter(
            student_id__in=top_student_ids,
            assignment_id__in=assignment_ids,
            status=Task.Status.COMPLETED,
        ).values_list('assignment_id', flat=True)
    )

    # This student's pending/overdue tasks
    actionable_tasks = Task.objects.filter(
        student=student,
        status__in=[Task.Status.PENDING, Task.Status.OVERDUE],
        assignment_id__in=similar_completed_ids,
    ).select_related('assignment', 'assignment__course').order_by(
        'assignment__due_date'
    )

    if not actionable_tasks.exists():
        return []

    # ----------------------------------------------------------------
    # Step 6: Score and format recommendations
    # ----------------------------------------------------------------
    recommendations = []
    seen = set()

    for task in actionable_tasks:
        if task.assignment_id in seen:
            continue
        seen.add(task.assignment_id)

        # How many of the top similar students completed this assignment
        completed_by = Task.objects.filter(
            student_id__in=top_student_ids,
            assignment=task.assignment,
            status=Task.Status.COMPLETED,
        ).count()

        if completed_by == 0:
            continue

        # Best similarity score among those who completed it
        completers = list(
            Task.objects.filter(
                student_id__in=top_student_ids,
                assignment=task.assignment,
                status=Task.Status.COMPLETED,
            ).values_list('student_id', flat=True)
        )
        best_sim = max(
            top_similarities.get(sid, 0.0) for sid in completers
        )

        recommendations.append(
            _format_recommendation(task, completed_by, best_sim)
        )

    # Sort: overdue first, then by how many similar students completed it,
    # then by similarity score
    recommendations.sort(key=lambda x: (
        0 if x['status'] == Task.Status.OVERDUE else 1,
        -x['completed_by_similar'],
        -x['similarity_score'],
    ))

    return recommendations[:5]


def _format_recommendation(task, completed_by, similarity_score):
    """Format a task into a recommendation dict."""
    if completed_by == 0:
        reason = "This task is due soon — get started!"
    elif completed_by == 1:
        reason = "A student similar to you has already completed this"
    else:
        reason = f"{completed_by} students similar to you have already completed this"

    return {
        "task_id":              task.id,
        "assignment_id":        task.assignment.id,
        "title":                task.assignment.title,
        "course":               task.assignment.course.title.split('(')[0].strip(),
        "task_type":            task.assignment.task_type,
        "due_date":             str(task.assignment.due_date),
        "status":               task.status,
        "completed_by_similar": completed_by,
        "similarity_score":     round(similarity_score, 2),
        "reason":               reason,
    }