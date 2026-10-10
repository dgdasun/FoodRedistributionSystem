import React, { useEffect } from "react";
import confetti from "canvas-confetti";
import { useReducedMotion } from "framer-motion";
import LottieState from "./LottieState.jsx";

/**
 * The confirmation panel shown after a submission succeeds: the drawn check
 * animation plus one restrained confetti burst in the brand greens.
 *
 * Under prefers-reduced-motion the confetti is skipped entirely and the check
 * renders on its final frame, so the message still lands without movement.
 */
export default function SuccessBurst({ title, message, children, fire = true }) {
  const reduced = useReducedMotion();

  useEffect(() => {
    if (!fire || reduced) return;

    const burst = confetti.create(undefined, { resize: true, useWorker: true });
    burst({
      particleCount: 70,
      spread: 62,
      startVelocity: 32,
      gravity: 0.9,
      scalar: 0.85,
      ticks: 160,
      origin: { y: 0.42 },
      colors: ["var(--primary)", "#7FA650", "#B4643A", "#E8DCC8"],
    });

    return () => burst.reset();
  }, [fire, reduced]);

  return (
    <div style={{ textAlign: "center" }}>
      <LottieState variant="success" title={title} message={message} size={128} loop={false} />
      {children}
    </div>
  );
}
