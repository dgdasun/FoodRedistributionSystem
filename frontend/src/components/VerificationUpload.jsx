import React, { useState } from "react";
import { AlertCircle, ArrowRight, CloudUpload, Loader2, ShieldAlert, ShieldCheck, Trash2, Upload } from "lucide-react";
import { useAuth } from "../AuthContext.jsx";
import { useToast } from "./Toast.jsx";
import { api } from "../api.js";
import { Dropzone, FieldError, FileChip, formatSize, validateDocumentFile } from "./BeneficiaryVerificationUpload.jsx";
import "../styles/beneficiary-verification.css";

/**
 * Lets an unverified donor or farm account upload proof-of-organization
 * documents for admin review. Shares the beneficiary card's look (bv-* styles).
 * On the dashboard it renders its own pending / rejected status header;
 * `embedded` drops that header and the card chrome for Profile, which already
 * shows the status.
 */
export default function VerificationUpload({ user, embedded = false }) {
  const { login } = useAuth();
  const toast = useToast();
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [removing, setRemoving] = useState(null);
  const [error, setError] = useState("");
  const documents = user.verificationDocuments || [];
  const rejected = user.verificationStatus === "rejected";
  const busy = uploading || removing !== null;

  const choose = (picked) => {
    if (!picked) return;
    const problem = validateDocumentFile(picked);
    setError(problem);
    setFile(problem ? null : picked);
  };

  const upload = async () => {
    if (!file) return;
    setUploading(true);
    setError("");
    try {
      const formData = new FormData();
      formData.append("file", file);
      const { user: updated } = await api.upload(`/beneficiaries/${user.id}/documents`, formData);
      login(updated);
      toast.success(`${file.name} sent for review.`);
      setFile(null);
    } catch (e) {
      setError(e.message || "Failed to upload document.");
    } finally {
      setUploading(false);
    }
  };

  const removeDocument = async (doc, name) => {
    setRemoving(doc);
    setError("");
    try {
      const { user: updated } = await api.del(`/beneficiaries/${user.id}/documents/${encodeURIComponent(doc)}`);
      login(updated);
      toast.success(`${name} removed.`);
    } catch (e) {
      setError(e.message || "Failed to remove document.");
    } finally {
      setRemoving(null);
    }
  };

  const pendingText =
    user.role === "donor"
      ? "An administrator is reviewing your organization. You can keep donating while you wait, but verified donors are shown as trusted partners to beneficiaries and admins."
      : "An administrator is reviewing your organization. You can browse available food, but you'll need to be verified before you can request or receive it.";

  return (
    <section className={`bv-card${embedded ? " bv-card--embedded" : ""}`} aria-labelledby={embedded ? undefined : "vu-title"}>
      {!embedded && (
        <header className={`bv-hero${rejected ? " bv-hero--rejected" : ""}`}>
          <span className="bv-hero-icon" aria-hidden="true">
            {rejected ? <ShieldAlert size={24} /> : <ShieldCheck size={24} />}
          </span>
          <div className="bv-hero-body">
            <span className={`bv-badge${rejected ? " bv-badge--rejected" : ""}`}>
              {rejected ? <AlertCircle size={14} aria-hidden="true" /> : <span className="bv-badge-dot" aria-hidden="true" />}
              {rejected ? "Verification Rejected" : "Verification Pending"}
            </span>
            <h3 id="vu-title" className="bv-title">Verify your organization</h3>
            <p className="bv-subtitle">
              {rejected
                ? user.rejectionReason
                  ? `Reason: ${user.rejectionReason}. Please upload a corrected document to request another review.`
                  : "Please upload a corrected document to request another review."
                : pendingText}
            </p>
          </div>
        </header>
      )}

      {documents.length > 0 && (
        <>
          <p className="bv-docs-title">Documents on record</p>
          <ul className="bv-docs">
            {documents.map((doc) => {
              const name = doc.replace(/^\d+-/, "");
              return (
                <FileChip
                  key={doc}
                  name={name}
                  href={`/api/beneficiaries/${user.id}/documents/${doc}`}
                  meta="Sent for review"
                  metaOk
                  onRemove={() => removeDocument(doc, name)}
                  removeDisabled={busy}
                  removeLabel={`Delete ${name}`}
                  removeTitle="Remove this document so you can upload the correct one"
                  removing={removing === doc}
                  RemoveIcon={Trash2}
                />
              );
            })}
          </ul>
        </>
      )}

      <div className="bv-step">
        <div className="bv-step-head">
          <span className="bv-step-num">{documents.length ? "+" : "1"}</span>
          <span className="bv-step-title">{documents.length ? "Add another document" : "Upload proof of your organization"}</span>
        </div>
        <p className="bv-step-help">A registration certificate, business license or similar document speeds up admin review.</p>

        <div className="bv-field" style={{ maxWidth: "none" }}>
          {file ? (
            <ul className="bv-files" style={{ maxWidth: "none" }}>
              <FileChip
                name={file.name}
                meta={formatSize(file.size)}
                ready
                onRemove={() => setFile(null)}
                removeDisabled={uploading}
                removeLabel={`Remove ${file.name}`}
              />
            </ul>
          ) : (
            <Dropzone compact onFiles={(files) => choose(files?.[0])} invalid={!!error} disabled={busy}>
              <span className="bv-drop-icon" aria-hidden="true"><CloudUpload size={18} /></span>
              <span>
                <span className="bv-drop-main" style={{ display: "block" }}><em>Click to upload</em> or drag and drop</span>
                <span className="bv-drop-hint">PDF, JPG or PNG · max 10 MB</span>
              </span>
            </Dropzone>
          )}
        </div>
      </div>

      {file && (
        <div className="bv-actions">
          <button type="button" className="bv-submit" onClick={upload} disabled={busy} aria-busy={uploading}>
            {uploading ? <Loader2 size={18} className="bv-spin" aria-hidden="true" /> : <Upload size={18} aria-hidden="true" />}
            <span>{uploading ? "Uploading…" : "Submit for Verification"}</span>
            {!uploading && <ArrowRight size={18} className="bv-submit-arrow" aria-hidden="true" />}
          </button>
        </div>
      )}
      {error && <FieldError>{error}</FieldError>}
    </section>
  );
}
