import React, { useState } from "react";
import { useAuth } from "../AuthContext.jsx";
import ScanTicketPanel from "../components/ScanTicketPanel.jsx";

/** Standalone page opened in its own browser window (via window.open) so donors can scan a pickup QR code separately from the main app. */
export default function ScanQRPage() {
  const { user } = useAuth();
  const [done, setDone] = useState(null);

  const handleCompleted = (ticket, item) => {
    setDone({ ...item, ticketStatus: ticket?.status });
    if (window.opener && !window.opener.closed) {
      window.opener.postMessage({ type: "zerowaste-scan-completed", ticket, item }, window.location.origin);
      setTimeout(() => window.close(), 1200);
    }
  };

  return (
    <div style={{ maxWidth: 420, margin: "32px auto", padding: "0 20px" }}>
      <h3 style={{ marginTop: 0 }}>Scan Pickup QR Code</h3>
      <p style={{ fontSize: 12.5, color: "var(--text-light)", marginTop: -8, marginBottom: 14 }}>
        Point the camera at the beneficiary's QR code to confirm and complete this pickup.
      </p>

      {done ? (
        <div className="card" style={{ fontSize: 13, color: "var(--status-ok-fg)", fontWeight: 600 }}>
          ✅ Pickup confirmed for "{done.name || "item"}" — donation complete!
          <div style={{ marginTop: 10, display: "flex", alignItems: "center", gap: 8, fontWeight: 500, color: "var(--text-mid)" }}>
            Status: <span className={`badge-status ${done.ticketStatus || "collected"}`}>{done.ticketStatus || "collected"}</span>
          </div>
          {!window.opener && (
            <button type="button" className="btn btn-outline" style={{ width: "100%", marginTop: 14 }} onClick={() => window.close()}>
              Close
            </button>
          )}
        </div>
      ) : (
        <div className="card">
          <ScanTicketPanel user={user} onCompleted={handleCompleted} />
        </div>
      )}
    </div>
  );
}
