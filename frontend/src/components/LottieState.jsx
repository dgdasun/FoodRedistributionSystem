import React from "react";
import Lottie from "lottie-react";
import { useReducedMotion } from "framer-motion";
import emptyBasket from "../lottie/empty-basket.json";
import successCheck from "../lottie/success-check.json";

const ANIMATIONS = {
  empty: emptyBasket,
  success: successCheck,
};

/**
 * Illustrated empty / success state.
 *
 * When the user prefers reduced motion the animation still renders, frozen on
 * its final frame, so the illustration and its message survive without movement.
 */
export default function LottieState({
  variant = "empty",
  title,
  message,
  size = 140,
  loop,
  children,
}) {
  const reduced = useReducedMotion();
  const animationData = ANIMATIONS[variant] || ANIMATIONS.empty;
  const shouldLoop = loop ?? variant === "empty";

  return (
    <div className="empty-state" style={{ padding: "26px 20px" }}>
      <div style={{ width: size, height: size, margin: "0 auto 6px" }}>
        <Lottie
          animationData={animationData}
          loop={reduced ? false : shouldLoop}
          autoplay={!reduced}
          initialSegment={reduced ? [59, 60] : undefined}
          style={{ width: "100%", height: "100%" }}
          aria-hidden="true"
        />
      </div>
      {title && (
        <div style={{ fontWeight: 700, color: "var(--text-dark)", fontSize: 15, marginBottom: 4 }}>{title}</div>
      )}
      {message && <p style={{ fontSize: 13.5, maxWidth: 320, margin: "0 auto" }}>{message}</p>}
      {children}
    </div>
  );
}
