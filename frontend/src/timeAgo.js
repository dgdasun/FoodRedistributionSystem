// Tiny relative-time formatter for notification lists — "5m ago", "1h ago", "2d ago".
export function timeAgo(dateInput) {
  const date = typeof dateInput === "string" ? new Date(dateInput) : dateInput;
  const seconds = Math.max(0, Math.floor((Date.now() - date.getTime()) / 1000));

  if (seconds < 60) return "just now";

  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;

  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

/**
 * Long-form relative time for verification cards — "just now", "15 minutes ago",
 * "3 hours ago", "2 days ago". Reads as a sentence once prefixed ("Submitted ..."),
 * where timeAgo()'s compact "15m ago" would not.
 *
 * Returns "" for a missing or unparseable value so callers can omit the badge
 * entirely — User.createdAt is null on accounts written before that field
 * existed, so this is a real case, not just defensiveness.
 */
export function getRelativeTime(dateString) {
  if (!dateString) return "";

  const date = dateString instanceof Date ? dateString : new Date(dateString);
  if (Number.isNaN(date.getTime())) return "";

  // Clamped: a client clock running behind the server would otherwise make a
  // fresh submission come out as a negative count.
  const seconds = Math.max(0, Math.floor((Date.now() - date.getTime()) / 1000));
  if (seconds < 60) return "just now";

  const units = [
    { label: "minute", secs: 60 },
    { label: "hour", secs: 3600 },
    { label: "day", secs: 86400 },
    { label: "week", secs: 604800 },
    { label: "month", secs: 2592000 }, // 30d — approximate on purpose
    { label: "year", secs: 31536000 },
  ];

  // Largest unit that still yields a count of at least 1.
  let chosen = units[0];
  for (const unit of units) {
    if (seconds >= unit.secs) chosen = unit;
  }

  const count = Math.floor(seconds / chosen.secs);
  return `${count} ${chosen.label}${count === 1 ? "" : "s"} ago`;
}

/**
 * Exact timestamp for the hover tooltip that backs the relative label —
 * "Oct 13, 2026 at 9:30 PM", in the viewer's own timezone.
 */
export function formatExactTime(dateString) {
  if (!dateString) return "";

  const date = dateString instanceof Date ? dateString : new Date(dateString);
  if (Number.isNaN(date.getTime())) return "";

  const day = date.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
  const time = date.toLocaleTimeString(undefined, {
    hour: "numeric",
    minute: "2-digit",
  });
  return `${day} at ${time}`;
}
