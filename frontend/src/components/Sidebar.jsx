import React, { useEffect, useState } from "react";
import { NavLink } from "react-router-dom";
import { useAuth } from "../AuthContext.jsx";
import { navItemsFor } from "../nav.js";
import { useTheme } from "../ThemeContext.jsx";
import {
  BrandWordmark,
  IconHelp,
  IconLogout,
  IconScan,
  GraphicSidebarSalad,
} from "./Icons.jsx";

export default function Sidebar() {
  const { user, logout } = useAuth();
  const { isDark } = useTheme();
  const items = navItemsFor(user);
  const [toastMsg, setToastMsg] = useState("");

  useEffect(() => {
    const handler = (e) => {
      if (e.origin !== window.location.origin || e.data?.type !== "zerowaste-scan-completed") return;
      setToastMsg(`Pickup confirmed for "${e.data.item?.name || "item"}" — status: Collected.`);
      setTimeout(() => window.location.reload(), 1200);
    };
    window.addEventListener("message", handler);
    return () => window.removeEventListener("message", handler);
  }, []);

  const openScanner = () => {
    const popup = window.open("/scan", "zerowaste-scan-qr", "width=440,height=740");
    if (!popup) {
      setToastMsg("Please allow pop-ups for this site to use the QR scanner.");
      setTimeout(() => setToastMsg(""), 3000);
    }
  };

  return (
    <div className="sidebar">
      <div className="brand brand-stacked">
        <BrandWordmark size={26} variant={isDark ? "dark" : "light"} />
        <span className="brand-tagline">Smart Food Redistribution</span>
      </div>

      <ul className="nav-list">
        {items.map((item) => {
          const ItemIcon = item.Icon;
          return (
            <React.Fragment key={item.to}>
              <li>
                <NavLink
                  to={item.to}
                  className={({ isActive }) => "nav-item" + (isActive ? " active" : "")}
                >
                  <span className="ico">
                    <ItemIcon size={19} color="currentColor" />
                  </span>
                  <span className="nav-label">{item.label}</span>
                </NavLink>
              </li>
              {/* The scanner opens a pop-up rather than a route, so it sits beside Pickup History here instead of in nav.js. */}
              {item.to === "/pickups" && user?.role === "donor" && (
                <li>
                  <button className="nav-item" onClick={openScanner}>
                    <span className="ico">
                      <IconScan size={19} />
                    </span>
                    <span className="nav-label">Scan QR Code</span>
                  </button>
                </li>
              )}
            </React.Fragment>
          );
        })}
        <li>
          <NavLink to="/help" className={({ isActive }) => "nav-item" + (isActive ? " active" : "")}>
            <span className="ico">
              <IconHelp size={19} />
            </span>
            <span className="nav-label">Help &amp; Support</span>
          </NavLink>
        </li>
        <li>
          <button
            className="nav-item nav-logout"
            onClick={logout}
          >
            <span className="ico">
              <IconLogout size={19} />
            </span>
            <span className="nav-label">Logout</span>
          </button>
        </li>
      </ul>

      <div className="sidebar-illustration">
        <GraphicSidebarSalad />
      </div>

      {toastMsg && (
        <div
          style={{
            position: "fixed", top: 18, right: 18, zIndex: 70,
            background: "var(--surface)", border: "1px solid var(--primary-light)", borderRadius: 10,
            padding: "10px 16px", fontSize: 13, fontWeight: 600, color: "var(--status-ok-fg)",
            boxShadow: "0 8px 24px rgba(12,40,4,0.12)",
          }}
        >
          ✅ {toastMsg}
        </div>
      )}
    </div>
  );
}
