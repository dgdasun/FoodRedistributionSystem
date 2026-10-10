import React from "react";
import { FadeIn } from "./motion/Motion.jsx";

/**
 * A labelled band of a dashboard.
 *
 * The admin view had eight cards stacked at equal weight, which gives the eye
 * nothing to hold on to. Grouping them under quiet section headers is the
 * structural convention SaaS dashboards use: the header carries the meaning,
 * so the cards inside can stay plain.
 *
 * The header is deliberately understated - small, uppercase, wide-tracked,
 * muted - so it organises without competing with the card titles under it.
 */
export default function Section({ title, hint, action, children, className = "", style, innerStyle }) {
  return (
    <FadeIn style={{ marginTop: 26, ...style }}>
      {(title || action) && (
        <div
          style={{
            display: "flex",
            alignItems: "baseline",
            justifyContent: "space-between",
            gap: 14,
            flexWrap: "wrap",
            margin: "0 2px 12px",
          }}
        >
          <div>
            {title && (
              <h2
                style={{
                  fontSize: 11.5,
                  fontWeight: 700,
                  letterSpacing: "0.09em",
                  textTransform: "uppercase",
                  color: "var(--text-light)",
                  margin: 0,
                }}
              >
                {title}
              </h2>
            )}
            {hint && (
              <p style={{ fontSize: 13, color: "var(--text-mid)", marginTop: 4 }}>{hint}</p>
            )}
          </div>
          {action}
        </div>
      )}
      <div className={className} style={innerStyle}>
        {children}
      </div>
    </FadeIn>
  );
}
