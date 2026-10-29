import React, { useState } from "react";
import {
  AlertCircle,
  ArrowRight,
  CircleCheck,
  CloudUpload,
  FileText,
  Image as ImageIcon,
  Info,
  Loader2,
  Paperclip,
  RefreshCw,
  ShieldAlert,
  ShieldCheck,
  Trash2,
  Upload,
  X,
} from "lucide-react";
import { useAuth } from "../AuthContext.jsx";
import { useToast } from "./Toast.jsx";
import { api } from "../api.js";
import "../styles/beneficiary-verification.css";

// Kept in sync with PRIMARY_DOCUMENT_TYPES in backend RegisterRequestDTO.java.
export const PRIMARY_DOCUMENT_TYPES = [
  "Official Registration Certificate (BR / NGO)",
  "Grama Niladhari / Local Authority Endorsement Letter",
  "Past 3 Months Bank Statement / Financial Summary",
  "Organization Head's NIC + Signed Affidavit",
];

const DOCUMENT_ACCEPT = ".pdf,.jpg,.jpeg,.png";
// Matches spring.servlet.multipart.max-file-size on the backend.
const MAX_DOCUMENT_BYTES = 10 * 1024 * 1024;

export function validateDocumentFile(file) {
  if (!/\.(pdf|jpe?g|png)$/i.test(file.name)) return `${file.name}: only PDF, JPG or PNG files are accepted.`;
  if (file.size > MAX_DOCUMENT_BYTES) return `${file.name}: file must be 10 MB or smaller.`;
  return "";
}

export function formatSize(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function FileTypeIcon({ name }) {
  const ext = (name.match(/\.(\w+)$/)?.[1] || "").toUpperCase().replace("JPEG", "JPG");
  const image = ext === "JPG" || ext === "PNG";
  return (
    <span className={`bv-chip-icon${image ? " bv-chip-icon--image" : ""}`} aria-hidden="true">
      {image ? <ImageIcon size={15} /> : <FileText size={15} />}
      {ext && <span className="bv-chip-ext">{ext}</span>}
    </span>
  );
}

export function FieldError({ children }) {
  return (
    <div className="bv-error" role="alert">
      <AlertCircle size={14} aria-hidden="true" />
      <span>{children}</span>
    </div>
  );
}

/** A file-picker label that also accepts files dropped onto it. */
export function Dropzone({ multiple = false, compact = false, invalid, disabled, onFiles, children }) {
  const [dragging, setDragging] = useState(false);
  const className = ["bv-drop", compact && "bv-drop--compact", dragging && "is-dragging", invalid && "is-invalid"]
    .filter(Boolean)
    .join(" ");

  return (
    <label
      className={className}
      onDragOver={(e) => {
        e.preventDefault();
        if (!disabled) setDragging(true);
      }}
      onDragLeave={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget)) setDragging(false);
      }}
      onDrop={(e) => {
        e.preventDefault();
        setDragging(false);
        if (!disabled) onFiles(e.dataTransfer.files);
      }}
    >
      {children}
      <input
        type="file"
        accept={DOCUMENT_ACCEPT}
        multiple={multiple}
        disabled={disabled}
        onChange={(e) => {
          onFiles(e.target.files);
          e.target.value = "";
        }}
        className="bv-hidden-input"
      />
    </label>
  );
}

export function FileChip({ name, meta, metaOk, metaTitle, ready, href, action, onRemove, removeDisabled, removeLabel, removeTitle, removing, RemoveIcon = X }) {
  return (
    <li className="bv-chip">
      <FileTypeIcon name={name} />
      {href ? (
        <a className="bv-chip-name" href={href} target="_blank" rel="noreferrer" title={name}>{name}</a>
      ) : (
        <span className="bv-chip-name" title={name}>{name}</span>
      )}
      {ready && (
        <span className="bv-chip-ready" title="Ready to submit">
          <CircleCheck size={15} aria-hidden="true" />
          <span className="bv-sr-only">Ready to submit</span>
        </span>
      )}
      <span className={`bv-chip-meta${metaOk ? " bv-chip-meta--ok" : ""}`} title={metaTitle}>{meta}</span>
      {action}
      <button
        type="button"
        className="bv-chip-remove"
        onClick={onRemove}
        disabled={removeDisabled}
        aria-label={removeLabel}
        title={removeTitle}
      >
        {removing ? <Loader2 size={14} className="bv-spin" /> : <RemoveIcon size={14} />}
      </button>
    </li>
  );
}

/**
 * Post-signup verification for beneficiaries: a typed, mandatory primary document
 * plus optional supporting certificates. Registration collects no documents, so
 * this is the only place a beneficiary uploads them. Renders its own status card
 * (pending or rejected) on the dashboard; `embedded` drops that header and the
 * card chrome for pages that already show the status, like Profile.
 *
 * Once a primary document is on record the upload steps are hidden and only the
 * documents on record show. Each one can be replaced in place (upload the new
 * file, then delete the old one) or deleted; deleting the primary document, or
 * every document, brings the upload steps back.
 */
export default function BeneficiaryVerificationUpload({ user, embedded = false }) {
  const { login } = useAuth();
  const toast = useToast();
  const [documentType, setDocumentType] = useState(user.primaryDocumentType || "");
  const [primaryFile, setPrimaryFile] = useState(null);
  const [supportingFiles, setSupportingFiles] = useState([]);
  const [touched, setTouched] = useState(false);
  const [fileErrors, setFileErrors] = useState({ primary: "", supporting: "" });
  const [submitting, setSubmitting] = useState(false);
  const [removing, setRemoving] = useState(null);
  const [error, setError] = useState("");
  // Inline "Replace / Update" panel for one document on record.
  const [replaceTarget, setReplaceTarget] = useState(null);
  const [replaceType, setReplaceType] = useState("");
  const [replaceFile, setReplaceFile] = useState(null);
  const [replaceError, setReplaceError] = useState("");
  const [replaceBusy, setReplaceBusy] = useState(false);

  const documents = user.verificationDocuments || [];
  const hasPrimaryOnRecord = !!user.primaryDocumentUrl;
  // Sessions saved by older builds may carry `_id` instead of `id`.
  const userId = user.id ?? user._id;
  const documentUrl = (doc) => `/api/beneficiaries/${userId}/documents/${doc}`;
  const rejected = user.verificationStatus === "rejected";
  const busy = submitting || replaceBusy || removing !== null;
  // Hidden once submitted. It stays up through an upload, and while certificates
  // that failed to send are still queued, so a partial failure can be retried.
  const showUploadForm = documents.length === 0 || !hasPrimaryOnRecord || submitting || supportingFiles.length > 0;

  // The primary document is mandatory until one is on record; after that the
  // user may send just supporting certificates, or a replacement primary.
  const typeError = !documentType && (!hasPrimaryOnRecord || primaryFile) ? "Please select a document type." : "";
  const primaryError = !primaryFile && !hasPrimaryOnRecord ? "Please upload the selected verification document." : "";
  const nothingToSend = !primaryFile && supportingFiles.length === 0;
  const showPrimaryError = touched && !fileErrors.primary && !!primaryError;

  const choosePrimary = (file) => {
    if (!file) return;
    const problem = validateDocumentFile(file);
    setFileErrors((e) => ({ ...e, primary: problem }));
    setPrimaryFile(problem ? null : file);
  };

  const addSupporting = (fileList) => {
    const files = Array.from(fileList || []);
    setFileErrors((e) => ({ ...e, supporting: files.map(validateDocumentFile).filter(Boolean).join(" ") }));
    const accepted = files.filter((f) => !validateDocumentFile(f));
    // Skip files already in the list (same name and size) when picked twice.
    setSupportingFiles((prev) => [
      ...prev,
      ...accepted.filter((f) => !prev.some((p) => p.name === f.name && p.size === f.size)),
    ]);
  };

  const removeSupporting = (index) => setSupportingFiles((prev) => prev.filter((_, i) => i !== index));

  const submit = async () => {
    setTouched(true);
    if (typeError || primaryError || nothingToSend) return;
    if (!userId) {
      setError("Your session is missing a user ID. Please sign out and sign in again.");
      return;
    }
    setSubmitting(true);
    setError("");

    const upload = async (file, category) => {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("category", category);
      if (category === "primary") formData.append("documentType", documentType);
      const { user: updated } = await api.upload(`/beneficiaries/${userId}/documents`, formData);
      // Refreshing the session user flips a rejected card back to "Verification pending".
      login(updated);
    };

    try {
      if (primaryFile) {
        await upload(primaryFile, "primary");
        setPrimaryFile(null);
      }
      // Drop each certificate from the list as it lands, so a retry after a
      // failure only resends the ones that did not make it.
      for (const file of supportingFiles) {
        await upload(file, "supporting");
        setSupportingFiles((prev) => prev.filter((f) => f !== file));
      }
      setTouched(false);
      setPrimaryFile(null);
      setSupportingFiles([]);
      setFileErrors({ primary: "", supporting: "" });
      toast.success("Documents submitted successfully! Your organization verification is under review.");
    } catch (err) {
      console.error("Verification document upload failed:", err);
      const message = err.response?.data?.message || err.message || "Failed to upload documents.";
      setError(message);
      toast.error(`Submission failed: ${message}`);
    } finally {
      setSubmitting(false);
    }
  };

  const deleteStoredDocument = async (doc) => {
    const { user: updated } = await api.del(`/beneficiaries/${userId}/documents/${encodeURIComponent(doc)}`);
    login(updated);
  };

  const removeDocument = async (doc, name) => {
    if (!window.confirm(`Delete "${name}"? This removes it from your verification documents.`)) return;
    setRemoving(doc);
    setError("");
    try {
      await deleteStoredDocument(doc);
      if (replaceTarget === doc) closeReplace();
      toast.success(`"${name}" was deleted.`);
    } catch (err) {
      console.error("Verification document removal failed:", err);
      const message = err.response?.data?.message || err.message || "Failed to remove document.";
      setError(message);
      toast.error(`Delete failed: ${message}`);
    } finally {
      setRemoving(null);
    }
  };

  const openReplace = (doc) => {
    setReplaceTarget(doc);
    setReplaceType(user.primaryDocumentType || "");
    setReplaceFile(null);
    setReplaceError("");
    setError("");
  };

  const closeReplace = () => {
    setReplaceTarget(null);
    setReplaceFile(null);
    setReplaceError("");
  };

  const chooseReplacement = (file) => {
    if (!file) return;
    const problem = validateDocumentFile(file);
    setReplaceError(problem);
    setReplaceFile(problem ? null : file);
  };

  // Uploads the new file in the old one's category, then deletes the old one.
  // Upload first, so a failure never leaves the user with neither file.
  const replaceDocument = async (doc, isPrimary) => {
    if (!replaceFile) {
      setReplaceError("Choose the new file to upload.");
      return;
    }
    if (isPrimary && !replaceType) {
      setReplaceError("Please select a document type.");
      return;
    }
    setReplaceBusy(true);
    setReplaceError("");
    try {
      const formData = new FormData();
      formData.append("file", replaceFile);
      formData.append("category", isPrimary ? "primary" : "supporting");
      if (isPrimary) formData.append("documentType", replaceType);
      const { user: updated } = await api.upload(`/beneficiaries/${userId}/documents`, formData);
      login(updated);
    } catch (err) {
      console.error("Replacement upload failed:", err);
      const message = err.response?.data?.message || err.message || "Failed to upload the new file.";
      setReplaceError(message);
      toast.error(`Update failed: ${message}`);
      setReplaceBusy(false);
      return;
    }
    try {
      await deleteStoredDocument(doc);
      toast.success("Document updated successfully! It has been sent for review.");
    } catch (err) {
      console.error("Removing the replaced document failed:", err);
      const message = err.response?.data?.message || err.message || "Failed to remove the old file.";
      setError(`The new file was uploaded, but the old one could not be removed (${message}). You can delete it from the list.`);
      toast.error("New file uploaded, but the old one could not be removed.");
    } finally {
      setReplaceBusy(false);
      closeReplace();
    }
  };

  return (
    <section className={`bv-card${embedded ? " bv-card--embedded" : ""}`} aria-labelledby={embedded ? undefined : "bv-title"}>
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
            <h3 id="bv-title" className="bv-title">Verify your organization</h3>
            <p className="bv-subtitle">
              {rejected
                ? user.rejectionReason
                  ? `Reason: ${user.rejectionReason}. Please upload a corrected document to request another review.`
                  : "Please upload a corrected document to request another review."
                : "An administrator is reviewing your organization. You can browse available food, but you'll need to be verified before you can request or receive it."}
            </p>
          </div>
        </header>
      )}

      {documents.length > 0 && (
        <>
          <p className="bv-docs-title">Documents on record</p>
          <ul className="bv-docs">
            {documents.map((doc) => {
              const isPrimary = documentUrl(doc) === user.primaryDocumentUrl;
              const name = doc.replace(/^\d+-/, "");
              const open = replaceTarget === doc;
              return (
                <React.Fragment key={doc}>
                  <FileChip
                    name={name}
                    href={documentUrl(doc)}
                    meta={isPrimary ? "Primary" : "Supporting"}
                    metaOk
                    metaTitle={isPrimary ? user.primaryDocumentType : undefined}
                    action={
                      <button
                        type="button"
                        className={`bv-chip-action${open ? " is-active" : ""}`}
                        onClick={() => (open ? closeReplace() : openReplace(doc))}
                        disabled={busy}
                        aria-expanded={open}
                        aria-controls={`bv-replace-${doc}`}
                        aria-label={`Replace or update ${name}`}
                        title="Upload a new file in place of this one"
                      >
                        <RefreshCw size={13} aria-hidden="true" />
                        <span>Replace / Update</span>
                      </button>
                    }
                    onRemove={() => removeDocument(doc, name)}
                    removeDisabled={busy}
                    removeLabel={`Delete ${name}`}
                    removeTitle="Delete this document"
                    removing={removing === doc}
                    RemoveIcon={Trash2}
                  />
                  {open && (
                    <li id={`bv-replace-${doc}`} className="bv-replace">
                      <p className="bv-replace-title">
                        Replace <strong>{name}</strong>
                        <span>{isPrimary ? "Primary document" : "Supporting certificate"}</span>
                      </p>
                      {isPrimary && (
                        <select
                          className="bv-select"
                          value={replaceType}
                          onChange={(e) => setReplaceType(e.target.value)}
                          disabled={replaceBusy}
                          aria-label="Document type"
                        >
                          <option value="">Select document type…</option>
                          {PRIMARY_DOCUMENT_TYPES.map((type) => (
                            <option key={type} value={type}>{type}</option>
                          ))}
                        </select>
                      )}
                      {replaceFile ? (
                        <ul className="bv-files">
                          <FileChip
                            name={replaceFile.name}
                            meta={formatSize(replaceFile.size)}
                            ready
                            onRemove={() => setReplaceFile(null)}
                            removeDisabled={replaceBusy}
                            removeLabel={`Remove ${replaceFile.name}`}
                          />
                        </ul>
                      ) : (
                        <Dropzone compact onFiles={(files) => chooseReplacement(files?.[0])} invalid={!!replaceError} disabled={replaceBusy}>
                          <span className="bv-drop-icon" aria-hidden="true"><CloudUpload size={16} /></span>
                          <span>
                            <span className="bv-drop-main" style={{ display: "block" }}><em>Choose the new file</em> or drop it here</span>
                            <span className="bv-drop-hint">PDF, JPG or PNG · max 10 MB</span>
                          </span>
                        </Dropzone>
                      )}
                      {replaceError && <FieldError>{replaceError}</FieldError>}
                      <div className="bv-replace-actions">
                        <button type="button" className="bv-cancel" onClick={closeReplace} disabled={replaceBusy}>Cancel</button>
                        <button
                          type="button"
                          className="bv-replace-submit"
                          onClick={() => replaceDocument(doc, isPrimary)}
                          disabled={replaceBusy || !replaceFile}
                          aria-busy={replaceBusy}
                        >
                          {replaceBusy ? <Loader2 size={15} className="bv-spin" aria-hidden="true" /> : <Upload size={15} aria-hidden="true" />}
                          <span>{replaceBusy ? "Uploading…" : "Upload replacement"}</span>
                        </button>
                      </div>
                    </li>
                  )}
                </React.Fragment>
              );
            })}
          </ul>
        </>
      )}

      {showUploadForm && (
        <>
          {/* Steps sit side by side from md up, stacked on mobile. */}
          <div className="bv-steps grid grid-cols-1 md:grid-cols-2 gap-4 items-stretch">
            <div className="bv-step">
              <div className="bv-step-head">
                <span className="bv-step-num">1</span>
                <span className="bv-step-title">
                  Primary Verification Document
                  {!hasPrimaryOnRecord && <span className="bv-required" aria-hidden="true">*</span>}
                </span>
                <span className="bv-tip" tabIndex={0} aria-label="About the primary document">
                  <Info size={14} aria-hidden="true" />
                  <span className="bv-tip-text" role="tooltip">
                    One official document proving your organization is genuine. Pick its type, then upload a clear scan or photo.
                  </span>
                </span>
              </div>
              <p className="bv-step-help">
                {hasPrimaryOnRecord
                  ? "Optional. Upload a new file only if you want to replace the one on record."
                  : "Required. Choose the document type, then upload it."}
              </p>

              <div className="bv-field">
                <label htmlFor="primary-document-type" className="bv-label">Document type</label>
                <select
                  id="primary-document-type"
                  className="bv-select"
                  value={documentType}
                  onChange={(e) => setDocumentType(e.target.value)}
                  onBlur={() => setTouched(true)}
                  aria-invalid={!!(touched && typeError)}
                  aria-required={!hasPrimaryOnRecord}
                >
                  <option value="">Select document type…</option>
                  {PRIMARY_DOCUMENT_TYPES.map((type) => (
                    <option key={type} value={type}>{type}</option>
                  ))}
                </select>
                {touched && typeError && <FieldError>{typeError}</FieldError>}

                {primaryFile ? (
                  <ul className="bv-files">
                    <FileChip
                      name={primaryFile.name}
                      meta={formatSize(primaryFile.size)}
                      ready
                      onRemove={() => setPrimaryFile(null)}
                      removeDisabled={submitting}
                      removeLabel={`Remove ${primaryFile.name}`}
                    />
                  </ul>
                ) : (
                  <Dropzone
                    onFiles={(files) => choosePrimary(files?.[0])}
                    invalid={!!fileErrors.primary || showPrimaryError}
                    disabled={submitting}
                  >
                    <span className="bv-drop-icon" aria-hidden="true"><CloudUpload size={22} /></span>
                    <span className="bv-drop-main"><em>Click to upload</em> or drag and drop</span>
                    <span className="bv-drop-hint">PDF, JPG or PNG · max 10 MB</span>
                  </Dropzone>
                )}
                {fileErrors.primary && <FieldError>{fileErrors.primary}</FieldError>}
                {showPrimaryError && <FieldError>{primaryError}</FieldError>}
              </div>
            </div>

            <div className="bv-step">
              <div className="bv-step-head">
                <span className="bv-step-num">2</span>
                <span className="bv-step-title">Additional Supporting Certificates</span>
                <span className="bv-optional">Optional</span>
              </div>
              <p className="bv-step-help">e.g. PHI certificates, prior awards or recommendation letters.</p>

              <div className="bv-field">
                <Dropzone multiple compact onFiles={addSupporting} invalid={!!fileErrors.supporting} disabled={submitting}>
                  <span className="bv-drop-icon" aria-hidden="true"><Paperclip size={16} /></span>
                  <span>
                    <span className="bv-drop-main" style={{ display: "block" }}><em>Attach files</em> or drop them here</span>
                    <span className="bv-drop-hint">PDF, JPG or PNG · max 10 MB each</span>
                  </span>
                </Dropzone>
                {fileErrors.supporting && <FieldError>{fileErrors.supporting}</FieldError>}
                {supportingFiles.length > 0 && (
                  <ul className="bv-files">
                    {supportingFiles.map((file, i) => (
                      <FileChip
                        key={`${file.name}-${file.size}`}
                        name={file.name}
                        meta={formatSize(file.size)}
                        ready
                        onRemove={() => removeSupporting(i)}
                        removeDisabled={submitting}
                        removeLabel={`Remove ${file.name}`}
                      />
                    ))}
                  </ul>
                )}
              </div>
            </div>
          </div>

          <div className="bv-actions">
            <button
              type="button"
              className="bv-submit"
              onClick={submit}
              disabled={busy || (hasPrimaryOnRecord && nothingToSend)}
              aria-busy={submitting}
            >
              {submitting ? <Loader2 size={18} className="bv-spin" aria-hidden="true" /> : <Upload size={18} aria-hidden="true" />}
              <span>{submitting ? "Uploading…" : "Submit for Verification"}</span>
              {!submitting && <ArrowRight size={18} className="bv-submit-arrow" aria-hidden="true" />}
            </button>
            {hasPrimaryOnRecord && nothingToSend && !submitting && (
              <span className="bv-actions-hint">Add a file above to send it for review.</span>
            )}
          </div>
        </>
      )}
      {error && <FieldError>{error}</FieldError>}
    </section>
  );
}
