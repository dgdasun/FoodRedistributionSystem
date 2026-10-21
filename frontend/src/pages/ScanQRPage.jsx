import React, { useState } from "react";
import { QrCode, Package, Clock, MapPin, ScanLine, X, Check } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../AuthContext.jsx";
import ScanTicketPanel from "../components/ScanTicketPanel.jsx";
import SuccessBurst from "../components/SuccessBurst.jsx";
import { LogoZeroWasteMark } from "../components/Icons.jsx";
import "../styles/scan.css";

const STEPS = ["Scan", "Verify", "Done"];

/** Standalone page opened in its own browser window (via window.open) so donors can scan a pickup QR code separately from the main app. */
export default function ScanQRPage() {
  const { user } = useAuth();
  const [done, setDone] = useState(null);
  // Remounting the panel restarts the camera for the next pickup.
  const [session, setSession] = useState(0);
  const inPopup = !!window.opener && !window.opener.closed;
  const navigate = useNavigate();
  // Browsers only let a script close a window it opened, so outside the
  // sidebar pop-up "close" means going back into the app.
  const leave = () => (inPopup ? window.close() : navigate("/dashboard"));

  const handleCompleted = (ticket, item) => {
    setDone({ item: item || {}, ticket: ticket || {} });
    if (inPopup) {
      window.opener.postMessage({ type: "zerowaste-scan-completed", ticket, item }, window.location.origin);
    }
  };

  const scanAnother = () => {
    setDone(null);
    setSession((s) => s + 1);
  };

  const unit = done?.item?.category === "Cooked Meals" ? "portions" : "kg";
  const qty = done?.ticket?.quantityKg ?? done?.item?.quantityKg;

  return (
    <div className="sc-page">
      <header className="sc-header">
        <div className="sc-brand">
          <span className="sc-brand-mark"><LogoZeroWasteMark size={22} /></span>
          <div>
            <h1>Scan pickup</h1>
            <p>{user?.organizationName || user?.name}</p>
          </div>
        </div>
        <button type="button" className="sc-close" onClick={leave} aria-label={inPopup ? "Close window" : "Back to dashboard"}>
          <X size={16} />
        </button>
      </header>

      <ol className="sc-steps" aria-label="Progress">
        {STEPS.map((s, i) => {
          const current = done ? 2 : 0;
          return (
            <li key={s} className={i < current ? "done" : i === current ? "current" : undefined} aria-current={i === current ? "step" : undefined}>
              <span>{i < current ? <Check size={11} strokeWidth={3} /> : i + 1}</span>
              {s}
            </li>
          );
        })}
      </ol>

      {done ? (
        <section className="sc-card sc-success">
          <SuccessBurst title="Pickup confirmed" message="The donation is now marked as collected.">
            <div className="sc-receipt">
              <div className="sc-receipt-row">
                <Package size={15} />
                <span>Item</span>
                <strong>{done.item.name || "Donation"}</strong>
              </div>
              {qty != null && (
                <div className="sc-receipt-row">
                  <ScanLine size={15} />
                  <span>Quantity</span>
                  <strong>{qty} {unit}</strong>
                </div>
              )}
              {done.ticket.pickupLocation && (
                <div className="sc-receipt-row">
                  <MapPin size={15} />
                  <span>Pickup</span>
                  <strong>{done.ticket.pickupLocation}</strong>
                </div>
              )}
              <div className="sc-receipt-row">
                <Clock size={15} />
                <span>Status</span>
                <strong className="sc-ok">{done.ticket.status || "collected"}</strong>
              </div>
            </div>

            <div className="sc-success-actions">
              <button type="button" className="btn btn-primary" onClick={scanAnother}>
                <QrCode size={16} /> Scan another
              </button>
              <button type="button" className="btn btn-outline" onClick={leave}>
                {inPopup ? "Close window" : "Back to dashboard"}
              </button>
            </div>
          </SuccessBurst>
        </section>
      ) : (
        <section className="sc-card">
          <div className="sc-card-head">
            <h2>Point the camera at the QR code</h2>
            <p>The pickup completes automatically once the code is read.</p>
          </div>
          <ScanTicketPanel key={session} user={user} onCompleted={handleCompleted} />
        </section>
      )}
    </div>
  );
}
