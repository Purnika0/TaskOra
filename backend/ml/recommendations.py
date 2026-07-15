"""
Personalized task recommendations via user-based collaborative filtering:
"students similar to you have completed X, and you haven't yet" — see
get_task_recommendations()'s docstring for the full algorithm.

Recommendations are computed on a per-course basis: peers and the
user-item matrix are scoped to one course at a time, so a student's
similarity score (and the tasks recommended off the back of it) is
never influenced by activity in an unrelated course. Results from
each enrolled course are then merged into a single ranked list.
"""
from sklearn.metrics.pairwise import cosine_similarity
import numpy as np
from tasks.models import Task, Assignment
from courses.models import Enrollment


def get_task_recommendations(student):
    """
    User-based Collaborative Filtering using a user-item matrix, computed
    independently for each course the student is enrolled in.

    For every enrolled course:
        Matrix structure:
            rows    = students enrolled in that course
            columns = assignments belonging to that course
            values  = 1 if completed, 0 otherwise

        Steps:
            1. Build the user-item matrix for that course's students
            2. Compute cosine similarity between this student and peers
               in that course (row-wise, i.e. user-user similarity)
            3. Find assignments completed by similar students but not
               this student
            4. Collect scored recommendations for that course

    The per-course recommendation lists are then merged and the
    overall top 5 are returned.
    """

    enrolled_course_ids = list(
        Enrollment.objects.filter(student=student)
        .values_list('course_id', flat=True)
    )

    if not enrolled_course_ids:
        return []

    recommendations = []
    for course_id in enrolled_course_ids:
        recommendations.extend(
            _get_course_recommendations(student, course_id)
        )

    # Sort across all courses: overdue first, then by how many similar
    # students completed it, then by similarity score
    recommendations.sort(key=lambda x: (
        0 if x['status'] == Task.Status.OVERDUE else 1,
        -x['completed_by_similar'],
        -x['similarity_score'],
    ))

    return recommendations[:5]


def _get_course_recommendations(student, course_id):
    """
    Run user-based collaborative filtering scoped to a single course: peers
    are other students enrolled in this course, and the matrix only
    covers this course's assignments.
    """

    # ----------------------------------------------------------------
    # Step 1: Get all other students enrolled in this course
    # ----------------------------------------------------------------
    course_student_ids = list(
        Enrollment.objects.filter(course_id=course_id)
        .exclude(student=student)
        .values_list('student_id', flat=True)
        .distinct()
    )

    if not course_student_ids:
        return []

    all_student_ids = [student.id] + course_student_ids

    # ----------------------------------------------------------------
    # Step 2: Get all assignments in this course
    # ----------------------------------------------------------------
    assignment_ids = list(
        Assignment.objects.filter(course_id=course_id)
        .values_list('id', flat=True)
    )

    if not assignment_ids:
        return []

    # ----------------------------------------------------------------
    # Step 3: Build the user-item matrix
    # rows = students, columns = assignments, values = 1/0
    # ----------------------------------------------------------------
    completed_pairs = set(
        Task.objects.filter(
            student_id__in=all_student_ids,
            assignment_id__in=assignment_ids,
            status=Task.Status.COMPLETED,
        ).values_list('student_id', 'assignment_id')
    )

    student_idx_map    = {sid: i for i, sid in enumerate(all_student_ids)}
    assignment_idx_map = {aid: j for j, aid in enumerate(assignment_ids)}

    matrix = np.zeros((len(all_student_ids), len(assignment_ids)), dtype=float)
    for (sid, aid) in completed_pairs:
        if sid in student_idx_map and aid in assignment_idx_map:
            matrix[student_idx_map[sid]][assignment_idx_map[aid]] = 1.0

    # ----------------------------------------------------------------
    # Step 4: Compute cosine similarity between this student's row and
    # every other student's row (user-user similarity)
    # ----------------------------------------------------------------
    this_student_row = matrix[0].reshape(1, -1)  # student is always index 0

    # Handle zero vector — student has no completions in this course yet
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

    # Top 5 most similar students in this course
    top_indices = np.argsort(similarities)[::-1][:5]
    top_student_ids = [course_student_ids[i] for i in top_indices]
    top_similarities = {
        course_student_ids[i]: float(similarities[i])
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
    course_recommendations = []
    seen = set()

    for task in actionable_tasks:
        if task.assignment_id in seen:
            continue
        seen.add(task.assignment_id)

        completed_by = Task.objects.filter(
            student_id__in=top_student_ids,
            assignment=task.assignment,
            status=Task.Status.COMPLETED,
        ).count()

        if completed_by == 0:
            continue

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

        course_recommendations.append(
            _format_recommendation(task, completed_by, best_sim)
        )

    return course_recommendations


def _format_recommendation(task, completed_by, similarity_score):
    """Format a task into a recommendation dict."""
    if completed_by == 0:
        reason = f"You haven't completed any tasks in {task.assignment.course.title.split('(')[0].strip()} yet"
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