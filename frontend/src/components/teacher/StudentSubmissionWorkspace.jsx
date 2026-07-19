import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom"; // 1. Import createPortal
import tasksService from "../../services/tasks.service";
import StudentList from "./StudentList";
import SubmissionViewer from "./SubmissionViewer";
import ReviewPanel from "./ReviewPanel";
import { X } from "lucide-react";
import { useToast } from "../../context/ToastContext";
import { apiError } from "../../utils/helpers";

export default function StudentSubmissionWorkspace({ assignment, onClose }) {
  const toast = useToast();
  const [loading, setLoading] = useState(true);
  const [submissions, setSubmissions] = useState([]);
  const [selected, setSelected] = useState(null);
  const [feedback, setFeedback] = useState("");
  const [saving, setSaving] = useState(false);

  async function load() {
    try {
      setLoading(true);
      const data = await tasksService.getSubmissions(assignment.id);
      const list = Array.isArray(data) ? data : [];
      setSubmissions(list);
      if (list.length) {
        setSelected(list[0]); // feedback is synced by the effect below
      }
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, [assignment.id]);

  useEffect(() => {
    if (!selected) return;
    setFeedback(selected.teacher_feedback || "");
  }, [selected]);

  async function review(action) {
    if (!selected) return;
    try {
      setSaving(true);
      const updated = await tasksService.reviewSubmission(
        selected.id,
        action,
        feedback
      );
      setSubmissions((prev) =>
        prev.map((s) => (s.id === updated.id ? updated : s))
      );
      setSelected(updated);
      toast.success(
        action === "approve" ? "Submission approved." : "Submission rejected."
      );
    } catch (err) {
      toast.error(apiError(err));
    } finally {
      setSaving(false);
    }
  }

  const stats = useMemo(() => {
    return {
      total: submissions.length,
      submitted: submissions.filter((s) => s.status === "submitted").length,
      completed: submissions.filter((s) => s.status === "completed").length,
      rejected: submissions.filter((s) => s.status === "rejected").length,
    };
  }, [submissions]);

  // 2. Wrap the layout in createPortal to append it straight to document.body
  return createPortal(
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        width: "100vw",
        height: "100vh",
        zIndex: 2147483647, // Absolute maximum allowed 32-bit integer z-index value
        background: "rgba(0,0,0,.6)",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        padding: "clamp(10px, 3vw, 24px)",
        boxSizing: "border-box",
      }}
    >
      <style>{`
        @media (max-width: 900px) {
          .workspace-grid {
            grid-template-columns: 1fr !important;
            grid-template-rows: 180px 1fr 200px !important;
          }
        }
        @media (max-width: 500px) {
          .workspace-grid {
            grid-template-rows: 140px 1fr 180px !important;
          }
        }
      `}</style>

      <div
        style={{
          width: "100%",
          maxWidth: "1400px",
          height: "100%",
          maxHeight: "92vh",
          background: "#fff",
          borderRadius: 18,
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
          boxShadow: "0 30px 80px rgba(0,0,0,.4)",
          boxSizing: "border-box",
        }}
      >
        {/* Header */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: 12,
            padding: "16px 20px",
            borderBottom: "1px solid #ece7df",
            flexShrink: 0,
          }}
        >
          <div style={{ minWidth: 0, flex: 1 }}>
            <h2
              style={{
                margin: 0,
                color: "#1a1f35",
                fontSize: "clamp(1.1rem, 2vw, 1.5rem)",
                lineHeight: 1.25,
                overflowWrap: "break-word",
              }}
            >
              {assignment.title}
            </h2>
            <p
              style={{
                marginTop: 5,
                marginBottom: 0,
                color: "#777",
                fontSize: "clamp(0.75rem, 1.2vw, 0.875rem)",
              }}
            >
              {stats.total} total · {stats.submitted} awaiting review ·{" "}
              {stats.completed} approved · {stats.rejected} rejected
            </p>
          </div>
          <button
            onClick={onClose}
            style={{
              border: "none",
              background: "none",
              cursor: "pointer",
              flexShrink: 0,
              padding: 6,
            }}
          >
            <X size={24} />
          </button>
        </div>

        {/* Workspace Grid */}
        <div
          className="workspace-grid"
          style={{
            flex: 1,
            display: "grid",
            gridTemplateColumns: "clamp(220px, 22%, 290px) minmax(0, 1fr) clamp(260px, 26%, 330px)",
            overflow: "hidden",
          }}
        >
          <StudentList
            loading={loading}
            submissions={submissions}
            selected={selected}
            onSelect={setSelected}
          />
          <SubmissionViewer submission={selected} />
          <ReviewPanel
            submission={selected}
            feedback={feedback}
            setFeedback={setFeedback}
            saving={saving}
            onApprove={() => review("approve")}
            onReject={() => review("reject")}
          />
        </div>
      </div>
    </div>,
    document.body // 3. Target root body
  );
}