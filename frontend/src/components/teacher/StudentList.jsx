import { User, CheckCircle2, Clock3, XCircle, AlertCircle } from "lucide-react"
import { fmtDateTime, formatStudentDisplayName } from "../../utils/helpers.js"

export default function StudentList({
    loading,
    submissions,
    selected,
    onSelect,
}) {

    if (loading) {
        return (
            <div
                style={{
                    borderRight: "1px solid #ece7df",
                    display: "flex",
                    justifyContent: "center",
                    alignItems: "center",
                    color: "#888",
                }}
            >
                Loading submissions...
            </div>
        )
    }

    if (!submissions.length) {
        return (
            <div
                style={{
                    borderRight: "1px solid #ece7df",
                    display: "flex",
                    justifyContent: "center",
                    alignItems: "center",
                    color: "#888",
                }}
            >
                No submissions yet.
            </div>
        )
    }

    function statusMeta(sub) {
        // If there's no submission timestamp or status matches unsubmitted flags
        if (!sub.submitted_at || sub.status === "pending" || sub.status === "assigned") {
            return {
                label: "Not Submitted",
                bg: "#f4f3f0",
                color: "#72716e",
                icon: <AlertCircle size={14} />,
            }
        }

        switch (sub.status) {
            case "completed":
                return {
                    label: "Approved",
                    bg: "#e8f8ef",
                    color: "#198754",
                    icon: <CheckCircle2 size={14} />,
                }

            case "rejected":
                return {
                    label: "Rejected",
                    bg: "#fdeaea",
                    color: "#d33b3b",
                    icon: <XCircle size={14} />,
                }

            case "submitted":
            default:
                return {
                    label: "Awaiting Review",
                    bg: "#fff6df",
                    color: "#ad7a00",
                    icon: <Clock3 size={14} />,
                }
        }
    }

    return (
        <div
            style={{
                borderRight: "1px solid #ece7df",
                display: "flex",
                flexDirection: "column",
                overflow: "hidden",
                background: "#fcfbfa",
            }}
        >
            {/* Header */}
            <div
                style={{
                    padding: "18px 18px 14px",
                    borderBottom: "1px solid #ece7df",
                }}
            >
                <h3
                    style={{
                        margin: 0,
                        color: "#1a1f35",
                        fontSize: 17,
                    }}
                >
                    Students
                </h3>

                <p
                    style={{
                        marginTop: 5,
                        marginBottom: 0,
                        color: "#888",
                        fontSize: 12,
                    }}
                >
                    Select a submission
                </p>
            </div>

            {/* Student List */}
<div
    style={{
        flex: 1,
        overflowY: "auto",
    }}
>
    {submissions.map(sub => {
        const active = selected?.id === sub.id
        const badge = statusMeta(sub)

        // Student's display name, formatted from username as fallback
        const studentDisplayName = formatStudentDisplayName(sub);
        return (
            <div
                key={sub.id}
                onClick={() => onSelect(sub)}
                style={{
                    padding: 16,
                    cursor: "pointer",
                    background: active ? "#eef4ff" : "#fff",
                    borderBottom: "1px solid #f1ece7",
                    transition: ".15s",
                }}
            >
                            <div
                                style={{
                                    display: "flex",
                                    alignItems: "center",
                                    gap: 10,
                                }}
                            >
                                {/* Avatar */}
                                <div
                                    style={{
                                        width: 42,
                                        height: 42,
                                        borderRadius: "50%",
                                        background: "#e7edf9",
                                        display: "flex",
                                        justifyContent: "center",
                                        alignItems: "center",
                                        flexShrink: 0,
                                    }}
                                >
                                    <User
                                        size={18}
                                        color="#3b6fd4"
                                    />
                                </div>

                                {/* Info */}
                                <div
                                    style={{
                                        flex: 1,
                                        minWidth: 0,
                                    }}
                                >
                                    <div
                                        style={{
                                            fontWeight: 600,
                                            color: "#1a1f35",
                                            overflow: "hidden",
                                            textOverflow: "ellipsis",
                                            whiteSpace: "nowrap",
                                        }}
                                    >
                                        {studentDisplayName}
                                    </div>

                                    <div
                                        style={{
                                            fontSize: 11,
                                            color: "#888",
                                            marginTop: 3,
                                        }}
                                    >
                                        {sub.submitted_at
                                            ? fmtDateTime(sub.submitted_at)
                                            : "Not submitted"}
                                    </div>
                                </div>
                            </div>

                            {/* Status Badge */}
                            <div
                                style={{
                                    marginTop: 10,
                                    display: "inline-flex",
                                    alignItems: "center",
                                    gap: 6,
                                    padding: "5px 10px",
                                    borderRadius: 999,
                                    background: badge.bg,
                                    color: badge.color,
                                    fontSize: 11,
                                    fontWeight: 700,
                                }}
                            >
                                {badge.icon}
                                {badge.label}
                            </div>
                        </div>
                    )
                })}
            </div>
        </div>
    )
}