// src/services/ml.service.js
// Wraps all /api/ml/ endpoints.
//
// Three ML algorithms backed by the backend:
//
//  1. Collaborative Filtering (Cosine Similarity)
//     GET /api/ml/recommendations/
//     Student — recommends task types based on what similar students completed.
//     Response: { student, recommendations: [{ task_type, reason, similarity_score }], total }
//
//  2. K-Means Clustering
//     GET /api/ml/analytics/teacher/student-groups/
//     Teacher — groups students into High Performer / Average / At-Risk.
//     Response: { summary: { "High Performer": N, ... }, students: [...] }
//
//  3. Isolation Forest (Outlier Detection)
//     GET /api/ml/analytics/teacher/outliers/
//     Teacher — flags students with unusual behavior patterns.
//     Response: { outliers: [{ student_name, completion_rate, z_score, flagged_by, reason }], total_flagged }

import api from './api.js'

const mlService = {
  // Collaborative Filtering — student recommendations
    async getRecommendations() {
        const { data } = await api.get('/api/ml/recommendations/')
        return data
    },

    // K-Means Clustering — teacher student groups
    async getStudentGroups() {
        const { data } = await api.get('/api/ml/analytics/teacher/student-groups/')
        return data
    },

    // Isolation Forest — teacher outlier detection
    async getOutliers() {
        const { data } = await api.get('/api/ml/analytics/teacher/outliers/')
        return data
    },
}

export default mlService