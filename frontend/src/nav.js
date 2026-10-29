import { BrainCircuit, CalendarClock } from "lucide-react";
import {
  IconDashboard,
  IconDonations,
  IconImpact,
  IconTruck,
  IconUser,
  IconSettings,
  IconFoodPlate,
  IconInbox,
  IconTicket,
  IconShieldCheck,
  IconStatPeople,
  IconReport,
} from "./components/Icons.jsx";

/**
 * The one definition of "what can this role reach".
 *
 * Lives outside Sidebar.jsx because the mobile bottom bar renders the same
 * destinations; keeping two copies is how a route ends up reachable on desktop
 * but missing on a phone.
 */
export const NAV_BY_ROLE = {
  donor: [
    { to: "/dashboard", label: "Dashboard", short: "Home", Icon: IconDashboard },
    { to: "/donations", label: "My Donations", short: "Donations", Icon: IconDonations },
    { to: "/requests", label: "Food Requests", short: "Requests", Icon: IconInbox },
    { to: "/pickups", label: "Pickup History", short: "History", Icon: IconTruck },
    // Sidebar only: the phone bar keeps its five tabs, and the dashboard card links here.
    { to: "/forecast", label: "Food Forecast", short: "Forecast", Icon: CalendarClock, mobileTab: false },
    { to: "/impact", label: "Impact", short: "Impact", Icon: IconImpact },
    { to: "/profile", label: "Profile", short: "Profile", Icon: IconUser },
  ],
  beneficiary: [
    { to: "/dashboard", label: "Dashboard", short: "Home", Icon: IconDashboard },
    { to: "/browse", label: "Available Food", short: "Browse", Icon: IconFoodPlate },
    { to: "/my-requests", label: "My Requests", short: "Requests", Icon: IconInbox },
    { to: "/tickets", label: "My Tickets", short: "Tickets", Icon: IconTicket },
    { to: "/impact", label: "Impact", short: "Impact", Icon: IconImpact },
    { to: "/profile", label: "Profile", short: "Profile", Icon: IconUser },
  ],
  farm: [
    { to: "/dashboard", label: "Dashboard", short: "Home", Icon: IconDashboard },
    { to: "/browse", label: "Expired Food", short: "Browse", Icon: IconFoodPlate },
    { to: "/my-requests", label: "My Requests", short: "Requests", Icon: IconInbox },
    { to: "/tickets", label: "My Tickets", short: "Tickets", Icon: IconTicket },
    { to: "/impact", label: "Impact", short: "Impact", Icon: IconImpact },
    { to: "/profile", label: "Profile", short: "Profile", Icon: IconUser },
  ],
  admin: [
    { to: "/dashboard", label: "Dashboard", short: "Home", Icon: IconDashboard },
    { to: "/admin/users", label: "Users", short: "Users", Icon: IconStatPeople },
    { to: "/admin/beneficiaries", label: "Verifications", short: "Verify", Icon: IconShieldCheck },
    { to: "/admin/reports", label: "Generate Reports", short: "Reports", Icon: IconReport },
    { to: "/admin/settings", label: "Settings", short: "Settings", Icon: IconSettings },
    { to: "/admin/ai-insights", label: "AI Insights", short: "Insights", Icon: BrainCircuit },
  ],
};

/** Routes a beneficiary/farm account can only reach once an admin verifies it. */
export const VERIFIED_ONLY_PATHS = new Set(["/my-requests", "/tickets"]);

/** The destinations this user may actually open, in sidebar order. */
export function navItemsFor(user) {
  const items = NAV_BY_ROLE[user?.role] || [];
  const needsVerification = (user?.role === "beneficiary" || user?.role === "farm") && !user?.verified;
  return needsVerification ? items.filter((item) => !VERIFIED_ONLY_PATHS.has(item.to)) : items;
}

/**
 * Splits the destinations for the mobile bar: four tabs from the top of the
 * sidebar order, and everything else (Profile included - the topbar avatar
 * also opens it) behind a fifth "More" tab. Past five tabs the targets get too
 * narrow to hit, and the sidebar is hidden on phones, so whatever isn't a tab
 * must be in `more` or it becomes unreachable.
 */
export function bottomNavItemsFor(user) {
  const items = navItemsFor(user);
  const tabs = items.filter((i) => i.mobileTab !== false && i.to !== "/profile").slice(0, 4);
  const more = items.filter((i) => !tabs.includes(i));
  return { tabs, more };
}
