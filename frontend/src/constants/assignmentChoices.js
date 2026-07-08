// src/constants/assignmentChoices.js
//
// Single source of truth for the two fields on Assignment that both
// assignment-creation forms (AssignmentManagement.jsx and
// TeacherDashboard.jsx) need to render identically, matching the backend
// choices exactly (Assignment.TaskType / Assignment.PriorityLevel in
// tasks/models.py). If either form hardcodes its own list again, it will
// drift out of sync with the other and/or with the backend — always
// import from here instead.

// Must match Assignment.TaskType.choices in models.py exactly.
export const TASK_TYPES = [
    { value: 'assignment', label: 'Assignment' },
    { value: 'exam',       label: 'Exam'       },
    { value: 'project',    label: 'Project'    },
    { value: 'homework',   label: 'Homework'   },
    { value: 'quiz',       label: 'Quiz'       },
    { value: 'lab',        label: 'Lab'        },
    { value: 'other',      label: 'Other'      },
]

// Must match Assignment.PriorityLevel.choices in models.py exactly.
// This is the teacher-set *importance* (static, set once). It is distinct
// from Task.priority_score, the system-computed *urgency* — see
// src/utils/priorityLabel.js for that one.
export const PRIORITY_CHOICES = [
    { value: 1, label: 'Low'         },
    { value: 2, label: 'Medium-Low'  },
    { value: 3, label: 'Medium'      },
    { value: 4, label: 'Medium-High' },
    { value: 5, label: 'High'        },
]

export function priorityLabelFor(value) {
    const match = PRIORITY_CHOICES.find(p => p.value === Number(value))
    return match ? match.label : 'Medium'
}