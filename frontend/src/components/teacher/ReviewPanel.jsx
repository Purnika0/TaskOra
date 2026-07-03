import {
    User,
    Calendar,
    CheckCircle2,
    XCircle,
    Clock3,
    AlertCircle,
    Send,
} from "lucide-react"

export default function ReviewPanel({
    submission,
    feedback,
    setFeedback,
    saving,
    onApprove,
    onReject,
}) {

    if (!submission) {
        return (
            <div
                style={{
                    position: "relative",
                    width: 360,
                    height: "100%",
                    minHeight: "100%",
                    boxSizing: "border-box",
                    borderLeft: "1px solid #ece7df",
                    display: "flex",
                    justifyContent: "center",
                    alignItems: "center",
                    color: "#888",
                    background: "#fff",
                }}
            >
                Select a submission
            </div>
        )
    }

    // Consistent Status Mapping Logic
    const statusInfo = (() => {
        if (!submission.submitted_at || submission.status === "pending" || submission.status === "assigned") {
            return {
                label: "Not Submitted",
                color: "#72716e",
                bg: "#f4f3f0",
                icon: <AlertCircle size={16} />,
            }
        }

        switch (submission.status) {
            case "completed":
                return {
                    label: "Approved",
                    color: "#198754",
                    bg: "#e8f8ef",
                    icon: <CheckCircle2 size={16} />,
                }

            case "rejected":
                return {
                    label: "Rejected",
                    color: "#d33b3b",
                    bg: "#fdeaea",
                    icon: <XCircle size={16} />,
                }

            case "submitted":
            default:
                return {
                    label: "Awaiting Review",
                    color: "#ad7a00",
                    bg: "#fff6df",
                    icon: <Clock3 size={16} />,
                }
        }
    })()

    // Consistent Student Name Formatting Logic
    const rawUsername = submission.student_username || "";
    const formattedName = rawUsername
        ? rawUsername
            .replace(/\.\d+$/, "") 
            .split(".")            
            .map(word => word.charAt(0).toUpperCase() + word.slice(1)) 
            .join(" ")             
        : "";

    const studentDisplayName = 
        (submission.student_name && submission.student_name.trim() !== "") ? submission.student_name :
        formattedName ? formattedName :
        rawUsername ? rawUsername :
        `Student #${submission.student || submission.id}`;

    const isPendingReview = submission.status === "submitted" && submission.submitted_at;

    return (
        <div
            style={{
                width: 360,
                minWidth: 360,
                maxWidth: 360,
                // These rules prevent parent layout stretching from breaking the boundaries
                height: "100%",
                position: "relative",
                display: "flex",
                flexDirection: "column",
                borderLeft: "1px solid #ece7df",
                background: "#fff",
                boxSizing: "border-box",
                overflow: "hidden", 
            }}
        >
            {/* Inner Wrapper absolute-anchored to isolate from leaking container height */}
            <div
                style={{
                    position: "absolute",
                    top: 0,
                    bottom: 0,
                    left: 0,
                    right: 0,
                    display: "flex",
                    flexDirection: "column",
                    boxSizing: "border-box",
                }}
            >
                {/* ======================================== */}
                {/* Student Information Section (Fixed Top) */}
                {/* ======================================== */}
                <div
                    style={{
                        padding: 24,
                        borderBottom: "1px solid #ece7df",
                        boxSizing: "border-box",
                        flexShrink: 0, 
                    }}
                >
                    <div
                        style={{
                            width: 64,
                            height: 64,
                            borderRadius: "50%",
                            background: "#edf3ff",
                            display: "flex",
                            justifyContent: "center",
                            alignItems: "center",
                            marginBottom: 14,
                        }}
                    >
                        <User size={30} color="#3b6fd4" />
                    </div>

                    <h2
                        style={{
                            margin: 0,
                            color: "#1a1f35",
                            fontSize: 20,
                            lineHeight: 1.3,
                            wordBreak: "break-word",
                        }}
                    >
                        {studentDisplayName}
                    </h2>

                    <div
                        style={{
                            marginTop: 12,
                            display: "inline-flex",
                            alignItems: "center",
                            gap: 6,
                            padding: "6px 12px",
                            borderRadius: 999,
                            background: statusInfo.bg,
                            color: statusInfo.color,
                            fontWeight: 700,
                            fontSize: 12,
                        }}
                    >
                        {statusInfo.icon}
                        {statusInfo.label}
                    </div>

                    <div
                        style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 8,
                            marginTop: 14,
                            color: "#666",
                            fontSize: 12,
                        }}
                    >
                        <Calendar size={14} />
                        {submission.submitted_at
                            ? new Date(submission.submitted_at).toLocaleString()
                            : "Not submitted yet"}
                    </div>
                </div>

                {/* ======================================== */}
                {/* Feedback Section (Scrolls Internally) */}
                {/* ======================================== */}
                <div
                    style={{
                        flex: 1,
                        overflowY: "auto", 
                        padding: 24,
                        boxSizing: "border-box",
                    }}
                >
                    <h3 style={{ marginTop: 0, marginBottom: 10, fontSize: 16, color: "#1a1f35" }}>
                        Teacher Feedback
                    </h3>

                    <textarea
                        value={feedback}
                        onChange={(e) => setFeedback(e.target.value)}
                        placeholder="Write feedback for the student..."
                        rows={6} // Set small base rows; auto-overflow will handle text expansion safely
                        disabled={!isPendingReview}
                        style={{
                            width: "100%",
                            maxWidth: "100%",
                            resize: "none", // Prevent manual dragging from exploding the layout
                            padding: 12,
                            borderRadius: 10,
                            border: "1px solid #ddd",
                            fontSize: 14,
                            lineHeight: 1.5,
                            boxSizing: "border-box",
                            fontFamily: "inherit",
                            background: !isPendingReview ? "#f9f9f9" : "#fff",
                        }}
                    />

                    <div
                        style={{
                            marginTop: 8,
                            fontSize: 12,
                            color: "#888",
                            wordBreak: "break-word",
                        }}
                    >
                        Your feedback will be visible to the student after review.
                    </div>
                </div>

                {/* ======================================== */}
                {/* Footer Action Buttons (Anchored to Floor) */}
                {/* ======================================== */}
                {isPendingReview ? (
                    <div
                        style={{
                            padding: 20,
                            borderTop: "1px solid #ece7df",
                            display: "flex",
                            gap: 10,
                            boxSizing: "border-box",
                            flexShrink: 0, 
                            background: "#fff",
                        }}
                    >
                        <button
                            onClick={onReject}
                            disabled={saving}
                            style={{
                                flex: 1,
                                background: "#fdeaea",
                                color: "#d33b3b",
                                border: "none",
                                borderRadius: 10,
                                padding: "12px",
                                fontWeight: 700,
                                cursor: "pointer",
                                fontSize: 14,
                            }}
                        >
                            Reject
                        </button>

                        <button
                            onClick={onApprove}
                            disabled={saving}
                            style={{
                                flex: 1,
                                background: "#198754",
                                color: "#fff",
                                border: "none",
                                borderRadius: 10,
                                padding: "12px",
                                fontWeight: 700,
                                cursor: "pointer",
                                display: "flex",
                                justifyContent: "center",
                                alignItems: "center",
                                gap: 8,
                                fontSize: 14,
                            }}
                        >
                            <Send size={14} />
                            {saving ? "Saving..." : "Approve"}
                        </button>
                    </div>
                ) : (
                    <div
                        style={{
                            padding: 18,
                            borderTop: "1px solid #ece7df",
                            textAlign: "center",
                            color: "#777",
                            fontSize: 13,
                            boxSizing: "border-box",
                            flexShrink: 0,
                            background: "#fff",
                        }}
                    >
                        {!submission.submitted_at 
                            ? "This assignment has not been submitted yet." 
                            : "This submission has already been reviewed."
                        }
                    </div>
                )}
            </div>
        </div>
    )
}