import React, { useEffect, useState } from "react";
import { NavLink, useLocation, useNavigate } from "react-router-dom";
import { MoreHorizontal } from "lucide-react";
import { useAuth } from "../AuthContext.jsx";
import { bottomNavItemsFor } from "../nav.js";
import { IconHelp, IconLogout, IconScan } from "./Icons.jsx";

/**
 * Phone-width tab bar.
 *
 * Replaces the collapsed 62px icon rail on narrow screens: the rail kept
 * navigation reachable but unlabelled, and ate horizontal space on exactly the
 * viewports with least to spare. CSS decides which of the two is visible (see
 * the `.bottom-nav` / `.sidebar` rules) - both are always rendered, so there is
 * no resize listener and no layout flash on rotate.
 *
 * Destinations come from nav.js, so this can never offer a route the sidebar
 * doesn't, or miss one it does. The sidebar is hidden on phones, so the "More"
 * sheet also carries its extras - the QR scanner, Help and Logout.
 */
export default function BottomNav() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const [open, setOpen] = useState(false);

  // Any navigation (a sheet link, the back button) closes the sheet.
  useEffect(() => setOpen(false), [pathname]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e) => e.key === "Escape" && setOpen(false);
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  if (!user) return null;
  const { tabs, more } = bottomNavItemsFor(user);

  const extras = [
    // On a phone the scanner opens in-tab; the desktop sidebar uses a pop-up.
    ...(user.role === "donor" ? [{ to: "/scan", label: "Scan QR Code", Icon: IconScan }] : []),
    ...more,
    // Help is for the people using the platform, not the admins running it.
    ...(user.role !== "admin" ? [{ to: "/help", label: "Help & Support", Icon: IconHelp }] : []),
  ];
  const moreActive = extras.some((i) => pathname === i.to);

  const handleLogout = () => {
    setOpen(false);
    logout();
    navigate("/login", { replace: true });
  };

  return (
    <>
      {open && (
        <div className="more-backdrop" onClick={() => setOpen(false)}>
          <div
            id="more-sheet"
            className="more-sheet"
            role="dialog"
            aria-modal="true"
            aria-label="More"
            onClick={(e) => e.stopPropagation()}
          >
            <span className="more-handle" aria-hidden="true" />
            <ul className="more-list">
              {extras.map(({ to, label, Icon }) => (
                <li key={to}>
                  <NavLink to={to} className={({ isActive }) => (isActive ? "more-item active" : "more-item")}>
                    <span className="more-ico">
                      <Icon size={19} color="currentColor" />
                    </span>
                    {label}
                  </NavLink>
                </li>
              ))}
            </ul>
            <button type="button" className="nav-logout more-logout" onClick={handleLogout}>
              <IconLogout size={18} />
              <span>Logout</span>
            </button>
          </div>
        </div>
      )}

      <nav className="bottom-nav" aria-label="Primary">
        {tabs.map(({ to, label, short, Icon }) => (
          <NavLink
            key={to}
            to={to}
            // `end` on the dashboard only, so /admin/users doesn't light up
            // Dashboard as well as its own tab.
            end={to === "/dashboard"}
            className={({ isActive }) => (isActive ? "bottom-nav-item active" : "bottom-nav-item")}
            aria-label={label}
          >
            <Icon size={21} color="currentColor" />
            <span>{short || label}</span>
          </NavLink>
        ))}
        <button
          type="button"
          className={open || moreActive ? "bottom-nav-item active" : "bottom-nav-item"}
          onClick={() => setOpen((o) => !o)}
          aria-expanded={open}
          aria-controls="more-sheet"
        >
          <MoreHorizontal size={21} />
          <span>More</span>
        </button>
      </nav>
    </>
  );
}
