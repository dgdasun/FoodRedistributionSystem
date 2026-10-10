import React, { useState, useRef, useEffect } from "react";
import { api } from "../api.js";

export default function Chatbot() {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState([
    { from: "bot", text: "Hi! I'm the Zero Waste assistant. Ask me about donating, requesting food, tickets, or your impact stats." },
  ]);
  const [loading, setLoading] = useState(false);
  const bodyRef = useRef(null);

  useEffect(() => {
    if (bodyRef.current) bodyRef.current.scrollTop = bodyRef.current.scrollHeight;
  }, [messages, open]);

  const send = async () => {
    const text = input.trim();
    if (!text || loading) return;
    setMessages((m) => [...m, { from: "user", text }]);
    setInput("");
    setLoading(true);
    try {
      const { reply } = await api.post("/chatbot", { message: text });
      setMessages((m) => [...m, { from: "bot", text: reply }]);
    } catch {
      setMessages((m) => [...m, { from: "bot", text: "Sorry, I couldn't reach the server. Please try again." }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {open && (
        <div className="chat-window">
          <div className="chat-header">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
            </svg>
            <span>Zero Waste Assistant</span>
          </div>
          <div className="chat-body" ref={bodyRef}>
            {messages.map((m, i) => (
              <div key={i} className={`chat-msg ${m.from}`}>
                {m.text}
              </div>
            ))}
          </div>
          <div className="chat-input-row">
            <input
              value={input}
              placeholder="Type a question..."
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && send()}
            />
            <button onClick={send}>Send</button>
          </div>
        </div>
      )}
      <button className="chat-fab" onClick={() => setOpen((o) => !o)} aria-label="Open Chatbot">
        {open ? (
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="18" y1="6" x2="6" y2="18"></line>
            <line x1="6" y1="6" x2="18" y2="18"></line>
          </svg>
        ) : (
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
          </svg>
        )}
      </button>
    </>
  );
}
