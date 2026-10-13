import React, { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../AuthContext.jsx";
import { api } from "../api.js";
import { avatarUrl } from "../avatar.js";
import {
  IconUser,
  IconInbox,
  IconShieldCheck,
  IconStatPeople,
  IconTruck,
  IconGlobe,
  IconMapPin,
  IconCamera,
  IconTrash,
  IconSpinner,
} from "../components/Icons.jsx";

const ACCEPTED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];
const MAX_PHOTO_BYTES = 5 * 1024 * 1024;

function initials(name = "") {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0].toUpperCase())
    .join("");
}

function VerificationBadge({ user }) {
  if (user.verified === undefined) return null;
  const status = user.verified
    ? { label: "Verified", classes: "bg-emerald-50 text-emerald-700" }
    : user.verificationStatus === "rejected"
    ? { label: "Rejected", classes: "bg-red-50 text-red-600" }
    : { label: "Pending", classes: "bg-amber-50 text-amber-600" };

  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ${status.classes}`}>
      <IconShieldCheck size={14} />
      {status.label}
    </span>
  );
}

/** Circular profile photo with upload / replace / remove controls. */
function AvatarEditor({ user }) {
  const { login } = useAuth();
  const inputRef = useRef(null);
  const [preview, setPreview] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const photo = preview || avatarUrl(user);

  useEffect(() => () => preview && URL.revokeObjectURL(preview), [preview]);

  useEffect(() => {
    if (!notice) return undefined;
    const timer = setTimeout(() => setNotice(""), 2500);
    return () => clearTimeout(timer);
  }, [notice]);

  const pickFile = () => {
    if (!busy) inputRef.current?.click();
  };

  const upload = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = ""; // allow re-selecting the same file later
    if (!file) return;

    setError("");
    if (!ACCEPTED_TYPES.includes(file.type)) {
      setError("Please choose a JPG, PNG, WEBP or GIF image.");
      return;
    }
    if (file.size > MAX_PHOTO_BYTES) {
      setError("That image is larger than 5MB.");
      return;
    }

    setPreview(URL.createObjectURL(file));
    setBusy(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const { user: updated } = await api.upload(`/users/${user.id}/avatar`, formData);
      login(updated);
      setNotice("Profile photo updated");
    } catch (err) {
      setError(err.message || "Failed to upload photo.");
    } finally {
      setPreview(null);
      setBusy(false);
    }
  };

  const remove = async () => {
    setBusy(true);
    setError("");
    try {
      const { user: updated } = await api.del(`/users/${user.id}/avatar`);
      login(updated);
      setNotice("Profile photo removed");
    } catch (err) {
      setError(err.message || "Failed to remove photo.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex flex-col items-center">
      <div className="relative -mt-14">
        {/* Gradient ring */}
        <div className="rounded-full bg-gradient-to-br from-emerald-400 via-teal-300 to-emerald-500 p-1 shadow-[0_12px_28px_-8px_rgba(16,185,129,0.55)]">
          <button
            type="button"
            onClick={pickFile}
            disabled={busy}
            aria-label={photo ? "Change profile photo" : "Upload profile photo"}
            className="group relative flex h-28 w-28 items-center justify-center overflow-hidden rounded-full border-4 border-white bg-emerald-50 text-2xl font-bold text-emerald-700 focus:outline-none focus-visible:ring-4 focus-visible:ring-emerald-300 disabled:cursor-wait"
          >
            {photo ? (
              <img
                src={photo}
                alt={user.name || "Profile photo"}
                className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
              />
            ) : user.name ? (
              initials(user.name)
            ) : (
              <IconUser size={36} />
            )}

            {/* Hover overlay */}
            {!busy && (
              <span className="absolute inset-0 flex flex-col items-center justify-center gap-1 bg-slate-900/55 text-white opacity-0 transition-opacity duration-200 group-hover:opacity-100 group-focus-visible:opacity-100">
                <IconCamera size={22} />
                <span className="text-[11px] font-semibold tracking-wide">{photo ? "Change photo" : "Add photo"}</span>
              </span>
            )}

            {busy && (
              <span className="absolute inset-0 flex items-center justify-center bg-white/70 text-emerald-600">
                <IconSpinner size={26} className="animate-spin" />
              </span>
            )}
          </button>
        </div>

        {/* Camera badge — always visible so touch users can find it */}
        <button
          type="button"
          onClick={pickFile}
          disabled={busy}
          aria-hidden="true"
          tabIndex={-1}
          className="absolute bottom-1 right-1 flex h-9 w-9 items-center justify-center rounded-full border-[3px] border-white bg-gradient-to-br from-emerald-500 to-teal-400 text-white shadow-md transition hover:scale-110 disabled:opacity-60"
        >
          <IconCamera size={16} />
        </button>

        <input
          ref={inputRef}
          type="file"
          accept={ACCEPTED_TYPES.join(",")}
          onChange={upload}
          className="hidden"
        />
      </div>

      <div className="mt-3 flex items-center gap-2">
        <button
          type="button"
          onClick={pickFile}
          disabled={busy}
          className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3.5 py-1.5 text-xs font-semibold text-emerald-700 ring-1 ring-emerald-100 transition hover:bg-emerald-100 disabled:opacity-60"
        >
          <IconCamera size={14} />
          {avatarUrl(user) ? "Change photo" : "Upload photo"}
        </button>
        {avatarUrl(user) && (
          <button
            type="button"
            onClick={remove}
            disabled={busy}
            className="inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-semibold text-slate-500 ring-1 ring-slate-200 transition hover:bg-red-50 hover:text-red-600 hover:ring-red-100 disabled:opacity-60"
          >
            <IconTrash size={14} />
            Remove
          </button>
        )}
      </div>
      <p className="mt-1.5 text-[11px] text-slate-400">JPG, PNG, WEBP or GIF · up to 5MB</p>

      {error && (
        <p role="alert" className="mt-2 rounded-full bg-red-50 px-3 py-1 text-xs font-medium text-red-600">
          {error}
        </p>
      )}
      {notice && !error && (
        <p role="status" className="mt-2 rounded-full bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-700">
          {notice}
        </p>
      )}
    </div>
  );
}

export default function Profile() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const role = (user.role || "").toLowerCase();
  const isAdmin = role === "admin";
  const isDonor = role === "donor";
  const isBeneficiary = !isAdmin && !isDonor;

  const orgTypeLabel = user.orgType && user.orgType !== "Donor" ? user.orgType : null;

  const infoRows = [
    { icon: <IconUser size={16} />, label: "Full Name", value: user.name },
    { icon: <IconInbox size={16} />, label: "Email", value: user.email },
    !isAdmin &&
      user.organizationName && {
        icon: <IconGlobe size={16} />,
        label: isDonor ? "Business / Store Name" : "Organization",
        value: user.organizationName,
      },
    isBeneficiary &&
      orgTypeLabel && { icon: <IconGlobe size={16} />, label: "Organization Category", value: orgTypeLabel },
    !isAdmin &&
      user.location && {
        icon: <IconMapPin size={16} />,
        label: isDonor ? "Pickup City / Address" : "Location",
        value: user.location,
      },
  ].filter(Boolean);

  const stats = isBeneficiary
    ? [
        user.organizationSize !== undefined && {
          icon: <IconStatPeople size={22} />,
          label: "People served",
          value: user.organizationSize,
        },
        user.handlingCapacityKg !== undefined && {
          icon: <IconTruck size={22} />,
          label: "Handling capacity (kg)",
          value: user.handlingCapacityKg,
        },
      ].filter(Boolean)
    : isAdmin
    ? [
        { icon: <IconShieldCheck size={22} />, label: "System Role", value: "Administrator" },
        { icon: <IconGlobe size={22} />, label: "Account Status", value: "Active" },
      ]
    : [];

  const showRejection = user.verificationStatus === "rejected" && user.rejectionReason;

  return (
    <div className="mx-auto w-full max-w-xl">
      <div className="rounded-3xl bg-white shadow-[0_20px_40px_-12px_rgba(15,23,42,0.14)]">
        {/* Curved gradient header */}
        <div className="relative h-36 overflow-hidden rounded-t-3xl bg-gradient-to-r from-emerald-500 to-teal-400">
          <svg
            className="absolute bottom-0 left-0 w-full text-white"
            viewBox="0 0 500 40"
            preserveAspectRatio="none"
            style={{ height: 32 }}
          >
            <path d="M0,0 C150,45 350,45 500,0 L500,40 L0,40 Z" fill="currentColor" />
          </svg>
          <div className="relative px-8 pt-6 text-center">
            <h1 className="text-xl font-extrabold tracking-tight text-white">My Profile</h1>
            <p className="mt-1 text-sm font-medium text-emerald-50/90">
              {user.organizationName || "Zero Waste Member"} · Role: <span className="capitalize">{user.role}</span>
            </p>
          </div>
        </div>

        {/* Overlapping avatar */}
        <div className="relative z-10">
          <AvatarEditor user={user} />
        </div>

        <div className="rounded-b-3xl px-6 pb-8 pt-4 sm:px-10">
          <div className="text-center">
            <h2 className="text-lg font-extrabold text-slate-900">{user.name}</h2>
            <div className="mt-2 flex items-center justify-center gap-2">
              <span className="inline-flex items-center rounded-full bg-slate-900/5 px-3 py-1 text-xs font-semibold capitalize text-slate-700">
                {user.role}
              </span>
              <VerificationBadge user={user} />
            </div>
          </div>

          {/* Info grid */}
          <div className="mt-6 grid grid-cols-1 gap-x-8 gap-y-4 sm:grid-cols-2">
            {infoRows.map((row) => (
              <div key={row.label} className="flex items-start gap-3">
                <div className="mt-0.5 flex h-8 w-8 flex-none items-center justify-center rounded-full bg-emerald-50 text-emerald-600">
                  {row.icon}
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-medium text-slate-400">{row.label}</p>
                  <p className="truncate text-sm font-semibold text-slate-900">{String(row.value)}</p>
                </div>
              </div>
            ))}
          </div>

          {showRejection && (
            <div className="mt-4 rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-600">
              <span className="font-semibold">Rejection reason: </span>
              {user.rejectionReason}
            </div>
          )}

          {/* Platform stats */}
          {stats.length > 0 && (
            <div className="mt-6 grid grid-cols-2 gap-3">
              {stats.map((stat) => (
                <div
                  key={stat.label}
                  className="flex flex-col items-center gap-2 rounded-2xl bg-gradient-to-b from-emerald-50 to-white px-4 py-4 text-center"
                >
                  <div className="text-emerald-600">{stat.icon}</div>
                  <p className="text-lg font-extrabold text-slate-900">{stat.value}</p>
                  <p className="text-xs font-medium text-slate-500">{stat.label}</p>
                </div>
              ))}
            </div>
          )}

          {/* Action button */}
          <div className="mt-8 flex justify-center">
            <button
              onClick={() => navigate("/dashboard")}
              className="rounded-full bg-gradient-to-r from-emerald-500 to-teal-400 px-8 py-2.5 text-sm font-semibold text-white shadow-md transition hover:opacity-90"
            >
              Back to Dashboard
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
