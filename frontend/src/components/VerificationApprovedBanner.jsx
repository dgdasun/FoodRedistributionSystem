import React, { useEffect, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { PartyPopper, X } from "lucide-react";

const DURATION_MS = 5000;

const seenKey = (userId) => `hasSeenVerificationSuccess_${userId}`;

function hasSeen(userId) {
  try {
    return localStorage.getItem(seenKey(userId)) === "1";
  } catch {
    return false;
  }
}

function markSeen(userId) {
  try {
    localStorage.setItem(seenKey(userId), "1");
  } catch {
    // Storage blocked - worst case the banner shows again next visit.
  }
}

/**
 * One-time celebration shown on the dashboard after an admin approves the account.
 *
 * Only fires when verificationReviewedAt is set, i.e. an admin actually approved
 * this account. Accounts verified before that field existed (seeded or long-ago
 * approvals) would otherwise get a "just approved" banner out of the blue.
 *
 * Marked seen as soon as it shows, so a refresh mid-animation doesn't replay it.
 */
export default function VerificationApprovedBanner({ user }) {
  const reduced = useReducedMotion();
  const eligible = !!user?.verified && !!user?.verificationReviewedAt && !hasSeen(user.id);
  const [open, setOpen] = useState(eligible);

  // The user object can flip to verified while the dashboard is open (live refresh).
  useEffect(() => {
    if (eligible) setOpen(true);
  }, [eligible]);

  useEffect(() => {
    if (!open) return undefined;
    markSeen(user.id);
    const t = setTimeout(() => setOpen(false), DURATION_MS);
    return () => clearTimeout(t);
  }, [open, user?.id]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          role="status"
          aria-live="polite"
          initial={reduced ? false : { opacity: 0, y: -12, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={reduced ? { opacity: 0 } : { opacity: 0, y: -8, scale: 0.98 }}
          transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
          className="relative mb-5 overflow-hidden rounded-2xl border px-5 py-4 shadow-sm"
          style={{ background: "var(--primary-light)", borderColor: "var(--primary)" }}
        >
          <div className="flex items-start gap-3">
            <span
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full"
              style={{ background: "var(--primary)", color: "#fff" }}
            >
              <PartyPopper size={20} aria-hidden="true" />
            </span>
            <div className="min-w-0 flex-1">
              <strong className="block text-[15px]" style={{ color: "var(--primary)" }}>
                🎉 Verification Approved!
              </strong>
              <p className="m-0 mt-0.5 text-[13.5px]" style={{ color: "var(--text-mid)" }}>
                Your organization is successfully verified and fully active.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="Dismiss"
              className="shrink-0 rounded-md p-1 transition-colors hover:bg-black/5"
              style={{ color: "var(--text-mid)" }}
            >
              <X size={16} />
            </button>
          </div>
          {/* Countdown bar so the auto-dismiss isn't a surprise. */}
          {!reduced && (
            <motion.div
              className="absolute bottom-0 left-0 h-[3px]"
              style={{ background: "var(--primary)", opacity: 0.5 }}
              initial={{ width: "100%" }}
              animate={{ width: "0%" }}
              transition={{ duration: DURATION_MS / 1000, ease: "linear" }}
            />
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
