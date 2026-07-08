// src/utils/urgencyLabel.js
//
// Display helpers for Task.priority_score — the system-computed *urgency*
// (0-1 float, recomputed live on every fetch).
//
// This is deliberately separate from assignment.priority (the teacher-set
// *importance*, 1-5, static), which already has its own display helpers in
// helpers.js: priorityToLevel / priorityColor / priorityLabel. Don't merge
// the two — they answer different questions:
//   • Importance (helpers.js)   → "how much weight did the teacher give this"
//   • Urgency    (this file)    → "how urgent is this right now"
// Label them distinctly in the UI ("Importance" vs "Urgency") so it's clear
// which one a badge is showing.

export function urgencyBucket(score) {
    const s = Number(score) || 0
    if (s >= 0.65) return 'high'
    if (s >= 0.35) return 'medium'
    return 'low'
}

export function urgencyLabel(score) {
    switch (urgencyBucket(score)) {
        case 'high':   return 'High'
        case 'medium': return 'Medium'
        default:       return 'Low'
    }
}

export function urgencyColor(score) {
    switch (urgencyBucket(score)) {
        case 'high':   return '#e05252'
        case 'medium': return '#d4a93c'
        default:       return '#3cb87a'
    }
}

export function urgencyBg(score) {
    switch (urgencyBucket(score)) {
        case 'high':   return '#fde8e8'
        case 'medium': return '#fff8e6'
        default:       return '#e0f7ee'
    }
}