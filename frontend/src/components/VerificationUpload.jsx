import React, { useState } from "react";
import { useAuth } from "../AuthContext.jsx";
import { api } from "../api.js";
import { IconUpload } from "./Icons.jsx";

/** Lets an unverified donor/beneficiary/farm account upload proof-of-organization documents for admin review. */
export default function VerificationUpload({ user }) {
  const { login } = useAuth();
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const documents = user.verificationDocuments || [];

  const upload = async () => {
    if (!file) return;
    setUploading(true);
    setError("");
    try {
      const formData = new FormData();
      formData.append("file", file);
      const { user: updated } = await api.upload(`/beneficiaries/${user.id}/documents`, formData);
      login(updated);
      setFile(null);
    } catch (e) {
      setError(e.message || "Failed to upload document.");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div style={{ marginTop: 12, paddingTop: 12, borderTop: "1px dashed var(--status-warn-border)" }}>
      <strong style={{ display: "block", fontSize: 12.5, color: "var(--status-warn-fg)", marginBottom: 6 }}>
        Verify your organization
      </strong>
      <p style={{ margin: "0 0 10px", fontSize: 12, color: "var(--status-warn-fg)" }}>
        Upload a registration certificate, license, or other proof of your organization to speed up admin review.
      </p>

      {documents.length > 0 && (
        <ul style={{ listStyle: "none", padding: 0, margin: "0 0 10px", display: "flex", flexDirection: "column", gap: 4 }}>
          {documents.map((doc) => (
            <li key={doc} style={{ fontSize: 12.5, color: "var(--status-ok-fg)", display: "flex", alignItems: "center", gap: 6 }}>
              <span>✅</span>
              <a
                href={`/api/beneficiaries/${user.id}/documents/${doc}`}
                target="_blank"
                rel="noreferrer"
                style={{ color: "var(--status-ok-fg)", wordBreak: "break-all" }}
              >
                {doc.replace(/^\d+-/, "")}
              </a>
            </li>
          ))}
        </ul>
      )}

      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
        <label
          className="btn btn-outline btn-sm"
          style={{ cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 6, maxWidth: 260, overflow: "hidden" }}
        >
          <IconUpload size={14} />
          <span style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
            {file ? file.name : "Choose file..."}
          </span>
          <input
            type="file"
            onChange={(e) => setFile(e.target.files?.[0] || null)}
            style={{ position: "absolute", width: 1, height: 1, opacity: 0, pointerEvents: "none" }}
          />
        </label>
        <button type="button" className="btn btn-primary btn-sm" onClick={upload} disabled={!file || uploading}>
          {uploading ? "Uploading..." : "Upload Document"}
        </button>
      </div>
      {error && <div style={{ color: "var(--danger)", fontSize: 12, marginTop: 6 }}>{error}</div>}
    </div>
  );
}
