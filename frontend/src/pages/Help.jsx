import React, { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import {
  Search, X, ChevronDown, MessageCircle, LifeBuoy, ArrowRight, Sparkles,
  Upload, Send, Inbox, QrCode, Package, ShieldCheck, Ticket, Leaf, Users,
  Settings, FileText, BarChart3, UserCircle, CheckCircle2, Clock, Activity,
} from "lucide-react";
import { useAuth } from "../AuthContext.jsx";
import { useLiveData } from "../hooks/useLiveData.js";
import "../styles/help.css";

const ROLE_LABEL = {
  donor: "Donor",
  beneficiary: "Beneficiary / NGO",
  farm: "Farm partner",
  admin: "Administrator",
};

/** The first steps each role takes, linked to the page that does each one. */
const GUIDES = {
  donor: [
    { Icon: Upload, title: "Add your stock", text: "Add items one by one or upload a CSV in My Donations.", to: "/donations" },
    { Icon: Send, title: "Publish surplus", text: "Publish near-expiry items so verified NGOs can see them.", to: "/donations" },
    { Icon: Inbox, title: "Review requests", text: "Approve, offer a smaller amount or reject - with AI ranking.", to: "/requests" },
    { Icon: QrCode, title: "Hand over", text: "Scan the collector's QR ticket to mark the pickup collected.", to: "/scan" },
  ],
  beneficiary: [
    { Icon: ShieldCheck, title: "Get verified", text: "Upload your organization documents for admin review.", to: "/profile" },
    { Icon: Package, title: "Browse food", text: "Find near-expiry surplus by type, expiry and quantity.", to: "/browse" },
    { Icon: Send, title: "Send a request", text: "Choose the quantity you need and how urgent it is.", to: "/browse" },
    { Icon: Ticket, title: "Collect", text: "Show the QR ticket from My Tickets at the pickup point.", to: "/tickets" },
  ],
  farm: [
    { Icon: ShieldCheck, title: "Get verified", text: "Upload your farm or facility documents for admin review.", to: "/profile" },
    { Icon: Leaf, title: "Find expired stock", text: "Expired items are redirected to farms for feed or compost.", to: "/browse" },
    { Icon: Send, title: "Send a request", text: "Request the quantity your facility can take.", to: "/browse" },
    { Icon: Ticket, title: "Collect", text: "Show the QR ticket from My Tickets at the pickup point.", to: "/tickets" },
  ],
  admin: [
    { Icon: ShieldCheck, title: "Verify organizations", text: "Review documents and approve or reject NGOs and farms.", to: "/admin/beneficiaries" },
    { Icon: Users, title: "Manage users", text: "View every account and its role and status.", to: "/admin/users" },
    { Icon: Settings, title: "Tune expiry rules", text: "Set the surplus window for each food category.", to: "/admin/settings" },
    { Icon: FileText, title: "Report", text: "Generate redistribution reports and export them as PDF.", to: "/admin/reports" },
  ],
};

const TOPICS = [
  { key: "start", label: "Getting started", Icon: Sparkles },
  { key: "donations", label: "Donations", Icon: Package },
  { key: "requests", label: "Requests & pickup", Icon: Ticket },
  { key: "account", label: "Account & verification", Icon: UserCircle },
  { key: "ai", label: "AI & impact", Icon: BarChart3 },
  { key: "admin", label: "Administration", Icon: Settings },
];

const ALL = ["donor", "beneficiary", "farm", "admin"];
const RECEIVERS = ["beneficiary", "farm"];

const FAQS = [
  // Getting started
  { topic: "start", roles: ALL, q: "What is Zero Waste?", a: "Zero Waste connects food donors with verified NGOs and farms. Donors publish near-expiry surplus, NGOs request it for people in need, and anything past expiry is redirected to farms for animal feed or compost instead of landfill." },
  { topic: "start", roles: ["donor"], q: "How do I publish surplus food?", a: 'Go to My Donations, add an item manually or upload a CSV, then click "Publish" once it is flagged as surplus. Published items appear on the Available Food page straight away.' },
  { topic: "start", roles: RECEIVERS, q: "Can I browse before my account is verified?", a: "Yes. Anyone - even a guest - can browse listings. Sending requests and receiving collection tickets need your organization to be verified by an administrator first." },
  // Donations
  { topic: "donations", roles: ["donor", "admin"], q: "What format does the CSV upload need?", a: "The file needs the headers name, category, batchNumber, quantityKg, expiryDate. You can download a ready-made sample CSV from the My Donations page." },
  { topic: "donations", roles: ["donor", "admin"], q: "When is an item treated as surplus?", a: "Each food category has an expiry window set by the administrator (for example, cooked food and bakery are tighter than packaged rations). Items inside that window are flagged as surplus and can be published." },
  { topic: "donations", roles: ALL, q: "What happens to expired food?", a: "Items past their expiry date are removed from the human-consumption listings and redirected to registered farms and composting facilities." },
  // Requests & pickup
  { topic: "requests", roles: RECEIVERS, q: "How do I request food?", a: 'Open Available Food, pick an item and click "Request this item". Enter the quantity you need and the urgency. The donor is notified immediately.' },
  { topic: "requests", roles: ["donor"], q: "How do I respond to a request?", a: "In Food Requests you can approve a request, offer a smaller quantity (a partial offer), or reject it with a reason. Approving issues a collection ticket to the requester." },
  { topic: "requests", roles: RECEIVERS, q: 'What does "Partial Offer" mean?', a: "The donor could not cover your full quantity and has offered a smaller amount instead. Review it in My Requests and accept or decline the offer." },
  { topic: "requests", roles: [...RECEIVERS, "donor"], q: "How does collection work?", a: "When a request is approved, the requester gets a collection ticket with a unique QR code in My Tickets. They show it at pickup, and the donor scans it to mark the food as collected." },
  { topic: "requests", roles: ["donor"], q: "Where can I see past pickups?", a: "Pickup History lists every collected handover with the organization, quantity and time, so you have a record for your own reporting." },
  // Account & verification
  { topic: "account", roles: RECEIVERS, q: "How does verification work?", a: "After registering, upload your organization documents from your Dashboard or Profile. An administrator reviews them under Verifications and approves or rejects the account. You are notified either way." },
  { topic: "account", roles: ALL, q: "How do I change my profile photo or details?", a: "Open Profile from the sidebar. You can upload a photo and update your organization and contact details there." },
  { topic: "account", roles: ALL, q: "Can I use dark mode?", a: "Yes. Use the theme toggle in the top bar to switch between light and dark." },
  // AI & impact
  { topic: "ai", roles: ["donor", "admin", ...RECEIVERS], q: "How does the AI decide who gets the food?", a: "The AI priority engine scores each pending request on urgency, distance from the collection point, organization size, handling capacity and recent allocation history. Donors see the ranking as a recommendation - the final decision is always theirs." },
  { topic: "ai", roles: ["donor", "admin"], q: "What does the surplus forecast show?", a: "A machine-learning model trained on past inventory predicts how much surplus each food category is likely to produce, so donors can plan and admins can spot trends early." },
  { topic: "ai", roles: ["donor", "beneficiary", "admin"], q: "How is impact calculated?", a: "The Impact page totals the food redistributed in kilograms and converts it into meals served and CO₂ emissions avoided." },
  { topic: "ai", roles: ["farm"], q: "How is my farm's impact calculated?", a: "The Impact page totals the expired food you have collected in kilograms - food that would otherwise have gone to landfill - and estimates the CO₂ emissions avoided (about 2.5 kg of CO₂ per kg of food diverted)." },
  // Administration
  { topic: "admin", roles: ["admin"], q: "How do I verify an organization?", a: "Open Verifications, review the uploaded documents, then approve the account or reject it with a reason. The organization can request food as soon as it is approved." },
  { topic: "admin", roles: ["admin"], q: "How do I change expiry rules?", a: "In Settings, pick a preset (strict or relaxed) or set the surplus window for each category yourself. New rules apply to items as they are classified." },
  { topic: "admin", roles: ["admin"], q: "Can I export reports?", a: "Yes. Generate Reports summarizes donations, requests and collections, and can be downloaded as a PDF." },
];

function openChat(message) {
  window.dispatchEvent(new CustomEvent("zw:open-chat", { detail: { message } }));
}

function FaqItem({ faq, open, onToggle, id }) {
  const reduced = useReducedMotion();
  return (
    <div className={open ? "hp-faq open" : "hp-faq"}>
      <button
        type="button"
        className="hp-faq-q"
        onClick={onToggle}
        aria-expanded={open}
        aria-controls={id}
      >
        <span>{faq.q}</span>
        <ChevronDown size={18} className="hp-faq-chevron" />
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            id={id}
            className="hp-faq-a"
            initial={reduced ? false : { height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={reduced ? undefined : { height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
          >
            <p>{faq.a}</p>
            <button type="button" className="hp-faq-ask" onClick={() => openChat(faq.q)}>
              <MessageCircle size={13} /> Still unsure? Ask the assistant
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function Help() {
  const { user } = useAuth();
  const role = user?.role || "beneficiary";
  const [query, setQuery] = useState("");
  const [topic, setTopic] = useState("");
  const [openKey, setOpenKey] = useState(null);
  const { data: health, error: healthError } = useLiveData("/health", { intervalMs: 30000 });

  const roleFaqs = useMemo(() => FAQS.filter((f) => f.roles.includes(role)), [role]);
  const topics = useMemo(() => TOPICS.filter((t) => roleFaqs.some((f) => f.topic === t.key)), [roleFaqs]);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return roleFaqs.filter((f) => {
      if (topic && f.topic !== topic) return false;
      if (q && !(f.q + " " + f.a).toLowerCase().includes(q)) return false;
      return true;
    });
  }, [roleFaqs, query, topic]);

  const guide = GUIDES[role] || GUIDES.beneficiary;
  // "P. Rathnayake" should greet as the full name, not "Hi P.".
  const [first] = (user?.name || "").split(" ");
  const firstName = first && first.length > 2 && !first.endsWith(".") ? first : user?.name || "";
  const needsVerification = RECEIVERS.includes(role) && !user?.verified;
  const online = !healthError && health?.status === "ok";
  const checked = !!health || !!healthError;

  return (
    <div className="hp-page">
      <section className="hp-hero">
        <svg className="hp-hero-art" viewBox="0 0 600 260" preserveAspectRatio="xMaxYMid slice" aria-hidden="true">
          <circle cx="540" cy="30" r="130" />
          <circle cx="420" cy="240" r="70" />
          <circle cx="610" cy="210" r="50" />
        </svg>
        <span className="hp-eyebrow">
          <LifeBuoy size={13} /> Help centre · {ROLE_LABEL[role]}
        </span>
        <h1>{firstName ? `Hi ${firstName}, how can we help?` : "How can we help?"}</h1>
        <p>Search the guides below, or ask the Zero Waste assistant any time.</p>

        <div className="hp-search">
          <Search size={18} />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search for answers, e.g. “QR ticket” or “CSV”"
            aria-label="Search help articles"
          />
          {query && (
            <button type="button" className="hp-search-clear" onClick={() => setQuery("")} aria-label="Clear search">
              <X size={14} />
            </button>
          )}
        </div>

        <div className="hp-popular">
          <span>Popular:</span>
          {roleFaqs.slice(0, 3).map((f) => (
            <button
              key={f.q}
              type="button"
              onClick={() => {
                setTopic("");
                setQuery("");
                setOpenKey(f.q);
                document.getElementById("hp-faqs")?.scrollIntoView({ behavior: "smooth", block: "start" });
              }}
            >
              {f.q}
            </button>
          ))}
        </div>
      </section>

      {needsVerification && (
        <div className="hp-alert">
          <div className="hp-alert-icon"><Clock size={18} /></div>
          <div>
            <strong>Your organization is awaiting verification</strong>
            <p>Upload your documents so an administrator can approve you. Until then you can browse but not request food.</p>
          </div>
          <Link to="/profile" className="btn btn-primary btn-sm">Upload documents</Link>
        </div>
      )}

      <section>
        <div className="hp-section-head">
          <h2>Getting started</h2>
          <p>The four steps you'll use most as {role === "admin" ? "an" : "a"} {ROLE_LABEL[role]}, in order.</p>
        </div>
        <div className="hp-steps">
          {guide.map(({ Icon, title, text, to }, i) => (
            <Link key={title} to={to} className="hp-step">
              <div className="hp-step-top">
                <span className="hp-step-icon"><Icon size={20} /></span>
                <span className="hp-step-num">0{i + 1}</span>
              </div>
              <strong>{title}</strong>
              <p>{text}</p>
              <span className="hp-step-link">Open <ArrowRight size={14} /></span>
            </Link>
          ))}
        </div>
      </section>

      <div className="hp-layout">
        <section id="hp-faqs" className="hp-faqs">
          <div className="hp-section-head">
            <h2>Frequently asked questions</h2>
            <p>{visible.length} answer{visible.length === 1 ? "" : "s"}{query ? ` for “${query}”` : ""}</p>
          </div>

          <div className="hp-topics" role="group" aria-label="Filter by topic">
            <button
              type="button"
              className={topic === "" ? "hp-topic active" : "hp-topic"}
              onClick={() => setTopic("")}
              aria-pressed={topic === ""}
            >
              All topics
            </button>
            {topics.map(({ key, label, Icon }) => (
              <button
                key={key}
                type="button"
                className={topic === key ? "hp-topic active" : "hp-topic"}
                onClick={() => setTopic(key)}
                aria-pressed={topic === key}
              >
                <Icon size={14} /> {label}
              </button>
            ))}
          </div>

          <div className="hp-faq-list">
            {visible.map((f, i) => (
              <FaqItem
                key={f.q}
                id={`hp-faq-${i}`}
                faq={f}
                open={openKey === f.q}
                onToggle={() => setOpenKey((k) => (k === f.q ? null : f.q))}
              />
            ))}
            {visible.length === 0 && (
              <div className="hp-empty">
                <div className="hp-empty-icon"><Search size={22} /></div>
                <strong>No answers found</strong>
                <p>Try different words, or ask the assistant directly.</p>
                <button type="button" className="btn btn-primary btn-sm" onClick={() => openChat(query)}>
                  <MessageCircle size={14} /> Ask the assistant
                </button>
              </div>
            )}
          </div>
        </section>

        <aside className="hp-side">
          <div className="hp-card hp-card-chat">
            <span className="hp-card-icon"><MessageCircle size={20} /></span>
            <strong>Chat with the assistant</strong>
            <p>Instant answers about donating, requests, tickets and your impact.</p>
            <button type="button" className="btn btn-primary hp-card-btn" onClick={() => openChat("")}>
              Start a chat <ArrowRight size={15} />
            </button>
          </div>

          <div className="hp-card">
            <div className="hp-card-row">
              <span className="hp-card-icon hp-card-icon-sm"><UserCircle size={17} /></span>
              <strong>Your account</strong>
            </div>
            <dl className="hp-facts">
              <div><dt>Role</dt><dd>{ROLE_LABEL[role]}</dd></div>
              {RECEIVERS.includes(role) && (
                <div>
                  <dt>Verification</dt>
                  <dd className={user?.verified ? "hp-ok" : "hp-warn"}>
                    {user?.verified ? <><CheckCircle2 size={13} /> Verified</> : <><Clock size={13} /> Pending</>}
                  </dd>
                </div>
              )}
              {user?.email && <div><dt>Email</dt><dd title={user.email}>{user.email}</dd></div>}
            </dl>
            <Link to="/profile" className="hp-card-link">Manage profile <ArrowRight size={14} /></Link>
          </div>

          <div className="hp-card">
            <div className="hp-card-row">
              <span className="hp-card-icon hp-card-icon-sm"><Activity size={17} /></span>
              <strong>System status</strong>
            </div>
            <div className={online ? "hp-status ok" : checked ? "hp-status down" : "hp-status"}>
              <i />
              {!checked ? "Checking…" : online ? "All systems operational" : "Service issues detected"}
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
