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
    { to: "/impact", label: "AI Insights", short: "Insights", Icon: IconImpact },
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
 * At most five tabs for the mobile bar - past that the targets get too narrow
 * to hit reliably. Profile is pinned to the last slot when the role has one,
 * because "my account" is where people expect the right-hand tab to go; the
 * remaining slots are filled from the top of the sidebar order.
 */
export function bottomNavItemsFor(user) {
  const items = navItemsFor(user);
  if (items.length <= 5) return items;

  const profile = items.find((i) => i.to === "/profile");
  if (!profile) return items.slice(0, 5);
  return [...items.filter((i) => i.to !== "/profile").slice(0, 4), profile];
}
