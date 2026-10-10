import React, { useEffect, useRef, useState } from "react";
import jsQR from "jsqr";
import { api } from "../api.js";

/** Core camera + manual-entry UI for confirming a pickup by QR code. Reused by the in-page modal and the standalone scan window. */
export default function ScanTicketPanel({ user, onCancel, onCompleted }) {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);
  const frameRef = useRef(null);
  const [cameraError, setCameraError] = useState("");
  const [manualCode, setManualCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const complete = async (qrCode) => {
    if (!qrCode || busy) return;
    setBusy(true);
    setError("");
    try {
      const { ticket, item } = await api.post("/tickets/scan", { qrCode, donorId: user.id });
      stopCamera();
      onCompleted(ticket, item);
    } catch (e) {
      setError(e.message || "Could not verify this QR code.");
      setBusy(false);
    }
  };

  const stopCamera = () => {
    if (frameRef.current) cancelAnimationFrame(frameRef.current);
    if (streamRef.current) streamRef.current.getTracks().forEach((t) => t.stop());
  };

  useEffect(() => {
    let active = true;

    const tick = () => {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      if (video && canvas && video.readyState === video.HAVE_ENOUGH_DATA) {
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        const ctx = canvas.getContext("2d");
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const code = jsQR(imageData.data, imageData.width, imageData.height);
        if (code && code.data) {
          complete(code.data);
          return;
        }
      }
      if (active) frameRef.current = requestAnimationFrame(tick);
    };

    const startCamera = async () => {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        setCameraError("Camera not available in this browser — enter the pickup code manually below.");
        return;
      }
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });
        if (!active) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
        }
        frameRef.current = requestAnimationFrame(tick);
      } catch (e) {
        setCameraError("Camera unavailable — enter the pickup code manually below.");
      }
    };

    startCamera();

    return () => {
      active = false;
      stopCamera();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <>
      <div className="scan-video-wrap">
        <video ref={videoRef} muted playsInline />
        <div className="scan-video-frame" />
      </div>
      <canvas ref={canvasRef} style={{ display: "none" }} />
      {cameraError && <p style={{ color: "var(--text-light)", fontSize: 12.5 }}>{cameraError}</p>}

      <div className="scan-divider">or enter code manually</div>
      <p style={{ fontSize: 11.5, color: "var(--text-light)", marginTop: -6, marginBottom: 8 }}>
        Enter the Ticket ID shown on the beneficiary's screen (e.g. t-3cb084a2).
      </p>

      <div style={{ display: "flex", gap: 8 }}>
        <input
          className="auth-input"
          placeholder="e.g. t-3cb084a2"
          value={manualCode}
          onChange={(e) => setManualCode(e.target.value)}
        />
        <button className="btn btn-primary btn-sm" disabled={busy} onClick={() => complete(manualCode.trim())}>
          Complete
        </button>
      </div>

      {error && <p style={{ color: "var(--danger)", fontSize: 13, marginTop: 10 }}>{error}</p>}

      {onCancel && (
        <button type="button" className="btn btn-outline" style={{ width: "100%", marginTop: 14 }} onClick={onCancel}>
          Cancel
        </button>
      )}
    </>
  );
}
