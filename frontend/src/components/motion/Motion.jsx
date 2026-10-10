import React, { useEffect, useRef, useState } from "react";
import { motion, useInView, useMotionValue, useReducedMotion, useSpring, animate } from "framer-motion";

/**
 * Shared Framer Motion primitives.
 *
 * Every export honours `prefers-reduced-motion` the same way index.css already
 * does for the CSS `.reveal` classes - when the user asks for less motion the
 * components still render, they just skip straight to their final state.
 */

const EASE = [0.16, 1, 0.3, 1];

/** Fade + slide up the first time the element scrolls into view. Drop-in for <Reveal>. */
export function FadeIn({ children, delay = 0, y = 24, className = "", as = "div", ...rest }) {
  const reduced = useReducedMotion();
  const Tag = motion[as] || motion.div;

  return (
    <Tag
      className={className}
      initial={reduced ? false : { opacity: 0, y }}
      whileInView={reduced ? undefined : { opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.15 }}
      transition={{ duration: 0.6, ease: EASE, delay: delay / 1000 }}
      {...rest}
    >
      {children}
    </Tag>
  );
}

/**
 * Parent that releases its children one after another. Pair with <StaggerItem>.
 * `gap` is the delay between children, in seconds.
 */
export function Stagger({ children, gap = 0.07, delay = 0, className = "", ...rest }) {
  const reduced = useReducedMotion();

  return (
    <motion.div
      className={className}
      initial={reduced ? false : "hidden"}
      whileInView={reduced ? undefined : "shown"}
      viewport={{ once: true, amount: 0.1 }}
      variants={{
        hidden: {},
        shown: { transition: { staggerChildren: gap, delayChildren: delay } },
      }}
      {...rest}
    >
      {children}
    </motion.div>
  );
}

/** One child of a <Stagger>. */
export function StaggerItem({ children, y = 18, className = "", ...rest }) {
  return (
    <motion.div
      className={className}
      variants={{
        hidden: { opacity: 0, y },
        shown: { opacity: 1, y: 0, transition: { duration: 0.5, ease: EASE } },
      }}
      {...rest}
    >
      {children}
    </motion.div>
  );
}

/**
 * Lifts a card slightly on hover and presses it in on tap.
 *
 * It also carries the same variants as <StaggerItem>, so dropping one of these
 * inside a <Stagger> makes it join the entrance sequence. On its own the
 * variants stay dormant - nothing drives them, so the card just renders.
 */
export function HoverLift({ children, className = "", lift = -4, y = 18, ...rest }) {
  const reduced = useReducedMotion();

  return (
    <motion.div
      className={className}
      variants={{
        hidden: { opacity: 0, y },
        shown: { opacity: 1, y: 0, transition: { duration: 0.5, ease: EASE } },
      }}
      whileHover={reduced ? undefined : { y: lift, transition: { duration: 0.2, ease: "easeOut" } }}
      whileTap={reduced ? undefined : { scale: 0.99 }}
      {...rest}
    >
      {children}
    </motion.div>
  );
}

/**
 * Counts from 0 up to `value` once the number scrolls into view.
 * `decimals` keeps kg values readable (e.g. 12.5) without float noise.
 */
export function CountUp({ value = 0, decimals = 0, duration = 1.1, className = "" }) {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, amount: 0.4 });
  const reduced = useReducedMotion();
  const [shown, setShown] = useState(() => (reduced ? value : 0));

  useEffect(() => {
    if (reduced) {
      setShown(value);
      return undefined;
    }
    if (!inView) return undefined;

    const controls = animate(0, value, {
      duration,
      ease: "easeOut",
      onUpdate: (v) => setShown(v),
    });
    return () => controls.stop();
  }, [inView, value, duration, reduced]);

  const text = Number(shown).toLocaleString(undefined, {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });

  return (
    <span ref={ref} className={className}>
      {text}
    </span>
  );
}

/** Horizontal bar that grows to `percent` when scrolled into view. */
export function GrowBar({ percent, color = "var(--primary)", height = 9, trackColor = "var(--icon-chip)" }) {
  const reduced = useReducedMotion();
  const width = `${Math.max(2, percent)}%`;

  return (
    <div style={{ background: trackColor, borderRadius: 8, height, overflow: "hidden" }}>
      <motion.div
        style={{ height, borderRadius: 8, background: color }}
        initial={reduced ? false : { width: 0 }}
        whileInView={reduced ? undefined : { width }}
        viewport={{ once: true, amount: 0.5 }}
        transition={{ duration: 0.9, ease: EASE }}
      />
    </div>
  );
}

/** Re-exported so pages can build one-off animations without importing framer-motion directly. */
export { motion, useReducedMotion, useMotionValue, useSpring };
