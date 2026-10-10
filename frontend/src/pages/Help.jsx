import React from "react";

const FAQS = [
  { q: "How do I publish surplus food?", a: 'Go to "My Donations", upload a CSV or add an item manually, then click "Publish" once it\'s flagged as surplus.' },
  { q: "How does the AI decide who gets the food?", a: "The AI priority engine scores each pending request using urgency, distance from the collection point, organization size, handling capacity and recent allocation history." },
  { q: "How do I collect an approved item?", a: "You'll receive a collection ticket with a unique QR code. Show it at pickup — the donor verifies and marks it collected." },
  { q: "How do NGOs get verified?", a: "After registering, an administrator reviews your organization details and approves or rejects the account under Verifications." },
  { q: "What happens to expired food?", a: "Items past their expiry date are automatically redirected to registered farms/composting facilities instead of human consumption listings." },
];

export default function Help() {
  return (
    <>
      <div className="page-header">
        <h1>Help &amp; Support</h1>
        <p>Frequently asked questions — or use the chat assistant in the bottom-right corner.</p>
      </div>
      <div className="card">
        {FAQS.map((f, i) => (
          <div key={i} style={{ padding: "14px 0", borderBottom: i < FAQS.length - 1 ? "1px solid var(--border)" : "none" }}>
            <strong style={{ fontSize: 14 }}>{f.q}</strong>
            <p style={{ margin: "6px 0 0", fontSize: 13.5, color: "var(--text-mid)" }}>{f.a}</p>
          </div>
        ))}
      </div>
    </>
  );
}
