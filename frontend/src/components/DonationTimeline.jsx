import React, { useEffect, useMemo, useState } from "react";
import { Check, Loader2 } from "lucide-react";
import { api } from "../api.js";
import { motion, useReducedMotion } from "framer-motion";

/**
 * Where one donation has got to, end to end.
 *
 * Every step is DERIVED from records that already exist - the donation's own
 * flags, its requests, and its ticket - rather than from a status field on the
 * donation. There is no single field that tracks this: "matched" only exists
 * as an approved request, and "collected" only as a scanned ticket. Deriving
 * it means the timeline cannot disagree with the rest of the app.
 *
 * Expired stock is a genuinely different route (it goes to farms/compost, not
 * to an NGO), so it gets its own final step instead of being shown as a
 * donation that failed to complete.
 */

/** Step states: done (happened), current (next up), todo, skipped. */
function buildSteps({ item, requests, ticket }) {
  const approved = requests.filter((r) => r.status === "approved" || r.status === "collected");
  const isExpiredRoute = item.status === "expired";
  const collected = ticket?.status === "collected" || item.status === "collected";

  const steps = [
    {
      key: "listed",
      label: "Donation created",
      detail: `${item.name} · ${item.batchNumber || "no batch"}`,
      at: item.createdAt,
      done: true,
    },
    {
      key: "published",
      label: "Published to beneficiaries",
      detail: item.published
        ? "Visible on the Available Food board"
        : "Not published yet - publish it to start receiving requests",
      done: item.published || requests.length > 0,
    },
  ];

  if (isExpiredRoute) {
    steps.push({
      key: "rerouted",
      label: "Redirected to compost / animal feed",
      detail: "Past its collection window, so it is offered to farm partners instead",
      done: true,
    });
  } else {
    steps.push({
      key: "requested",
      label: "Requested by a beneficiary",
      detail: requests.length
        ? `${requests.length} request${requests.length === 1 ? "" : "s"} received`
        : "Waiting for the first request",
      done: requests.length > 0,
    });
  }

  steps.push({
    key: "matched",
    label: isExpiredRoute ? "Farm partner matched" : "Beneficiary approved",
    detail: approved.length
      ? approved
          .map((r) => r.beneficiary?.organizationName || r.beneficiary?.name)
          .filter(Boolean)
          .join(", ") || "Approved"
      : "No request approved yet",
    done: approved.length > 0,
  });

  steps.push({
    key: "scheduled",
    label: "Pickup scheduled",
    detail: ticket
      ? `Ticket ${ticket.id} · collect by ${ticket.pickupDate || "date TBC"} ${ticket.pickupTime || ""}`.trim()
      : "A collection ticket is issued once a request is approved",
    done: !!ticket,
  });

  steps.push({
    key: "collected",
    label: "Collected",
    detail: collected ? "QR scanned at handover - donation complete" : "Awaiting collection",
    done: collected,
  });

  // The first not-done step is the one in progress; everything after is todo.
  const firstOpen = steps.findIndex((s) => !s.done);
  return steps.map((s, i) => ({
    ...s,
    state: s.done ? "done" : i === firstOpen ? "current" : "todo",
  }));
}

function formatWhen(value) {
  if (!value) return null;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });
}

export default function DonationTimeline({ item, donorId }) {
  const [requests, setRequests] = useState(null);
  const [ticket, setTicket] = useState(null);
  const [failed, setFailed] = useState(false);
  const reduced = useReducedMotion();

  useEffect(() => {
    let cancelled = false;
    setFailed(false);

    Promise.all([
      api.get(`/requests?itemId=${item.id}`).then((d) => d.requests || []),
      // Tickets are only listable per donor, so filter down to this item.
      api.get(`/tickets?donorId=${donorId}`).then((d) => (d.tickets || []).filter((t) => t.itemId === item.id)),
    ])
      .then(([reqs, tickets]) => {
        if (cancelled) return;
        setRequests(reqs);
        setTicket(tickets[0] || null);
      })
      .catch(() => {
        if (!cancelled) setFailed(true);
      });

    return () => {
      cancelled = true;
    };
  }, [item.id, donorId]);

  const steps = useMemo(
    () => (requests === null ? null : buildSteps({ item, requests, ticket })),
    [item, requests, ticket]
  );

  if (failed) {
    return <div className="timeline-note">Couldn't load this donation's progress. Try again in a moment.</div>;
  }
  if (!steps) {
    return (
      <div className="timeline-note">
        <Loader2 size={14} className="animate-spin" /> Loading progress…
      </div>
    );
  }

  return (
    <ol className="timeline" aria-label={`Progress for ${item.name}`}>
      {steps.map((s, i) => (
        <motion.li
          key={s.key}
          className={`timeline-step ${s.state}`}
          initial={reduced ? false : { opacity: 0, x: -8 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.3, delay: reduced ? 0 : i * 0.06, ease: [0.16, 1, 0.3, 1] }}
        >
          <span className="timeline-marker" aria-hidden="true">
            {s.state === "done" ? <Check size={12} strokeWidth={3} /> : null}
          </span>
          <div className="timeline-body">
            <div className="timeline-label">
              {s.label}
              {/* The written state is the accessible cue - the marker colour
                  and fill are only a second signal. */}
              <span className="sr-only">
                {s.state === "done" ? " (completed)" : s.state === "current" ? " (in progress)" : " (not started)"}
              </span>
            </div>
            <div className="timeline-detail">{s.detail}</div>
            {formatWhen(s.at) && <div className="timeline-when">{formatWhen(s.at)}</div>}
          </div>
        </motion.li>
      ))}
    </ol>
  );
}
