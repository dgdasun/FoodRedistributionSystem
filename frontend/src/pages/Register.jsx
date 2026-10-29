import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { AlertCircle, ArrowLeft, Check, Eye, EyeOff, Loader2, ShieldCheck } from "lucide-react";
import { useAuth } from "../AuthContext.jsx";
import { api } from "../api.js";
import {
  BrandWordmark,
  IconStatStore,
  IconStepDistribute,
} from "../components/Icons.jsx";
import BeneficiaryRegistrationForm from "../components/BeneficiaryRegistrationForm.jsx";
import { sanitizePhone, validateEmail, validatePassword, validatePhone, PHONE_LENGTH } from "../utils/validation.js";

const TOP_ROLES = [
  {
    key: "donor",
    label: "Donor",
    sub: "Supermarket / Store",
    IconComponent: IconStatStore,
  },
  {
    key: "organization",
    label: "Receiving Organization",
    sub: "Beneficiary or farm partner",
    IconComponent: IconStepDistribute,
  },
];

const AGREEMENTS = {
  donor: {
    title: "Donor Pledge",
    body:
      "As a registered food donor on Zero Waste, I pledge to only list food that is safe, accurately described, and fit for its stated purpose — for human consumption while fresh or surplus, and for farm/compost redistribution once flagged expired. I understand that listing inaccurate, unsafe, or misleading items may result in my account being suspended.",
  },
  beneficiary: {
    title: "Recipient Disclaimer",
    body:
      "I understand that Zero Waste is a redistribution platform connecting my organization with surplus and near-expiry food donated in good faith by third-party donors. Zero Waste and its donors are not responsible for the quality, safety, or condition of food received through this platform. My organization accepts full responsibility for inspecting all items before use or further distribution.",
  },
};

const FARM_AGREEMENT = {
  title: "Farm & Compost Partner Disclaimer",
  body:
    "I understand that Zero Waste connects my facility with surplus and expired food donated in good faith by third-party donors, intended for composting or animal feed. Zero Waste and its donors are not responsible for the quality, safety, or condition of food received through this platform. My facility accepts full responsibility for inspecting and handling all items appropriately.",
};

function getRoleConfig(role) {
  if (role === "donor") {
    return {
      orgLabel: "Store / Supermarket Name",
      orgPlaceholder: "e.g. ABC Supermarket Hub",
    };
  }
  return {
    orgLabel: "Farm / Facility Name",
    orgPlaceholder: "e.g. Green Acres Farm",
  };
}

export default function Register() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [form, setForm] = useState({
    role: "donor",
    orgType: "Donor",
    name: "",
    email: "",
    phone: "",
    organizationName: "",
    organizationSize: "",
    handlingCapacityKg: "",
    location: "",
    password: "",
    confirmPassword: "",
  });
  const [beneficiaryValues, setBeneficiaryValues] = useState(null);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [stage, setStage] = useState("form"); // form | agreement
  const [error, setError] = useState("");
  const [emailError, setEmailError] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [phoneError, setPhoneError] = useState("");
  const [loading, setLoading] = useState(false);

  const roleConfig = getRoleConfig(form.role);
  const agreement =
    form.role === "donor" ? AGREEMENTS.donor : form.role === "farm" ? FARM_AGREEMENT : AGREEMENTS.beneficiary;

  const update = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const handleEmailChange = (value) => {
    update("email", value);
    // Once an error is showing, clear it as soon as the input becomes valid.
    if (emailError) setEmailError(validateEmail(value));
  };

  const handlePhoneChange = (value) => {
    const phone = sanitizePhone(value);
    update("phone", phone);
    // Validate while typing so a short number is flagged immediately.
    setPhoneError(phone ? validatePhone(phone) : "");
  };

  const handlePasswordChange = (value) => {
    update("password", value);
    if (passwordError) setPasswordError(validatePassword(value));
  };

  const selectTopRole = (key) => {
    setError("");
    if (key === "donor") {
      setForm((f) => ({ ...f, role: "donor", orgType: "Donor" }));
    } else {
      setForm((f) => ({ ...f, role: "organization", orgType: "" }));
    }
  };

  const proceedToAgreement = (e) => {
    e.preventDefault();
    setError("");
    const emailMsg = validateEmail(form.email);
    setEmailError(emailMsg);
    if (emailMsg) {
      document.getElementById("reg-email")?.focus();
      return;
    }
    const phoneMsg = validatePhone(form.phone);
    setPhoneError(phoneMsg);
    if (phoneMsg) {
      document.getElementById("reg-phone")?.focus();
      return;
    }
    const passwordMsg = validatePassword(form.password);
    setPasswordError(passwordMsg);
    if (passwordMsg) {
      document.getElementById("reg-pass")?.focus();
      return;
    }
    if (form.password && form.confirmPassword && form.password !== form.confirmPassword) {
      setError("Passwords do not match.");
      return;
    }
    setStage("agreement");
  };

  const handleBeneficiarySubmit = (values) => {
    setError("");
    setBeneficiaryValues(values);
    setForm((f) => ({ ...f, role: values.organizationCategory }));
    setStage("agreement");
  };

  const confirmAgreement = async () => {
    setError("");
    setLoading(true);
    try {
      let payload;
      if (beneficiaryValues && (form.role === "beneficiary" || form.role === "farm")) {
        const v = beneficiaryValues;
        payload = {
          role: v.organizationCategory,
          orgType: v.organizationCategory === "farm" ? "Farm" : "Beneficiary Organization",
          name: v.contactPersonName,
          email: v.email.trim(),
          password: v.password,
          organizationName: v.organizationName,
          organizationSize: Number(v.capacity) || 0,
          handlingCapacityKg: Number(v.handlingCapacityKg) || 0,
          location: v.location,
          phone: v.phone,
          storageTypes: v.organizationCategory === "beneficiary" ? v.storageTypes : [],
        };
      } else {
        payload = {
          ...form,
          email: form.email.trim(),
          organizationSize: Number(form.organizationSize) || 0,
          handlingCapacityKg: Number(form.handlingCapacityKg) || 0,
        };
      }

      // Verification documents are uploaded after sign-in, from the dashboard / profile.
      const { user } = await api.post("/auth/register", payload);
      login(user);
      navigate("/dashboard");
    } catch (e2) {
      setError(e2.message || "Failed to register. Please try again.");
      setStage("form");
    } finally {
      setLoading(false);
    }
  };

  const rejectAgreement = () => {
    navigate("/");
  };

  // All entered values live in this component's state (or beneficiaryValues for
  // the organization form), so switching stage back keeps them intact.
  const backToForm = () => {
    setError("");
    setStage("form");
  };

  const isOrganizationMode = form.role !== "donor";
  const showBeneficiaryForm = stage === "form" && isOrganizationMode;

  const roleSelector = (
    <div className="mb-4">
      <label className="block text-xs font-semibold text-slate-700 mb-1.5">Select Partner Role</label>
      <div className="grid grid-cols-2 gap-2.5">
        {TOP_ROLES.map((r) => {
          const isSelected = r.key === "donor" ? form.role === "donor" : form.role !== "donor";
          const RoleIcon = r.IconComponent;
          return (
            <button
              key={r.key}
              type="button"
              onClick={() => selectTopRole(r.key)}
              className={[
                "flex items-center gap-2.5 rounded-xl border-2 py-2.5 px-3 text-left transition-all",
                isSelected
                  ? "border-emerald-600 bg-emerald-50/50 shadow-sm"
                  : "border-slate-200 bg-[var(--surface)] hover:border-emerald-300 hover:bg-emerald-50/30",
              ].join(" ")}
            >
              <div
                className={[
                  "flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg",
                  isSelected ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-500",
                ].join(" ")}
              >
                <RoleIcon size={16} color={isSelected ? "var(--status-ok-fg)" : "var(--stone)"} />
              </div>
              <div className="min-w-0 leading-tight">
                <div className={`text-[12px] font-bold ${isSelected ? "text-emerald-700" : "text-slate-800"}`}>
                  {r.label}
                </div>
                <div className={`text-[10px] font-medium ${isSelected ? "text-emerald-700/80" : "text-slate-400"}`}>
                  {r.sub}
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );

  return (
    <div className="auth-page-container">
      <div className="auth-card-split auth-signup-card">
        {/* Left Hero Column */}
        <div className="auth-hero-panel">
          <div className="auth-hero-overlay" />
          <Link to="/" className="auth-back-link">
            <ArrowLeft size={16} aria-hidden="true" />
            Back to home
          </Link>
          <div className="auth-hero-content">
            <span className="auth-hero-badge">AI Powered</span>
            <h1 className="auth-hero-title">
              Smart Surplus Food Redistribution and Waste Reduction System
            </h1>
            <p className="auth-hero-subtitle">
              Reducing Waste. Feeding Hope. Building a Sustainable Future. 🌿
            </p>
          </div>
        </div>

        {/* Right Form Column */}
        <div className="auth-form-panel auth-scrollbar">
          <div className="auth-form-header">
            <div className="auth-logo-badge">
              <BrandWordmark size={30} />
            </div>
            <h2>Create an Account</h2>
            <p>Join the Zero Waste network</p>
          </div>

          <div className="w-full">
            {stage === "agreement" ? (
              <div className="auth-pledge-step">
                <button type="button" className="auth-pledge-back" onClick={backToForm} disabled={loading}>
                  <ArrowLeft size={16} aria-hidden="true" />
                  Back to edit details
                </button>

                <div className="auth-pledge-progress" aria-hidden="true">
                  <span className="done" /><span className="active" />
                </div>
                <p className="auth-pledge-step-label">Step 2 of 2 · Review and accept</p>

                <section className="auth-pledge" aria-labelledby="pledge-title">
                  <div className="auth-pledge-head">
                    <span className="auth-pledge-icon"><ShieldCheck size={20} aria-hidden="true" /></span>
                    <h3 id="pledge-title">{agreement.title}</h3>
                  </div>
                  <p>{agreement.body}</p>
                </section>

                {error && (
                  <div className="auth-pledge-error" role="alert">
                    <AlertCircle size={16} aria-hidden="true" />
                    {error}
                  </div>
                )}

                <div className="auth-pledge-actions">
                  <button type="button" className="auth-pledge-agree" onClick={confirmAgreement} disabled={loading}>
                    {loading ? <Loader2 size={17} className="auth-pledge-spin" aria-hidden="true" /> : <Check size={17} aria-hidden="true" />}
                    {loading ? "Creating account…" : "I Agree — Continue"}
                  </button>
                  <button type="button" className="auth-pledge-disagree" onClick={rejectAgreement} disabled={loading}>
                    I Disagree
                  </button>
                </div>
              </div>
            ) : showBeneficiaryForm ? (
              <>
                {roleSelector}
                <BeneficiaryRegistrationForm
                  onSubmit={handleBeneficiarySubmit}
                  initialValues={beneficiaryValues}
                  submitError={error}
                  wrapperClassName="w-full space-y-4"
                />
              </>
            ) : (
              <>
                {roleSelector}

                <form className="auth-form" onSubmit={proceedToAgreement}>
                  <div className="auth-input-group">
                    <label htmlFor="reg-name">Contact Name</label>
                    <input
                      id="reg-name"
                      type="text"
                      className="auth-input"
                      placeholder="Full name"
                      value={form.name}
                      onChange={(e) => update("name", e.target.value)}
                      required
                    />
                  </div>

                  <div className="auth-input-group">
                    <label htmlFor="reg-email">Email Address</label>
                    {/* type="text" so the browser's lax native email check doesn't
                        pre-empt our stricter inline validation. */}
                    <input
                      id="reg-email"
                      type="text"
                      inputMode="email"
                      autoComplete="email"
                      className="auth-input"
                      placeholder="name@organization.lk"
                      value={form.email}
                      onChange={(e) => handleEmailChange(e.target.value)}
                      onBlur={() => form.email && setEmailError(validateEmail(form.email))}
                      aria-invalid={!!emailError}
                      aria-describedby={emailError ? "reg-email-error" : undefined}
                      style={emailError ? { borderColor: "var(--danger)" } : undefined}
                      required
                    />
                    {emailError && (
                      <p id="reg-email-error" role="alert" style={{ color: "var(--danger)", fontSize: 12, marginTop: 4 }}>
                        {emailError}
                      </p>
                    )}
                  </div>

                  <div className="auth-input-group">
                    <label htmlFor="reg-phone">Phone Number</label>
                    <input
                      id="reg-phone"
                      type="tel"
                      inputMode="numeric"
                      maxLength={PHONE_LENGTH}
                      autoComplete="tel"
                      className="auth-input"
                      placeholder="0771234567"
                      value={form.phone}
                      onChange={(e) => handlePhoneChange(e.target.value)}
                      onBlur={() => form.phone && setPhoneError(validatePhone(form.phone))}
                      aria-invalid={!!phoneError}
                      aria-describedby={phoneError ? "reg-phone-error" : undefined}
                      style={phoneError ? { borderColor: "var(--danger)" } : undefined}
                      required
                    />
                    {phoneError && (
                      <p id="reg-phone-error" role="alert" style={{ color: "var(--danger)", fontSize: 12, marginTop: 4 }}>
                        {phoneError}
                      </p>
                    )}
                  </div>

                  <div className="auth-input-group">
                    <label htmlFor="reg-org">{roleConfig.orgLabel}</label>
                    <input
                      id="reg-org"
                      type="text"
                      className="auth-input"
                      placeholder={roleConfig.orgPlaceholder}
                      value={form.organizationName}
                      onChange={(e) => update("organizationName", e.target.value)}
                      required
                    />
                  </div>

                  <div className="auth-input-group">
                    <label htmlFor="reg-loc">Location / City</label>
                    <input
                      id="reg-loc"
                      type="text"
                      className="auth-input"
                      placeholder="e.g. Colombo 05"
                      value={form.location}
                      onChange={(e) => update("location", e.target.value)}
                    />
                  </div>

                  <div className="auth-input-group">
                    <label htmlFor="reg-pass">Password</label>
                    <div className="auth-password-wrap">
                      <input
                        id="reg-pass"
                        type={showPassword ? "text" : "password"}
                        className="auth-input"
                        placeholder="Create password"
                        value={form.password}
                        onChange={(e) => handlePasswordChange(e.target.value)}
                        onBlur={() => form.password && setPasswordError(validatePassword(form.password))}
                        aria-invalid={!!passwordError}
                        aria-describedby={passwordError ? "reg-pass-error" : undefined}
                        style={passwordError ? { borderColor: "var(--danger)" } : undefined}
                        autoComplete="new-password"
                        required
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
                    {passwordError && (
                      <p id="reg-pass-error" role="alert" style={{ color: "var(--danger)", fontSize: 12, marginTop: 4 }}>
                        {passwordError}
                      </p>
                    )}
                  </div>

                  <div className="auth-input-group">
                    <label htmlFor="reg-confirm-pass">Confirm Password</label>
                    <div className="auth-password-wrap">
                      <input
                        id="reg-confirm-pass"
                        type={showConfirmPassword ? "text" : "password"}
                        className="auth-input"
                        placeholder="Confirm password"
                        value={form.confirmPassword}
                        onChange={(e) => update("confirmPassword", e.target.value)}
                        required
                      />
                      <button
                        type="button"
                        className="auth-password-toggle"
                        onClick={() => setShowConfirmPassword((s) => !s)}
                        aria-label={showConfirmPassword ? "Hide password" : "Show password"}
                      >
                        {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                      </button>
                    </div>
                  </div>

                  {error && (
                    <div style={{ color: "var(--danger)", fontSize: 13, textAlign: "center", background: "var(--status-danger-bg)", padding: "8px 12px", borderRadius: 8, border: "1px solid var(--status-danger-border)" }}>
                      {error}
                    </div>
                  )}

                  <button type="submit" className="auth-submit-btn">
                    Continue to Agreement →
                  </button>
                </form>
              </>
            )}
          </div>

          {!showBeneficiaryForm && (
            <p className="auth-footer-text">
              Already have an account?
              <Link to="/login">Sign In</Link>
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
