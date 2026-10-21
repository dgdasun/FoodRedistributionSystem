import React, { useState, useRef, useEffect } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { MessageCircle, X, SendHorizontal, RotateCcw, RefreshCw, Sparkles } from "lucide-react";
import { api } from "../api.js";
import { useAuth } from "../AuthContext.jsx";
import { LogoZeroWasteMark } from "./Icons.jsx";
import "../styles/chatbot.css";

const GREETING = "Hi! I'm the Zero Waste assistant. Ask me about donating, requesting food, tickets, or your impact stats.";

// Starter questions per role; each matches a topic the backend assistant answers.
const SUGGESTIONS = {
  donor: ["How do I publish surplus food?", "How does the AI rank requests?", "How do QR tickets work?", "How is CO2 impact calculated?"],
  beneficiary: ["How do I request food?", "How does verification work?", "How do I collect with my ticket?", "What counts as near-expiry?"],
  farm: ["How do farms get expired food?", "How do I request expired stock?", "How do I collect with my ticket?", "How is my impact calculated?"],
  admin: ["How does the AI forecast work?", "How are expiry thresholds set?", "How does verification work?"],
  guest: ["How do I donate surplus food?", "How do I register my NGO?", "What happens to expired food?", "How does pickup work?"],
};

const now = () => Date.now();
const timeOf = (t) => new Date(t).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
const freshConversation = () => [{ id: 0, from: "bot", text: GREETING, at: now() }];

export default function Chatbot() {
  const { user } = useAuth() || {};
  const reduced = useReducedMotion();
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState(freshConversation);
  const [loading, setLoading] = useState(false);
  const bodyRef = useRef(null);
  const inputRef = useRef(null);
  const idRef = useRef(1);

  const suggestions = SUGGESTIONS[user?.role] || SUGGESTIONS.guest;
  const onlyGreeting = messages.length === 1;

  useEffect(() => {
    if (bodyRef.current) bodyRef.current.scrollTop = bodyRef.current.scrollHeight;
  }, [messages, open, loading]);

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 150);
  }, [open]);

  // Other pages (e.g. Help) open the assistant with
  // window.dispatchEvent(new CustomEvent("zw:open-chat", { detail: { message } })).
  // The message is only pre-filled, never sent, so the user stays in control.
  useEffect(() => {
    const onOpen = (e) => {
      setOpen(true);
      if (e.detail?.message) setInput(e.detail.message);
    };
    window.addEventListener("zw:open-chat", onOpen);
    return () => window.removeEventListener("zw:open-chat", onOpen);
  }, []);

  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  // Grow the textarea with its content, up to ~4 lines.
  useEffect(() => {
    const el = inputRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 104)}px`;
  }, [input, open]);

  const ask = async (text) => {
    setLoading(true);
    try {
      const { reply } = await api.post("/chatbot", { message: text });
      setMessages((m) => [...m, { id: idRef.current++, from: "bot", text: reply, at: now() }]);
    } catch {
      setMessages((m) => [...m, { id: idRef.current++, from: "bot", error: true, retry: text, text: "Sorry, I couldn't reach the server.", at: now() }]);
    } finally {
      setLoading(false);
    }
  };

  const send = (raw = input) => {
    const text = raw.trim();
    if (!text || loading) return;
    setMessages((m) => [...m, { id: idRef.current++, from: "user", text, at: now() }]);
    setInput("");
    ask(text);
  };

  const retry = (msg) => {
    if (loading) return;
    setMessages((m) => m.filter((x) => x.id !== msg.id));
    ask(msg.retry);
  };

  const restart = () => {
    setMessages(freshConversation());
    setInput("");
    inputRef.current?.focus();
  };

  const onKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  };

  const panelMotion = reduced
    ? {}
    : {
        initial: { opacity: 0, y: 16, scale: 0.97 },
        animate: { opacity: 1, y: 0, scale: 1 },
        exit: { opacity: 0, y: 12, scale: 0.97 },
        transition: { duration: 0.22, ease: [0.16, 1, 0.3, 1] },
      };

  return (
    <>
      <AnimatePresence>
        {open && (
          <motion.section className="cb-window" role="dialog" aria-label="Zero Waste Assistant" {...panelMotion}>
            <header className="cb-header">
              <span className="cb-avatar cb-avatar-lg">
                <LogoZeroWasteMark size={22} />
                <i className="cb-online" />
              </span>
              <div className="cb-title">
                <strong>Zero Waste Assistant</strong>
                <span>Online · replies instantly</span>
              </div>
              <button type="button" className="cb-head-btn" onClick={restart} aria-label="Start a new conversation" title="New conversation">
                <RotateCcw size={16} />
              </button>
              <button type="button" className="cb-head-btn" onClick={() => setOpen(false)} aria-label="Close chat" title="Close">
                <X size={18} />
              </button>
            </header>

            <div className="cb-body" ref={bodyRef} aria-live="polite">
              <div className="cb-day">Today</div>
              {messages.map((m) => (
                <div key={m.id} className={`cb-row cb-${m.from}`}>
                  {m.from === "bot" && (
                    <span className="cb-avatar"><LogoZeroWasteMark size={15} /></span>
                  )}
                  <div className="cb-stack">
                    <div className={m.error ? "cb-bubble cb-error" : "cb-bubble"}>
                      {m.text}
                      {m.error && (
                        <button type="button" className="cb-retry" onClick={() => retry(m)}>
                          <RefreshCw size={12} /> Try again
                        </button>
                      )}
                    </div>
                    <time className="cb-time">{timeOf(m.at)}</time>
                  </div>
                </div>
              ))}

              {loading && (
                <div className="cb-row cb-bot">
                  <span className="cb-avatar"><LogoZeroWasteMark size={15} /></span>
                  <div className="cb-bubble cb-typing" aria-label="Assistant is typing">
                    <i /><i /><i />
                  </div>
                </div>
              )}

              {onlyGreeting && !loading && (
                <div className="cb-suggest">
                  <span><Sparkles size={12} /> Try asking</span>
                  {suggestions.map((s) => (
                    <button key={s} type="button" onClick={() => send(s)}>{s}</button>
                  ))}
                </div>
              )}
            </div>

            <form
              className="cb-composer"
              onSubmit={(e) => {
                e.preventDefault();
                send();
              }}
            >
              <div className="cb-input">
                <textarea
                  ref={inputRef}
                  rows={1}
                  value={input}
                  placeholder="Ask a question…"
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={onKeyDown}
                  aria-label="Message"
                />
                <button type="submit" className="cb-send" disabled={!input.trim() || loading} aria-label="Send message">
                  <SendHorizontal size={17} />
                </button>
              </div>
              <span className="cb-foot">Enter to send · Shift + Enter for a new line</span>
            </form>
          </motion.section>
        )}
      </AnimatePresence>

      <button
        type="button"
        className={open ? "cb-fab open" : "cb-fab"}
        onClick={() => setOpen((o) => !o)}
        aria-label={open ? "Close chat" : "Open chat"}
        aria-expanded={open}
      >
        <span className="cb-fab-icon cb-fab-chat"><MessageCircle size={24} /></span>
        <span className="cb-fab-icon cb-fab-close"><X size={22} /></span>
      </button>
    </>
  );
}
