import React from "react";

// Official Zero Waste Logo / Mark (Circular recycling mark or logo)
export function LogoZeroWasteMark({ size = 36, className = "" }) {
  return (
    <img
      src="/favicon.png"
      alt="Zero Waste Mark"
      width={size}
      height={size}
      className={`logo-zero-waste-mark ${className}`}
      style={{
        width: `${size}px`,
        height: `${size}px`,
        objectFit: "contain",
        display: "inline-block",
        verticalAlign: "middle",
      }}
    />
  );
}

// Full official Zero Waste logo lockup
export function BrandWordmark({ size = 36, variant = "light", className = "", height }) {
  const h = height || (typeof size === "number" ? Math.round(size * 1.35) : size);
  const src = variant === "dark" ? "/logo-white.png" : "/logo.png";
  return (
    <div className={`brand-wordmark-container brand-wordmark-${variant} ${className}`}>
      <img
        src={src}
        alt="Zero Waste"
        className="brand-wordmark-img"
        style={{
          height: `${h}px`,
          width: "auto",
          maxWidth: "100%",
          objectFit: "contain",
          display: "block",
        }}
      />
    </div>
  );
}

// Solid Green Leaves (Dashboard)
export function IconDashboard({ size = 20, color = "currentColor", className = "" }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
      <path
        d="M3 18C4.5 11 10 7 19 6C19 15 15 20.5 8 22C6.5 22.3 4.5 20.5 3 18Z"
        fill={color}
      />
      <path
        d="M19 6C14 11 9 15 3 18"
        stroke="#ffffff"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      <path
        d="M13 14C11.5 8.5 15 4 21 3C21 9 18 13.5 13 14Z"
        fill={color}
        opacity="0.8"
      />
    </svg>
  );
}

// Box / Basket with leafy sprig (My Donations)
export function IconDonations({ size = 20, color = "currentColor", className = "" }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
      <path
        d="M4 10H20V20C20 20.6 19.6 21 19 21H5C4.4 21 4 20.6 4 20V10Z"
        stroke={color}
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M2 10L4 6H20L22 10H2Z"
        stroke={color}
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M12 10V21"
        stroke={color}
        strokeWidth="1.8"
        strokeLinecap="round"
      />
      <path
        d="M12 6C10.5 3.5 8 3 8 3C8 3 8.5 5.5 11 6"
        stroke={color}
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M12 6C13.5 3.5 16 3 16 3C16 3 15.5 5.5 13 6"
        stroke={color}
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

// Sprout / Leaf contour (Impact)
export function IconImpact({ size = 20, color = "currentColor", className = "" }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
      <path
        d="M12 21V12"
        stroke={color}
        strokeWidth="1.8"
        strokeLinecap="round"
      />
      <path
        d="M12 12C12 7.5 15.5 4 20 4C20 8.5 16.5 12 12 12Z"
        stroke={color}
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M12 15C12 11.5 9 8.5 5 8.5C5 12 8 15 12 15Z"
        stroke={color}
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M3 21C6 21 18 21 21 21"
        stroke={color}
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </svg>
  );
}

// Delivery Truck (Pickup History)
export function IconTruck({ size = 20, color = "currentColor", className = "" }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
      <path
        d="M1 4H14C14.6 4 15 4.4 15 5V17H1V4Z"
        stroke={color}
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M15 8H19.5L23 12.5V17H15V8Z"
        stroke={color}
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="6" cy="18" r="2.5" stroke={color} strokeWidth="1.8" fill="none" />
      <circle cx="18" cy="18" r="2.5" stroke={color} strokeWidth="1.8" fill="none" />
      <path d="M8.5 17H15.5" stroke={color} strokeWidth="1.8" strokeLinecap="round" />
      <path d="M1 17H3.5" stroke={color} strokeWidth="1.8" strokeLinecap="round" />
      <path d="M20.5 17H23" stroke={color} strokeWidth="1.8" strokeLinecap="round" />
      <path d="M7 10C8.5 8.5 11 8.5 11 8.5C11 8.5 11 11 9.5 12.5" stroke={color} strokeWidth="1.2" strokeLinecap="round" />
    </svg>
  );
}

// User / Person avatar outline (Profile)
export function IconUser({ size = 20, color = "currentColor", className = "" }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
      <circle cx="12" cy="7" r="4.5" stroke={color} strokeWidth="1.8" strokeLinecap="round" />
      <path
        d="M4 20.5C4 16.5 7.5 14.5 12 14.5C16.5 14.5 20 16.5 20 20.5"
        stroke={color}
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </svg>
  );
}

// Settings gear
export function IconSettings({ size = 20, color = "currentColor", className = "" }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
      <circle cx="12" cy="12" r="3.5" stroke={color} strokeWidth="1.8" />
      <path
        d="M12 2V4M12 20V22M4 12H2M22 12H20M6.3 6.3L4.9 4.9M19.1 19.1L17.7 17.7M6.3 17.7L4.9 19.1M19.1 4.9L17.7 6.3"
        stroke={color}
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </svg>
  );
}

// Help & Support question in circle
export function IconHelp({ size = 20, color = "currentColor", className = "" }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
      <circle cx="12" cy="12" r="9.5" stroke={color} strokeWidth="1.8" />
      <path
        d="M9.5 9.5C9.5 8 10.5 7 12 7C13.5 7 14.5 8 14.5 9.5C14.5 11 12.5 11.5 12.5 13.5"
        stroke={color}
        strokeWidth="1.8"
        strokeLinecap="round"
      />
      <circle cx="12.5" cy="16.5" r="1" fill={color} />
    </svg>
  );
}

// Logout door arrow
export function IconLogout({ size = 20, color = "currentColor", className = "" }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
      <path
        d="M9 21H4C3.4 21 3 20.6 3 20V4C3 3.4 3.4 3 4 3H9"
        stroke={color}
        strokeWidth="1.8"
        strokeLinecap="round"
      />
      <path
        d="M16 17L21 12L16 7"
        stroke={color}
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M21 12H9"
        stroke={color}
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </svg>
  );
}

// Browse food / plate cloche
export function IconFoodPlate({ size = 20, color = "currentColor", className = "" }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
      <path
        d="M3 17C3 12 7 8 12 8C17 8 21 12 21 17H3Z"
        stroke={color}
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path d="M2 20H22" stroke={color} strokeWidth="1.8" strokeLinecap="round" />
      <path d="M12 5V8" stroke={color} strokeWidth="1.8" strokeLinecap="round" />
      <circle cx="12" cy="4.5" r="1.5" fill={color} />
    </svg>
  );
}

// Requests / Inbox
export function IconInbox({ size = 20, color = "currentColor", className = "" }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
      <path
        d="M4 4H20V15H16L14 18H10L8 15H4V4Z"
        stroke={color}
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path d="M4 15V20H20V15" stroke={color} strokeWidth="1.8" strokeLinecap="round" />
      <path d="M12 7V12M12 12L9.5 9.5M12 12L14.5 9.5" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

// Ticket / Coupon
export function IconTicket({ size = 20, color = "currentColor", className = "" }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
      <path
        d="M3 8V6C3 5.4 3.4 5 4 5H20C20.6 5 21 5.4 21 6V8C19.5 8 18.5 9 18.5 10.5C18.5 12 19.5 13 21 13V18C21 18.6 20.6 19 20 19H4C3.4 19 3 18.6 3 18V13C4.5 13 5.5 12 5.5 10.5C5.5 9 4.5 8 3 8Z"
        stroke={color}
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path d="M12 8V16" stroke={color} strokeWidth="1.5" strokeDasharray="2 2" strokeLinecap="round" />
    </svg>
  );
}

// QR scan viewfinder
export function IconScan({ size = 20, color = "currentColor", className = "" }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
      <path d="M4 8V6C4 4.9 4.9 4 6 4H8" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M16 4H18C19.1 4 20 4.9 20 6V8" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M20 16V18C20 19.1 19.1 20 18 20H16" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M8 20H6C4.9 20 4 19.1 4 18V16" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      <rect x="8" y="8" width="8" height="8" rx="1" stroke={color} strokeWidth="1.8" />
    </svg>
  );
}

// Shield Check / Verification
export function IconShieldCheck({ size = 20, color = "currentColor", className = "" }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
      <path
        d="M12 3L4 6.5V12C4 17 7.5 21.5 12 22.5C16.5 21.5 20 17 20 12V6.5L12 3Z"
        stroke={color}
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M8.5 12L11 14.5L15.5 10"
        stroke={color}
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

// Bar-chart report icon
export function IconReport({ size = 20, color = "currentColor", className = "" }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
      <rect x="3.5" y="3.5" width="17" height="17" rx="3" stroke={color} strokeWidth="1.8" />
      <path d="M8 16V11" stroke={color} strokeWidth="1.8" strokeLinecap="round" />
      <path d="M12 16V8" stroke={color} strokeWidth="1.8" strokeLinecap="round" />
      <path d="M16 16V13" stroke={color} strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

// Bell notification icon
export function IconBell({ size = 20, color = "currentColor", className = "" }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
      <path
        d="M18 16V11C18 7.7 15.3 5 12 5C8.7 5 6 7.7 6 11V16L4 18H20L18 16Z"
        stroke={color}
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M10 19C10 20.1 10.9 21 12 21C13.1 21 14 20.1 14 19"
        stroke={color}
        strokeWidth="1.8"
        strokeLinecap="round"
      />
      <circle cx="12" cy="4" r="1.5" fill={color} />
    </svg>
  );
}

// Small Leaf Title Bullet
export function IconLeafBullet({ size = 18, color = "var(--primary)", className = "" }) {
  return (
    <svg width={size} height={size} viewBox="0 0 20 20" fill="none" className={className} style={{ display: "inline-block", verticalAlign: "middle" }}>
      <path
        d="M2.5 16C4 9.5 9 5.5 17 4.5C17 12.5 13 17.5 6.5 19C5 19.3 3.5 18 2.5 16Z"
        fill={color}
      />
      <path
        d="M17 4.5C12 9 8 13 2.5 16"
        stroke="#ffffff"
        strokeWidth="1.2"
        strokeLinecap="round"
      />
    </svg>
  );
}

// Single Floating Leaf
export function IconFloatingLeaf({ size = 22, color = "var(--accent)", className = "" }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className} style={{ display: "inline-block", verticalAlign: "middle" }}>
      <path
        d="M4 19C5.5 12 11 7.5 20 6C20 15 15.5 20.5 8.5 22C7 22.3 5 21 4 19Z"
        fill={color}
      />
      <path
        d="M20 6C14.5 11 9.5 15 4 19"
        stroke="#ffffff"
        strokeWidth="1.4"
        strokeLinecap="round"
      />
    </svg>
  );
}

// Stat Card 1: Store / Supermarket with box
export function IconStatStore({ size = 32, color = "var(--primary)", className = "" }) {
  return (
    <svg width={size} height={size} viewBox="0 0 36 36" fill="none" className={className}>
      <rect x="4" y="14" width="16" height="16" rx="2" fill="var(--icon-chip)" stroke={color} strokeWidth="2" />
      <path d="M4 14L8 6H16L20 14" fill="var(--icon-chip)" stroke={color} strokeWidth="2" strokeLinejoin="round" />
      <path d="M10 22H14V30H10V22Z" fill={color} />
      <rect x="22" y="18" width="10" height="12" rx="1.5" fill="var(--icon-chip)" stroke={color} strokeWidth="2" />
      <path d="M25 15C25 15 25.5 13 27 13C28.5 13 29 15 29 15" stroke={color} strokeWidth="1.8" strokeLinecap="round" />
      <circle cx="27" cy="22" r="1.5" fill={color} />
    </svg>
  );
}

// Stat Card 2: Salad Bowl with Leaves
export function IconStatBowl({ size = 32, color = "var(--primary)", className = "" }) {
  return (
    <svg width={size} height={size} viewBox="0 0 36 36" fill="none" className={className}>
      <path
        d="M6 18C6 26 11 30 18 30C25 30 30 26 30 18H6Z"
        fill={color}
      />
      <path
        d="M18 18C18 11 13 7 8 8C8 14 12 18 18 18Z"
        fill="#B5D686"
      />
      <path
        d="M18 18C18 11 23 7 28 8C28 14 24 18 18 18Z"
        fill="#85B840"
      />
      <circle cx="18" cy="11" r="3" fill="#559805" />
    </svg>
  );
}

// Stat Card 3: Group of People
export function IconStatPeople({ size = 32, color = "var(--primary)", className = "" }) {
  return (
    <svg width={size} height={size} viewBox="0 0 36 36" fill="none" className={className}>
      <circle cx="18" cy="11" r="4.5" fill={color} />
      <path
        d="M10 28C10 23.5 13.5 20 18 20C22.5 20 26 23.5 26 28"
        fill={color}
      />
      <circle cx="9" cy="13" r="3.5" fill={color} opacity="0.75" />
      <path
        d="M4 27C4 23.5 6.5 21 9.5 21"
        stroke={color}
        strokeWidth="3.5"
        strokeLinecap="round"
        opacity="0.75"
      />
      <circle cx="27" cy="13" r="3.5" fill={color} opacity="0.75" />
      <path
        d="M32 27C32 23.5 29.5 21 26.5 21"
        stroke={color}
        strokeWidth="3.5"
        strokeLinecap="round"
        opacity="0.75"
      />
    </svg>
  );
}

// Stat Card 4: CO2 Saved Leaf in Circle
export function IconStatCO2({ size = 32, color = "var(--primary)", className = "" }) {
  return (
    <svg width={size} height={size} viewBox="0 0 36 36" fill="none" className={className}>
      <circle cx="18" cy="18" r="14" stroke={color} strokeWidth="2.5" fill="none" />
      <path
        d="M12 24C13.5 17 18 13.5 25 12C25 19 21.5 23.5 15.5 25C14 25.3 12.5 24.5 12 24Z"
        fill={color}
      />
      <path
        d="M25 12C20.5 16 16.5 20 12 24"
        stroke="#ffffff"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  );
}

// Meals Provided Fork and Knife
export function IconForkKnife({ size = 18, color = "var(--primary)", className = "" }) {
  return (
    <svg width={size} height={size} viewBox="0 0 20 20" fill="none" className={className}>
      <path d="M5 3V9C5 10.5 6 11.5 7.5 11.5V18" stroke={color} strokeWidth="1.8" strokeLinecap="round" />
      <path d="M5 3V7" stroke={color} strokeWidth="1.8" strokeLinecap="round" />
      <path d="M10 3V9C10 10.5 9 11.5 7.5 11.5" stroke={color} strokeWidth="1.8" strokeLinecap="round" />
      <path d="M7.5 3V9" stroke={color} strokeWidth="1.8" strokeLinecap="round" />
      <path d="M15 3C13.5 3 13 5 13 8V11.5H15V18" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

// Waste Diverted Trash / Recycling Can
export function IconTrashCan({ size = 18, color = "var(--primary)", className = "" }) {
  return (
    <svg width={size} height={size} viewBox="0 0 20 20" fill="none" className={className}>
      <path d="M4 6H16V16C16 16.6 15.6 17 15 17H5C4.4 17 4 16.6 4 16V6Z" stroke={color} strokeWidth="1.8" strokeLinejoin="round" />
      <path d="M2 6H18" stroke={color} strokeWidth="1.8" strokeLinecap="round" />
      <path d="M7 6V4C7 3.4 7.4 3 8 3H12C12.6 3 13 3.4 13 4V6" stroke={color} strokeWidth="1.8" />
      <path d="M8 9V14M12 9V14" stroke={color} strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

// Communities Helped People Icon
export function IconCommunity({ size = 18, color = "var(--primary)", className = "" }) {
  return (
    <svg width={size} height={size} viewBox="0 0 20 20" fill="none" className={className}>
      <circle cx="10" cy="6.5" r="2.8" fill={color} />
      <path d="M5 16C5 13 7.5 11.5 10 11.5C12.5 11.5 15 13 15 16" stroke={color} strokeWidth="1.8" strokeLinecap="round" />
      <circle cx="4.5" cy="8" r="2" fill={color} opacity="0.7" />
      <circle cx="15.5" cy="8" r="2" fill={color} opacity="0.7" />
    </svg>
  );
}

// How It Works Step 1: Storefront
export function IconStepStore({ size = 26, color = "var(--primary)", className = "" }) {
  return (
    <svg width={size} height={size} viewBox="0 0 28 28" fill="none" className={className}>
      <path d="M3 11L5 4H23L25 11" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M3 11C3 12.5 4.5 13.5 6 13.5C7.5 13.5 9 12.5 9 11C9 12.5 10.5 13.5 12 13.5C13.5 13.5 15 12.5 15 11C15 12.5 16.5 13.5 18 13.5C19.5 13.5 21 12.5 21 11C21 12.5 22.5 13.5 24 13.5C25.5 13.5 25.5 12.5 25.5 11" stroke={color} strokeWidth="1.8" strokeLinecap="round" />
      <path d="M5 13.5V23H23V13.5" stroke={color} strokeWidth="2" strokeLinejoin="round" />
      <path d="M11 18H17V23H11V18Z" stroke={color} strokeWidth="1.8" fill="var(--icon-chip)" />
    </svg>
  );
}

// How It Works Step 2: Donation Box with Leaf
export function IconStepCollect({ size = 26, color = "var(--primary)", className = "" }) {
  return (
    <svg width={size} height={size} viewBox="0 0 28 28" fill="none" className={className}>
      <path d="M4 12H24V23C24 23.6 23.6 24 23 24H5C4.4 24 4 23.6 4 23V12Z" stroke={color} strokeWidth="2" strokeLinejoin="round" />
      <path d="M2 12L4 7H24L26 12H2Z" stroke={color} strokeWidth="2" strokeLinejoin="round" />
      <path d="M14 12V24" stroke={color} strokeWidth="1.8" />
      <path d="M14 7C14 4 17 3 17 3C17 3 17 6 14 7Z" fill={color} />
      <path d="M14 7C14 4 11 3 11 3C11 3 11 6 14 7Z" fill={color} />
    </svg>
  );
}

// How It Works Step 3: Distribute People
export function IconStepDistribute({ size = 26, color = "var(--primary)", className = "" }) {
  return (
    <svg width={size} height={size} viewBox="0 0 28 28" fill="none" className={className}>
      <circle cx="14" cy="8" r="3.5" fill={color} />
      <path d="M7 23C7 18.5 10 16 14 16C18 16 21 18.5 21 23" fill={color} />
      <circle cx="6" cy="11" r="2.8" fill={color} opacity="0.75" />
      <circle cx="22" cy="11" r="2.8" fill={color} opacity="0.75" />
      <path d="M2 22C2 19 4 17.5 6.5 17.5" stroke={color} strokeWidth="2.5" strokeLinecap="round" opacity="0.75" />
      <path d="M26 22C26 19 24 17.5 21.5 17.5" stroke={color} strokeWidth="2.5" strokeLinecap="round" opacity="0.75" />
    </svg>
  );
}

// How It Works Step 4: Heart in Hands / Lives Impacted
export function IconStepHeart({ size = 26, color = "var(--primary)", className = "" }) {
  return (
    <svg width={size} height={size} viewBox="0 0 28 28" fill="none" className={className}>
      <path
        d="M14 17C14 17 7 12 7 7C7 4.5 9 3 11.5 3C13 3 14 4 14 4C14 4 15 3 16.5 3C19 3 21 4.5 21 7C21 12 14 17 14 17Z"
        fill={color}
      />
      <path
        d="M4 22C6.5 19 10 19 14 21C18 19 21.5 19 24 22"
        stroke={color}
        strokeWidth="2.2"
        strokeLinecap="round"
      />
    </svg>
  );
}

// Clock Outline
export function IconClock({ size = 16, color = "currentColor", className = "" }) {
  return (
    <svg width={size} height={size} viewBox="0 0 20 20" fill="none" className={className} style={{ display: "inline-block", verticalAlign: "middle" }}>
      <circle cx="10" cy="10" r="8" stroke={color} strokeWidth="1.8" />
      <path d="M10 5.5V10L13.5 12" stroke={color} strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

// Map Pin Outline
export function IconMapPin({ size = 16, color = "currentColor", className = "" }) {
  return (
    <svg width={size} height={size} viewBox="0 0 20 20" fill="none" className={className} style={{ display: "inline-block", verticalAlign: "middle" }}>
      <path
        d="M10 18.5C10 18.5 16 13 16 8.5C16 5.2 13.3 2.5 10 2.5C6.7 2.5 4 5.2 4 8.5C4 13 10 18.5 10 18.5Z"
        stroke={color}
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="10" cy="8.5" r="2.5" stroke={color} strokeWidth="1.8" />
    </svg>
  );
}

// Green Eco Delivery Truck Graphic (Next Pickup Card)
export function GraphicEcoTruck({ className = "" }) {
  return (
    <svg width="150" height="90" viewBox="0 0 160 100" fill="none" className={className}>
      {/* Background Skyline Silhouette */}
      <rect x="20" y="30" width="18" height="50" fill="#EAF3DE" rx="2" />
      <rect x="42" y="20" width="22" height="60" fill="#DDECC9" rx="2" />
      <rect x="68" y="35" width="20" height="45" fill="#EAF3DE" rx="2" />
      <rect x="92" y="26" width="24" height="54" fill="#DDECC9" rx="2" />
      <rect x="120" y="40" width="18" height="40" fill="#EAF3DE" rx="2" />

      {/* Tree */}
      <circle cx="145" cy="62" r="16" fill="#84CC16" opacity="0.85" />
      <rect x="143" y="74" width="4" height="12" fill="#5E7B4B" rx="1" />

      {/* Road line */}
      <path d="M0 86H160" stroke="#D6CFC0" strokeWidth="2" strokeLinecap="round" />

      {/* Green Van Body */}
      <rect x="25" y="44" width="68" height="34" rx="4" fill="#387E01" />
      {/* Cab */}
      <path
        d="M93 54L105 54C108 54 111 57 113 60L117 66V78H93V54Z"
        fill="#559805"
      />
      {/* Cab Window */}
      <path
        d="M96 57H104C106 57 108 59 109 61L112 66H96V57Z"
        fill="#E0F2FE"
      />
      {/* Headlight */}
      <rect x="115" y="70" width="3" height="4" rx="1" fill="#FEF08A" />

      {/* Leaf Decal on Van */}
      <circle cx="59" cy="61" r="11" fill="#E8F2D8" />
      <path
        d="M54 65C55 60 58 57 63 56C63 61 60 64 56 66C55 66.2 54.2 65.5 54 65Z"
        fill="#559805"
      />

      {/* Wheels */}
      <circle cx="43" cy="80" r="7.5" fill="#262F1E" />
      <circle cx="43" cy="80" r="3.5" fill="#DFE7D5" />
      <circle cx="103" cy="80" r="7.5" fill="#262F1E" />
      <circle cx="103" cy="80" r="3.5" fill="#DFE7D5" />
    </svg>
  );
}

// Motivational Earth with Sprout
export function GraphicEarthSprout({ size = 52, className = "" }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" fill="none" className={className}>
      <circle cx="32" cy="38" r="20" fill="#B5D686" stroke="#387E01" strokeWidth="2.5" />
      <path
        d="M20 34C22 30 26 31 28 35C29 37 32 38 34 36C36 34 40 35 42 38C40 44 36 50 32 54C26 50 21 44 20 34Z"
        fill="#559805"
        opacity="0.8"
      />
      {/* Sprout atop globe */}
      <path
        d="M32 28V14"
        stroke="#387E01"
        strokeWidth="2.5"
        strokeLinecap="round"
      />
      <path
        d="M32 18C32 12 26 8 20 9C20 15 25 19 32 18Z"
        fill="#559805"
      />
      <path
        d="M32 15C32 9 38 5 44 6C44 12 39 16 32 15Z"
        fill="#559805"
      />
    </svg>
  );
}

// Bottom Left Sidebar Salad Bowl Illustration
export function GraphicSidebarSalad({ className = "" }) {
  return (
    <svg width="180" height="130" viewBox="0 0 180 130" fill="none" className={className}>
      {/* Background branch leaves */}
      <path
        d="M20 90C35 70 45 40 40 15"
        stroke="#D3E7BA"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <path
        d="M40 30C48 25 58 28 60 38C52 42 44 38 40 30Z"
        fill="#D3E7BA"
      />
      <path
        d="M30 60C38 55 48 58 50 68C42 72 34 68 30 60Z"
        fill="#D3E7BA"
      />

      {/* Floating Green Heart */}
      <path
        d="M90 35C90 35 76 23 76 13C76 7.5 80.5 3 86 3C88.5 3 90 4.5 90 4.5C90 4.5 91.5 3 94 3C99.5 3 104 7.5 104 13C104 23 90 35 90 35Z"
        fill="#559805"
      />

      {/* Veggies in Bowl */}
      {/* Lettuce / Greens */}
      <circle cx="70" cy="58" r="16" fill="#B5D686" />
      <circle cx="110" cy="58" r="16" fill="#85B840" />
      <circle cx="90" cy="52" r="18" fill="#559805" />
      {/* Carrot slices / Tomato */}
      <circle cx="65" cy="54" r="7" fill="#F97316" />
      <circle cx="115" cy="54" r="8" fill="#EF4444" />
      {/* Cucumber / Avocado */}
      <circle cx="85" cy="46" r="6" fill="#A3E635" />
      <circle cx="98" cy="48" r="5" fill="#FDE047" />
      {/* Mushroom */}
      <path d="M75 48C75 42 83 42 83 48H75Z" fill="#FDE68A" />

      {/* Green Salad Bowl */}
      <path
        d="M35 62C35 98 60 114 90 114C120 114 145 98 145 62H35Z"
        fill="#387E01"
      />
      {/* Bowl Rim Highlight */}
      <ellipse cx="90" cy="62" rx="55" ry="6" fill="#559805" />
      <ellipse cx="90" cy="62" rx="52" ry="4" fill="#559805" opacity="0.6" />
    </svg>
  );
}

// Upload Outline (CSV / file upload)
export function IconUpload({ size = 16, color = "currentColor", className = "" }) {
  return (
    <svg width={size} height={size} viewBox="0 0 20 20" fill="none" className={className} style={{ display: "inline-block", verticalAlign: "middle" }}>
      <path d="M10 13V3M10 3L6.5 6.5M10 3L13.5 6.5" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M3.5 13.5V15C3.5 15.8284 4.17157 16.5 5 16.5H15C15.8284 16.5 16.5 15.8284 16.5 15V13.5" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

// Camera Outline (Profile photo)
export function IconCamera({ size = 16, color = "currentColor", className = "" }) {
  return (
    <svg width={size} height={size} viewBox="0 0 20 20" fill="none" className={className} style={{ display: "inline-block", verticalAlign: "middle" }}>
      <path d="M3 7C3 6.17 3.67 5.5 4.5 5.5H6.25L7.5 3.5H12.5L13.75 5.5H15.5C16.33 5.5 17 6.17 17 7V15C17 15.83 16.33 16.5 15.5 16.5H4.5C3.67 16.5 3 15.83 3 15V7Z" stroke={color} strokeWidth="1.6" strokeLinejoin="round" />
      <circle cx="10" cy="10.75" r="3" stroke={color} strokeWidth="1.6" />
    </svg>
  );
}

// Trash Outline (Remove)
export function IconTrash({ size = 16, color = "currentColor", className = "" }) {
  return (
    <svg width={size} height={size} viewBox="0 0 20 20" fill="none" className={className} style={{ display: "inline-block", verticalAlign: "middle" }}>
      <path d="M3.5 5.5H16.5M8 5.5V4C8 3.45 8.45 3 9 3H11C11.55 3 12 3.45 12 4V5.5M5 5.5L5.75 16C5.79 16.56 6.26 17 6.82 17H13.18C13.74 17 14.21 16.56 14.25 16L15 5.5" stroke={color} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M8.5 9V13.5M11.5 9V13.5" stroke={color} strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}

// Plus Outline (Add Item)
export function IconPlus({ size = 16, color = "currentColor", className = "" }) {
  return (
    <svg width={size} height={size} viewBox="0 0 20 20" fill="none" className={className} style={{ display: "inline-block", verticalAlign: "middle" }}>
      <path d="M10 4V16M4 10H16" stroke={color} strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

// Document / File Outline (Verification documents)
export function IconDocument({ size = 16, color = "currentColor", className = "" }) {
  return (
    <svg width={size} height={size} viewBox="0 0 20 20" fill="none" className={className} style={{ display: "inline-block", verticalAlign: "middle" }}>
      <path d="M6 2.5H12L16 6.5V16.5C16 17.05 15.55 17.5 15 17.5H6C5.45 17.5 5 17.05 5 16.5V3.5C5 2.95 5.45 2.5 6 2.5Z" stroke={color} strokeWidth="1.6" strokeLinejoin="round" />
      <path d="M12 2.5V6.5H16" stroke={color} strokeWidth="1.6" strokeLinejoin="round" />
      <path d="M7.5 11H12.5M7.5 13.5H12.5" stroke={color} strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  );
}

// Eye Outline (View document)
export function IconEye({ size = 16, color = "currentColor", className = "" }) {
  return (
    <svg width={size} height={size} viewBox="0 0 20 20" fill="none" className={className} style={{ display: "inline-block", verticalAlign: "middle" }}>
      <path d="M1.5 10C3 6 6.5 3.5 10 3.5C13.5 3.5 17 6 18.5 10C17 14 13.5 16.5 10 16.5C6.5 16.5 3 14 1.5 10Z" stroke={color} strokeWidth="1.6" strokeLinejoin="round" />
      <circle cx="10" cy="10" r="2.75" stroke={color} strokeWidth="1.6" />
    </svg>
  );
}

// Milk Carton / Dairy & Perishables
export function IconMilkCarton({ size = 20, color = "currentColor", className = "" }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
      <path
        d="M7 4H17L18 8V21C18 21.6 17.6 22 17 22H7C6.4 22 6 21.6 6 21V8L7 4Z"
        stroke={color}
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path d="M6 8H18" stroke={color} strokeWidth="1.8" strokeLinecap="round" />
      <path d="M9 4L9 2.5C9 2 9.4 1.5 10 1.5H14C14.6 1.5 15 2 15 2.5V4" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M9.5 13C9.5 11 11 10.5 11 10.5C11 10.5 11 12 12.5 12.5" stroke={color} strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  );
}

// Sealed Box / Packaged & Dry Rations
export function IconPackageBox({ size = 20, color = "currentColor", className = "" }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
      <path
        d="M12 3L20.5 7.5V16.5L12 21L3.5 16.5V7.5L12 3Z"
        stroke={color}
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path d="M3.5 7.5L12 12L20.5 7.5" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M12 12V21" stroke={color} strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

// Globe / Global Fallback
export function IconGlobe({ size = 20, color = "currentColor", className = "" }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
      <circle cx="12" cy="12" r="9" stroke={color} strokeWidth="1.8" />
      <path d="M3 12H21" stroke={color} strokeWidth="1.8" strokeLinecap="round" />
      <path
        d="M12 3C14.5 5.5 15.8 8.6 15.8 12C15.8 15.4 14.5 18.5 12 21C9.5 18.5 8.2 15.4 8.2 12C8.2 8.6 9.5 5.5 12 3Z"
        stroke={color}
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

// Sliders / Presets
export function IconSliders({ size = 16, color = "currentColor", className = "" }) {
  return (
    <svg width={size} height={size} viewBox="0 0 20 20" fill="none" className={className} style={{ display: "inline-block", verticalAlign: "middle" }}>
      <path d="M4 15V9M4 5V3" stroke={color} strokeWidth="1.8" strokeLinecap="round" />
      <path d="M10 17V11M10 7V3" stroke={color} strokeWidth="1.8" strokeLinecap="round" />
      <path d="M16 15V13M16 9V3" stroke={color} strokeWidth="1.8" strokeLinecap="round" />
      <circle cx="4" cy="7" r="2" stroke={color} strokeWidth="1.6" />
      <circle cx="10" cy="9" r="2" stroke={color} strokeWidth="1.6" />
      <circle cx="16" cy="11" r="2" stroke={color} strokeWidth="1.6" />
    </svg>
  );
}

// Sparkle / AI magic wand
export function IconSparkle({ size = 16, color = "currentColor", className = "" }) {
  return (
    <svg width={size} height={size} viewBox="0 0 20 20" fill="none" className={className} style={{ display: "inline-block", verticalAlign: "middle" }}>
      <path
        d="M10 2L11.4 7.1L16.5 8.5L11.4 9.9L10 15L8.6 9.9L3.5 8.5L8.6 7.1L10 2Z"
        fill={color}
      />
      <path d="M16 13L16.6 15.1L18.7 15.7L16.6 16.3L16 18.4L15.4 16.3L13.3 15.7L15.4 15.1L16 13Z" fill={color} />
    </svg>
  );
}

// Bot / AI assistant head
export function IconBot({ size = 16, color = "currentColor", className = "" }) {
  return (
    <svg width={size} height={size} viewBox="0 0 20 20" fill="none" className={className} style={{ display: "inline-block", verticalAlign: "middle" }}>
      <rect x="4" y="7" width="12" height="9" rx="2.5" stroke={color} strokeWidth="1.6" />
      <path d="M10 7V4" stroke={color} strokeWidth="1.6" strokeLinecap="round" />
      <circle cx="10" cy="3" r="1.2" fill={color} />
      <circle cx="7.5" cy="11.5" r="1.2" fill={color} />
      <circle cx="12.5" cy="11.5" r="1.2" fill={color} />
      <path d="M8 14.2C8.6 14.7 9.3 15 10 15C10.7 15 11.4 14.7 12 14.2" stroke={color} strokeWidth="1.4" strokeLinecap="round" />
      <path d="M2 10.5H4M16 10.5H18" stroke={color} strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}

// Small spinner (loading)
export function IconSpinner({ size = 16, color = "currentColor", className = "" }) {
  return (
    <svg width={size} height={size} viewBox="0 0 20 20" fill="none" className={className} style={{ display: "inline-block", verticalAlign: "middle" }}>
      <circle cx="10" cy="10" r="8" stroke={color} strokeWidth="2.2" opacity="0.2" />
      <path d="M18 10C18 5.6 14.4 2 10 2" stroke={color} strokeWidth="2.2" strokeLinecap="round" />
    </svg>
  );
}

// Weight / scale badge (quantity)
export function IconWeight({ size = 14, color = "currentColor", className = "" }) {
  return (
    <svg width={size} height={size} viewBox="0 0 20 20" fill="none" className={className} style={{ display: "inline-block", verticalAlign: "middle" }}>
      <circle cx="10" cy="7" r="4" stroke={color} strokeWidth="1.6" />
      <path d="M6.5 10.5H13.5L15 17H5L6.5 10.5Z" stroke={color} strokeWidth="1.6" strokeLinejoin="round" />
    </svg>
  );
}

// Calendar / date icon
export function IconCalendar({ size = 14, color = "currentColor", className = "" }) {
  return (
    <svg width={size} height={size} viewBox="0 0 20 20" fill="none" className={className} style={{ display: "inline-block", verticalAlign: "middle" }}>
      <rect x="3" y="4.5" width="14" height="12.5" rx="1.8" stroke={color} strokeWidth="1.6" />
      <path d="M3 8H17" stroke={color} strokeWidth="1.6" />
      <path d="M6.5 2.5V5.5M13.5 2.5V5.5" stroke={color} strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}

// Download Outline
export function IconDownload({ size = 16, color = "currentColor", className = "" }) {
  return (
    <svg width={size} height={size} viewBox="0 0 20 20" fill="none" className={className} style={{ display: "inline-block", verticalAlign: "middle" }}>
      <path d="M10 3V13M10 13L6.5 9.5M10 13L13.5 9.5" stroke={color} strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M3.5 14V15.5C3.5 16.3284 4.17157 17 5 17H15C15.8284 17 16.5 16.3284 16.5 15.5V14" stroke={color} strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
