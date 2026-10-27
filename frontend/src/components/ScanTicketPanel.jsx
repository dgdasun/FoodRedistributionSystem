import React, { useCallback, useEffect, useRef, useState } from "react";
import jsQR from "jsqr";
import { CameraOff, Keyboard, Loader2, RefreshCw, Ticket, AlertCircle, ArrowRight } from "lucide-react";
import { api } from "../api.js";

/** Core camera + manual-entry UI for confirming a pickup by QR code. Reused by the in-page modal and the standalone scan window. */
export default function ScanTicketPanel({ user, onCancel, onCompleted }) {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);
  const frameRef = useRef(null);
  const activeRef = useRef(true);
  const busyRef = useRef(false);
  // "starting" | "live" | "error"
  const [camera, setCamera] = useState("starting");
  const [cameraError, setCameraError] = useState("");
  const [manualCode, setManualCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const stopCamera = () => {
    if (frameRef.current) cancelAnimationFrame(frameRef.current);
    if (streamRef.current) streamRef.current.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  };

  const complete = async (qrCode) => {
    // A ref, not the state, guards re-entry: the camera loop calls this from a
    // stale closure and would otherwise fire twice for one code.
    if (!qrCode || busyRef.current) return;
    busyRef.current = true;
    setBusy(true);
    setError("");
    try {
      const { ticket, item } = await api.post("/tickets/scan", { qrCode, donorId: user.id });
      stopCamera();
      onCompleted(ticket, item);
    } catch (e) {
      setError(e.message || "Could not verify this QR code.");
      busyRef.current = false;
      setBusy(false);
      // Resume scanning so the donor can try the next code straight away.
      if (streamRef.current) frameRef.current = requestAnimationFrame(tick);
    }
  };

  const tick = () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (video && canvas && video.readyState === video.HAVE_ENOUGH_DATA) {
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext("2d", { willReadFrequently: true });
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const code = jsQR(imageData.data, imageData.width, imageData.height);
      if (code && code.data) {
        complete(code.data);
        return;
      }
    }
    if (activeRef.current) frameRef.current = requestAnimationFrame(tick);
  };

  const startCamera = useCallback(async () => {
    setCamera("starting");
    setCameraError("");
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setCamera("error");
      setCameraError("This browser can't use the camera. Enter the ticket ID below instead.");
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });
      if (!activeRef.current) {
        stream.getTracks().forEach((t) => t.stop());
        return;
      }
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setCamera("live");
      frameRef.current = requestAnimationFrame(tick);
    } catch (e) {
      setCamera("error");
      setCameraError(
        e?.name === "NotAllowedError"
          ? "Camera access was blocked. Allow it in the address bar, or enter the ticket ID below."
          : "No camera found. Enter the ticket ID below instead."
      );
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    activeRef.current = true;
    startCamera();
    return () => {
      activeRef.current = false;
      stopCamera();
    };
  }, [startCamera]);

  const submitManual = (e) => {
    e.preventDefault();
    complete(manualCode.trim());
  };

  return (
    <div className="sc-panel">
      <div className={`sc-viewfinder sc-cam-${camera}`}>
        <video ref={videoRef} muted playsInline />
        <canvas ref={canvasRef} hidden />

        <span className="sc-corner sc-tl" />
        <span className="sc-corner sc-tr" />
        <span className="sc-corner sc-bl" />
        <span className="sc-corner sc-br" />
        {camera === "live" && !busy && <span className="sc-laser" />}

        <div className="sc-cam-status" role="status">
          <i />
          {busy ? "Verifying ticket…" : camera === "live" ? "Looking for a QR code" : camera === "starting" ? "Starting camera…" : "Camera off"}
        </div>

        {camera === "starting" && (
          <div className="sc-cam-overlay">
            <Loader2 size={30} className="sc-spin" />
          </div>
        )}
        {camera === "error" && (
          <div className="sc-cam-overlay">
            <span className="sc-cam-off"><CameraOff size={28} /></span>
            <p>{cameraError}</p>
            <button type="button" className="sc-retry" onClick={startCamera}>
              <RefreshCw size={14} /> Try camera again
            </button>
          </div>
        )}
        {busy && (
          <div className="sc-cam-overlay sc-cam-busy">
            <Loader2 size={30} className="sc-spin" />
          </div>
        )}
      </div>

      <p className="sc-hint">Ask the collector to open <strong>My Tickets</strong> and hold the QR code inside the frame.</p>

      <div className="sc-divider"><span><Keyboard size={13} /> or enter the ticket ID</span></div>

      <form className="sc-manual" onSubmit={submitManual}>
        <label className="sc-input">
          <Ticket size={17} />
          <input
            placeholder="e.g. t-3cb084a2"
            value={manualCode}
            onChange={(e) => setManualCode(e.target.value)}
            aria-label="Ticket ID"
            autoComplete="off"
            spellCheck={false}
          />
        </label>
        <button className="btn btn-primary sc-submit" disabled={busy || !manualCode.trim()}>
          {busy ? <Loader2 size={16} className="sc-spin" /> : <>Confirm <ArrowRight size={15} /></>}
        </button>
      </form>

      {error && (
        <div className="sc-error" role="alert">
          <AlertCircle size={16} />
          <span>{error}</span>
        </div>
      )}

      {onCancel && (
        <button type="button" className="btn btn-outline sc-cancel" onClick={onCancel}>
          Cancel
        </button>
      )}
    </div>
  );
}
