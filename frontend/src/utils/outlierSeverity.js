// src/utils/outlierSeverity.js
//
// Single source of truth for how an Isolation Forest / Z-Score outlier
// (from ml/clustering.py -> detect_outliers()) is labeled and colored.
// Used identically by AnalyticsPage.jsx and TeacherDashboard.jsx so the
// same flagged student never shows two different labels depending on
// which page you're looking at.
//
// NOTE: intentionally uses different wording ("Critical" / "Watch") than
// the K-Means "Needs Support" cluster label (see GROUP_CONFIG/GRP in the
// two dashboard files). Those two features answer different questions —
// "which performance tier" vs "whose pattern looks statistically odd" —
// so they shouldn't share a label or a reader will assume they mean the
// same thing.

export function getOutlierSeverity(rate) {
    const isCritical = rate < 30

    return isCritical
        ? {
            level:      'critical',
            label:      'Critical',
            bg:         '#fff7f7',
            border:     '#fecaca',
            badgeBg:    '#fee2e2',
            badgeText:  '#dc2626',
            barColor:   '#ef4444',
            avatarBg:   '#fee2e2',
            avatarText: '#dc2626',
        }
        : {
            level:      'watch',
            label:      'Watch',
            bg:         '#fffbeb',
            border:     '#fde68a',
            badgeBg:    '#fef3c7',
            badgeText:  '#d97706',
            barColor:   '#f59e0b',
            avatarBg:   '#fef3c7',
            avatarText: '#d97706',
        }
}

// detect_outliers() joins multiple reasons into one string with " | "
// (see ml/clustering.py — `" | ".join(filter(None, reasons))`). Split
// it back into a clean list so every reason renders on its own line
// instead of leaking raw "|" characters into a sentence.
export function splitReasons(reason) {
    if (!reason) return []
    return reason.split('|').map(r => r.trim()).filter(Boolean)
}