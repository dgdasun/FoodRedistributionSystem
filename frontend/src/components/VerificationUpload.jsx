import React, { useRef, useState } from "react";
import { Trash2 } from "lucide-react";
import { useAuth } from "../AuthContext.jsx";
import { api } from "../api.js";
import { IconUpload } from "./Icons.jsx";

/** Lets an unverified donor/beneficiary/farm account upload proof-of-organization documents for admin review. */
export default function VerificationUpload({ user }) {
  const { login } = useAuth();
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [removing, setRemoving] = useState(null);
  const [error, setError] = useState("");
  const inputRef = useRef(null);
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
      clearFile();
    } catch (e) {
      setError(e.message || "Failed to upload document.");
    } finally {
      setUploading(false);
    }
  };

  // Also resets the native input, so re-picking the same file still fires onChange.
  const clearFile = () => {
    setFile(null);
    if (inputRef.current) inputRef.current.value = "";
  };

  const removeDocument = async (doc) => {
    setRemoving(doc);
    setError("");
    try {
      const { user: updated } = await api.del(`/beneficiaries/${user.id}/documents/${encodeURIComponent(doc)}`);
      login(updated);
    } catch (e) {
      setError(e.message || "Failed to remove document.");
    } finally {
      setRemoving(null);
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
              <button
                type="button"
                className="btn btn-danger-outline btn-sm"
                onClick={() => removeDocument(doc)}
                disabled={removing !== null}
                title="Remove this document so you can upload the correct one"
                style={{ display: "inline-flex", alignItems: "center", gap: 4, padding: "2px 8px", fontSize: 11.5 }}
              >
                <Trash2 size={12} aria-hidden="true" />
                {removing === doc ? "Removing..." : "Delete"}
              </button>
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
            ref={inputRef}
            type="file"
            onChange={(e) => setFile(e.target.files?.[0] || null)}
            style={{ position: "absolute", width: 1, height: 1, opacity: 0, pointerEvents: "none" }}
          />
        </label>
        {file && (
          <button
            type="button"
            className="btn btn-outline btn-sm"
            onClick={clearFile}
            disabled={uploading}
            title="Clear the selected file"
            style={{ display: "inline-flex", alignItems: "center", gap: 6 }}
          >
            <Trash2 size={14} aria-hidden="true" />
            Remove
          </button>
        )}
        <button type="button" className="btn btn-primary btn-sm" onClick={upload} disabled={!file || uploading}>
          {uploading ? "Uploading..." : "Upload Document"}
        </button>
      </div>
      {error && <div style={{ color: "var(--danger)", fontSize: 12, marginTop: 6 }}>{error}</div>}
    </div>
  );
}
