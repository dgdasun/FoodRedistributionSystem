import React from "react";
import { NavLink } from "react-router-dom";
import { useAuth } from "../AuthContext.jsx";
import { bottomNavItemsFor } from "../nav.js";

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
 * doesn't, or miss one it does.
 */
export default function BottomNav() {
  const { user } = useAuth();
  const items = bottomNavItemsFor(user);
  if (!user || items.length === 0) return null;

  return (
    <nav className="bottom-nav" aria-label="Primary">
      {items.map(({ to, label, short, Icon }) => (
        <NavLink
          key={to}
          to={to}
          // `end` on the dashboard only, so /admin/users doesn't light up
          // Dashboard as well as its own tab.
          end={to === "/dashboard"}
          className={({ isActive }) => (isActive ? "bottom-nav-item active" : "bottom-nav-item")}
          aria-label={label}
        >
          <Icon size={21} />
          <span>{short || label}</span>
        </NavLink>
      ))}
    </nav>
  );
}
