import React from "react";

/**
 * Placeholder blocks shown while data loads.
 *
 * Deliberately mirrors the real card's shape and height so the layout does not
 * jump when the content arrives. The shimmer is CSS-only (see .skeleton in
 * index.css) and is switched off under prefers-reduced-motion.
 */
export function SkeletonLine({ width = "100%", height = 12, radius = 6, style }) {
  return <div className="skeleton" style={{ width, height, borderRadius: radius, ...style }} />;
}

export function SkeletonFoodCard() {
  return (
    <div className="card" aria-hidden="true">
      <SkeletonLine height={120} radius={10} style={{ marginBottom: 12 }} />
      <SkeletonLine width="70%" height={14} style={{ marginBottom: 8 }} />
      <SkeletonLine width="40%" height={11} style={{ marginBottom: 14 }} />
      <SkeletonLine width="100%" height={7} radius={999} style={{ marginBottom: 14 }} />
      <SkeletonLine width="55%" height={11} style={{ marginBottom: 6 }} />
      <SkeletonLine width="65%" height={11} style={{ marginBottom: 16 }} />
      <SkeletonLine height={34} radius={10} />
    </div>
  );
}

export function SkeletonGrid({ count = 6 }) {
  return (
    <>
      {Array.from({ length: count }, (_, i) => (
        <SkeletonFoodCard key={i} />
      ))}
    </>
  );
}

export default SkeletonFoodCard;
