import React, { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Eye, EyeOff, HeartHandshake, Tractor } from "lucide-react";

/**
 * Organization Registration Form.
 *
 * Single-page, single-card registration for the two non-donor partner
 * types on the platform. The only "organization type" choice is made via
 * two toggle cards (Beneficiary / Farm Partner) — no dropdowns, no
 * multi-step wizard. Document verification happens later, post-signup.
 */

const ORG_TYPES = [
  {
    value: "beneficiary",
    label: "Beneficiary",
    sub: "Charity & Relief",
    Icon: HeartHandshake,
  },
  {
    value: "farm",
    label: "Farm Partner",
    sub: "Compost & Animal Feed",
    Icon: Tractor,
  },
];

const STORAGE_OPTIONS = [
  { value: "", label: "Select storage type" },
  { value: "Ambient / Dry", label: "Ambient / Dry" },
  { value: "Refrigerated / Cold", label: "Refrigerated / Cold" },
  { value: "Deep Freezer", label: "Deep Freezer" },
];

const initialValues = {
  contactPersonName: "",
  email: "",
  organizationName: "",
  phone: "",
  location: "",
  capacity: "",
  storageFacility: "",
  password: "",
  confirmPassword: "",
};

function FieldLabel({ children, required }) {
  return (
    <label>
      {children}
      {required && <span style={{ color: "var(--primary)", marginLeft: 2 }}>*</span>}
    </label>
  );
}

function ErrorText({ children }) {
  if (!children) return null;
  return <p className="mt-1 text-xs text-rose-500">{children}</p>;
}

function fieldClass(hasError) {
  return hasError ? "auth-input auth-input-error" : "auth-input";
}

function OrgTypeCard({ type, selected, onSelect }) {
  const { Icon } = type;
  return (
    <button
      type="button"
      onClick={() => onSelect(type.value)}
      className={[
        "flex items-center gap-2.5 p-3 rounded-xl border-2 text-left transition-all",
        selected
          ? "border-emerald-500 bg-emerald-50 ring-2 ring-emerald-100"
          : "border-slate-200 bg-white hover:border-emerald-300 hover:bg-emerald-50/30",
      ].join(" ")}
    >
      <div
        className={[
          "p-2 rounded-lg flex-shrink-0",
          selected ? "bg-[var(--primary-strong)] text-white" : "bg-emerald-50 text-emerald-600",
        ].join(" ")}
      >
        <Icon size={16} />
      </div>
      <div className="min-w-0 leading-tight">
        <p className={`text-xs font-semibold ${selected ? "text-emerald-700" : "text-slate-800"}`}>
          {type.label}
        </p>
        <p className="text-[10px] text-slate-500 mt-0.5">{type.sub}</p>
      </div>
    </button>
  );
}

export default function BeneficiaryRegistrationForm({
  onSubmit,
  submitting = false,
  submitError = "",
  wrapperClassName = "w-full space-y-4",
}) {
  const [orgType, setOrgType] = useState("beneficiary");
  const [values, setValues] = useState(initialValues);
  const [touched, setTouched] = useState({});
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const isBeneficiary = orgType === "beneficiary";

  const update = (key, val) => setValues((v) => ({ ...v, [key]: val }));
  const markTouched = (key) => setTouched((t) => ({ ...t, [key]: true }));

  const errors = useMemo(() => {
    const e = {};
    if (!values.contactPersonName.trim()) e.contactPersonName = "Contact name is required.";
    if (!values.email.trim()) e.email = "Email address is required.";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.email)) e.email = "Enter a valid email address.";
    if (!values.organizationName.trim()) e.organizationName = "Organization name is required.";
    if (!values.phone.trim()) e.phone = "Phone number is required.";
    if (!values.location.trim()) e.location = "City / location is required.";
    if (isBeneficiary && !values.capacity.trim()) e.capacity = "This field is required.";
    if (isBeneficiary && !values.storageFacility.trim()) e.storageFacility = "Please select a storage type.";
    if (!values.password) e.password = "Password is required.";
    else if (values.password.length < 8) e.password = "Password must be at least 8 characters.";
    if (!values.confirmPassword) e.confirmPassword = "Please confirm your password.";
    else if (values.password && values.confirmPassword !== values.password) e.confirmPassword = "Passwords do not match.";
    return e;
  }, [values, isBeneficiary]);

  const allValid = Object.keys(errors).length === 0;
  const showError = (key) => (touched[key] ? errors[key] : undefined);

  const handleSubmit = (e) => {
    e.preventDefault();
    setTouched(Object.fromEntries(Object.keys(initialValues).map((k) => [k, true])));
    if (!allValid) return;
    onSubmit({ ...values, organizationCategory: orgType }, null);
  };

  return (
    <form onSubmit={handleSubmit} className={wrapperClassName}>
      <div>
        <FieldLabel required>Organization Type</FieldLabel>
        <div className="grid grid-cols-2 gap-2.5 w-full">
          {ORG_TYPES.map((type) => (
            <OrgTypeCard key={type.value} type={type} selected={orgType === type.value} onSelect={setOrgType} />
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-3">
        <div className="auth-input-group">
          <FieldLabel required>Contact Name</FieldLabel>
          <input
            type="text"
            className={fieldClass(!!showError("contactPersonName"))}
            placeholder="Kasun Perera"
            value={values.contactPersonName}
            onChange={(e) => update("contactPersonName", e.target.value)}
            onBlur={() => markTouched("contactPersonName")}
          />
          <ErrorText>{showError("contactPersonName")}</ErrorText>
        </div>

        <div className="auth-input-group">
          <FieldLabel required>Email Address</FieldLabel>
          <input
            type="email"
            className={fieldClass(!!showError("email"))}
            placeholder="name@organization.lk"
            value={values.email}
            onChange={(e) => update("email", e.target.value)}
            onBlur={() => markTouched("email")}
          />
          <ErrorText>{showError("email")}</ErrorText>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-3">
        <div className="auth-input-group">
          <FieldLabel required>Organization Name</FieldLabel>
          <input
            type="text"
            className={fieldClass(!!showError("organizationName"))}
            placeholder="Hope Kitchen Foundation"
            value={values.organizationName}
            onChange={(e) => update("organizationName", e.target.value)}
            onBlur={() => markTouched("organizationName")}
          />
          <ErrorText>{showError("organizationName")}</ErrorText>
        </div>

        <div className="auth-input-group">
          <FieldLabel required>Phone Number</FieldLabel>
          <input
            type="tel"
            className={fieldClass(!!showError("phone"))}
            placeholder="077 123 4567"
            value={values.phone}
            onChange={(e) => update("phone", e.target.value)}
            onBlur={() => markTouched("phone")}
          />
          <ErrorText>{showError("phone")}</ErrorText>
        </div>
      </div>

      <div className={isBeneficiary ? "grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-3" : undefined}>
        <div className="auth-input-group">
          <FieldLabel required>City / Location</FieldLabel>
          <input
            type="text"
            className={fieldClass(!!showError("location"))}
            placeholder="Colombo 05"
            value={values.location}
            onChange={(e) => update("location", e.target.value)}
            onBlur={() => markTouched("location")}
          />
          <ErrorText>{showError("location")}</ErrorText>
        </div>

        {isBeneficiary && (
          <div className="auth-input-group">
            <FieldLabel required>People Served Daily</FieldLabel>
            <input
              type="text"
              inputMode="numeric"
              className={fieldClass(!!showError("capacity"))}
              placeholder="150"
              value={values.capacity}
              onChange={(e) => update("capacity", e.target.value)}
              onBlur={() => markTouched("capacity")}
            />
            <ErrorText>{showError("capacity")}</ErrorText>
          </div>
        )}
      </div>

      {isBeneficiary && (
        <div className="auth-input-group">
          <FieldLabel required>Storage Type</FieldLabel>
          <select
            className={fieldClass(!!showError("storageFacility"))}
            value={values.storageFacility}
            onChange={(e) => update("storageFacility", e.target.value)}
            onBlur={() => markTouched("storageFacility")}
          >
            {STORAGE_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value} disabled={opt.value === ""}>
                {opt.label}
              </option>
            ))}
          </select>
          <ErrorText>{showError("storageFacility")}</ErrorText>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-3">
        <div className="auth-input-group">
          <FieldLabel required>Password</FieldLabel>
          <div className="auth-password-wrap">
            <input
              type={showPassword ? "text" : "password"}
              className={fieldClass(!!showError("password"))}
              placeholder="Create password"
              value={values.password}
              onChange={(e) => update("password", e.target.value)}
              onBlur={() => markTouched("password")}
            />
            <button
              type="button"
              className="auth-password-toggle"
              onClick={() => setShowPassword((s) => !s)}
              aria-label={showPassword ? "Hide password" : "Show password"}
            >
              {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>
          <ErrorText>{showError("password")}</ErrorText>
        </div>

        <div className="auth-input-group">
          <FieldLabel required>Confirm Password</FieldLabel>
          <div className="auth-password-wrap">
            <input
              type={showConfirm ? "text" : "password"}
              className={fieldClass(!!showError("confirmPassword"))}
              placeholder="Confirm password"
              value={values.confirmPassword}
              onChange={(e) => update("confirmPassword", e.target.value)}
              onBlur={() => markTouched("confirmPassword")}
            />
            <button
              type="button"
              className="auth-password-toggle"
              onClick={() => setShowConfirm((s) => !s)}
              aria-label={showConfirm ? "Hide password" : "Show password"}
            >
              {showConfirm ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>
          <ErrorText>{showError("confirmPassword")}</ErrorText>
        </div>
      </div>

      {submitError && (
        <div style={{ color: "var(--danger)", fontSize: 13, textAlign: "center", background: "var(--status-danger-bg)", padding: "8px 12px", borderRadius: 8, border: "1px solid var(--status-danger-border)" }}>
          {submitError}
        </div>
      )}

      <button type="submit" disabled={submitting} className="auth-submit-btn">
        {submitting ? "Creating Account..." : "Continue to Agreement →"}
      </button>

      <p className="auth-footer-text">
        Already have an account?
        <Link to="/login">Sign In</Link>
      </p>
    </form>
  );
}
