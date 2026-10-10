import React, { useEffect, useState } from "react";
import { useAuth } from "../AuthContext.jsx";
import { api } from "../api.js";
import { IconPackageBox, IconCalendar, IconMapPin, IconWeight } from "../components/Icons.jsx";
import Pagination from "../components/Pagination.jsx";

const PAGE_SIZE = 6;

const STATUS_META = {
  collected: { label: "Completed", cls: "bg-emerald-100 text-emerald-700" },
  pending: { label: "Pending", cls: "bg-amber-100 text-amber-700" },
  expired: { label: "Expired", cls: "bg-rose-100 text-rose-600" },
};

function StatusPill({ status }) {
  const meta = STATUS_META[status] || { label: status, cls: "bg-slate-100 text-slate-600" };
  return (
    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-[11.5px] font-semibold ${meta.cls}`}>
      {meta.label}
    </span>
  );
}

function TicketCard({ ticket }) {
  return (
    <div className="rounded-xl border border-slate-100 p-4 hover:bg-slate-50 hover:shadow-sm transition-colors">
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-9 h-9 rounded-lg bg-emerald-50 flex items-center justify-center flex-shrink-0">
            <IconPackageBox size={18} color="var(--primary)" />
          </div>
          <div className="min-w-0">
            <div className="font-semibold text-[13.5px] text-slate-800 truncate">{ticket.item?.name || "Item"}</div>
            <div className="text-[11px] text-slate-400">Ticket {ticket.id}</div>
          </div>
        </div>
        <StatusPill status={ticket.status} />
      </div>

      <div className="flex flex-col gap-1.5 text-[12.5px] text-slate-600">
        <div className="flex items-center gap-1.5">
          <IconWeight size={13} color="var(--text-light)" />
          <strong className="text-slate-800">{ticket.quantityKg} kg</strong>
        </div>
        <div className="flex items-center gap-1.5">
          <IconCalendar size={13} color="var(--text-light)" />
          {ticket.pickupDate} · {ticket.pickupTime}
        </div>
        <div className="flex items-center gap-1.5">
          <IconMapPin size={13} color="var(--text-light)" />
          <span className="truncate">{ticket.pickupLocation}</span>
        </div>
      </div>
    </div>
  );
}

export default function PickupHistory() {
  const { user } = useAuth();
  const [tickets, setTickets] = useState([]);
  const [page, setPage] = useState(1);

  useEffect(() => {
    api.get(`/tickets?donorId=${user.id}`).then((d) => setTickets(d.tickets || []));
  }, [user.id]);

  const totalPages = Math.max(1, Math.ceil(tickets.length / PAGE_SIZE));
  const pageSafe = Math.min(page, totalPages);
  const pagedTickets = tickets.slice((pageSafe - 1) * PAGE_SIZE, pageSafe * PAGE_SIZE);

  return (
    <>
      <div className="page-header">
        <h1>Pickup History</h1>
        <p>All collection tickets generated for your donations.</p>
      </div>
      <div className="card">
        {tickets.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
            {pagedTickets.map((t) => (
              <TicketCard key={t.id} ticket={t} />
            ))}
          </div>
        )}
        {tickets.length === 0 && <div className="empty-state">No pickups yet.</div>}
        <Pagination page={pageSafe} totalPages={totalPages} onChange={setPage} />
      </div>
    </>
  );
}
