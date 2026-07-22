// Renders a student's submitted file inline where possible (PDF, image),
// with a download/open fallback for formats browsers can't preview (Word
// docs, anything else), or the written response text if no file was submitted.

import {
    FileText,
    Image as ImageIcon,
    File,
    Download,
} from "lucide-react"

export default function SubmissionViewer({ submission }) {

    if (!submission) {
        return (
            <div
                style={{
                    display: "flex",
                    justifyContent: "center",
                    alignItems: "center",
                    background: "#fafafa",
                    color: "#888",
                    fontSize: 18,
                }}
            >
                Select a submission
            </div>
        )
    }

    const file = submission.submission_file || ""

    const ext = file
        ? file.split(".").pop().toLowerCase()
        : ""

    const isPDF = ext === "pdf"

    const isImage = [
        "png",
        "jpg",
        "jpeg",
        "gif",
        "bmp",
        "webp",
        "svg",
    ].includes(ext)

    const isWord = [
        "doc",
        "docx",
    ].includes(ext)

    return (
        <div
            style={{
                display: "flex",
                flexDirection: "column",
                overflow: "hidden",
                background: "#f6f7fb",
            }}
        >
            {/* Top bar */}
            <div
                style={{
                    height: 64,
                    padding: "0 22px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    borderBottom: "1px solid #ece7df",
                    background: "#fff",
                }}
            >
                <div>
                    <div
                        style={{
                            fontWeight: 700,
                            color: "#1a1f35",
                        }}
                    >
                        Student Submission
                    </div>

                    <div
                        style={{
                            fontSize: 12,
                            color: "#777",
                            marginTop: 3,
                        }}
                    >
                        {submission.file_name ||
                            file.split("/").pop() ||
                            "Text Submission"}
                    </div>
                </div>

                {file && (
                    <a
                        href={file}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 8,
                            textDecoration: "none",
                            background: "#3b6fd4",
                            color: "#fff",
                            padding: "9px 16px",
                            borderRadius: 8,
                            fontSize: 13,
                            fontWeight: 600,
                        }}
                    >
                        <Download size={16} />
                        Open
                    </a>
                )}
            </div>

            {/* Preview */}
            <div
                style={{
                    flex: 1,
                    overflow: "auto",
                    display: "flex",
                    justifyContent: "center",
                    alignItems: "center",
                    padding: 24,
                }}
            >
                {isPDF && (
                    <iframe
                        title="submission"
                        src={file}
                        style={{
                            width: "100%",
                            height: "100%",
                            border: "none",
                            background: "#fff",
                            borderRadius: 12,
                            boxShadow: "0 5px 20px rgba(0,0,0,.08)",
                        }}
                    />
                )}

                {isImage && (
                    <img
                        src={file}
                        alt="Submission"
                        style={{
                            maxWidth: "100%",
                            maxHeight: "100%",
                            borderRadius: 12,
                            boxShadow: "0 5px 20px rgba(0,0,0,.15)",
                        }}
                    />
                )}

                {isWord && (
                    <div
                        style={{
                            width: 500,
                            background: "#fff",
                            borderRadius: 16,
                            padding: 40,
                            textAlign: "center",
                            boxShadow: "0 8px 25px rgba(0,0,0,.08)",
                        }}
                    >
                        <FileText size={60} color="#3b6fd4" />
                        <h2
                            style={{
                                marginTop: 20,
                                color: "#1a1f35",
                            }}
                        >
                            Microsoft Word Document
                        </h2>
                        <p
                            style={{
                                color: "#777",
                                marginTop: 12,
                                lineHeight: 1.6,
                            }}
                        >
                            Browsers cannot preview DOC/DOCX
                            files directly.
                        </p>
                        <a
                            href={file}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{
                                marginTop: 25,
                                display: "inline-flex",
                                padding: "11px 20px",
                                borderRadius: 10,
                                background: "#3b6fd4",
                                color: "#fff",
                                textDecoration: "none",
                                fontWeight: 600,
                            }}
                        >
                            Open Document
                        </a>
                    </div>
                )}

                {!isPDF && !isImage && !isWord && file && (
                    <div
                        style={{
                            width: 450,
                            background: "#fff",
                            borderRadius: 16,
                            padding: 40,
                            textAlign: "center",
                            boxShadow: "0 8px 25px rgba(0,0,0,.08)",
                        }}
                    >
                        <File size={58} color="#999" />
                        <h2
                            style={{
                                marginTop: 20,
                            }}
                        >
                            Preview unavailable
                        </h2>
                        <p
                            style={{
                                color: "#777",
                            }}
                        >
                            This file type cannot be
                            previewed in the browser.
                        </p>
                        <a
                            href={file}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{
                                marginTop: 24,
                                display: "inline-flex",
                                padding: "11px 20px",
                                borderRadius: 10,
                                background: "#3b6fd4",
                                color: "#fff",
                                textDecoration: "none",
                                fontWeight: 600,
                            }}
                        >
                            Download File
                        </a>
                    </div>
                )}

                {!file && (
                    <div
                        style={{
                            width: "100%",
                            maxWidth: 900,
                            background: "#fff",
                            borderRadius: 16,
                            padding: 35,
                            boxShadow: "0 8px 25px rgba(0,0,0,.08)",
                        }}
                    >
                        <div
                            style={{
                                display: "flex",
                                alignItems: "center",
                                gap: 10,
                            }}
                        >
                            <ImageIcon size={24} color="#3b6fd4" />
                            <h2
                                style={{
                                    margin: 0,
                                    color: "#1a1f35",
                                }}
                            >
                                Written Response
                            </h2>
                        </div>

                        <div
                            style={{
                                marginTop: 24,
                                fontSize: 15,
                                color: "#444",
                                lineHeight: 1.8,
                                whiteSpace: "pre-wrap",
                            }}
                        >
                            {submission.submission_text ||
                                "No written response."}
                        </div>
                    </div>
                )}
            </div>
        </div>
    )
}