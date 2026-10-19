import React, { useEffect, useState } from "react";
import { api } from "../api.js";
import {
  IconFoodPlate,
  IconMilkCarton,
  IconPackageBox,
  IconGlobe,
  IconClock,
  IconTicket,
  IconSliders,
  IconSettings,
} from "../components/Icons.jsx";

const CATEGORY_DEFS = [
  {
    key: "cooked_bakery",
    label: "Cooked Food & Bakery",
    icon: IconFoodPlate,
    accent: "#F97316",
    accentBg: "var(--status-warn-bg)",
    note: "Short window prevents cooked items from spoiling before beneficiary pickup.",
    expiryUnit: "hours",
    windowUnit: "hours",
  },
  {
    key: "perishable_dairy",
    label: "Perishables & Dairy",
    sublabel: "Fruits, Veggies, Milk",
    icon: IconMilkCarton,
    accent: "#0EA5E9",
    accentBg: "var(--status-info-bg)",
    note: "Gives NGOs a realistic pickup window while produce and dairy are still safe to use.",
    expiryUnit: "days",
    windowUnit: "hours",
  },
  {
    key: "packaged_dry",
    label: "Packaged & Dry Rations",
    icon: IconPackageBox,
    accent: "#A16207",
    accentBg: "var(--status-warn-bg)",
    note: "Long shelf life allows a wider collection window without added spoilage risk.",
    expiryUnit: "days",
    windowUnit: "hours",
  },
];

const PRESETS = {
  strict: {
    label: "Strict / Rapid Redistribution",
    description: "Tight thresholds and short pickup windows — pushes items out fast.",
    global: { expiryThresholdDays: 2, ticketCollectionWindowHours: 12 },
    categoryRules: {
      cooked_bakery: { expiryThresholdHours: 2, collectionWindowHours: 1 },
      perishable_dairy: { expiryThresholdHours: 24, collectionWindowHours: 6 },
      packaged_dry: { expiryThresholdHours: 96, collectionWindowHours: 24 },
    },
  },
  relaxed: {
    label: "Relaxed Timing",
    description: "Wider thresholds and longer pickup windows — more flexibility for pickup logistics.",
    global: { expiryThresholdDays: 5, ticketCollectionWindowHours: 48 },
    categoryRules: {
      cooked_bakery: { expiryThresholdHours: 6, collectionWindowHours: 4 },
      perishable_dairy: { expiryThresholdHours: 48, collectionWindowHours: 24 },
      packaged_dry: { expiryThresholdHours: 168, collectionWindowHours: 48 },
    },
  },
};

function hoursToUnit(hours, unit) {
  if (unit === "days") return Math.round((hours / 24) * 10) / 10;
  return hours;
}

function unitToHours(value, unit) {
  const n = Number(value) || 0;
  return unit === "days" ? Math.round(n * 24) : Math.round(n);
}

function NumberField({ label, value, unit, onChange, min = 0 }) {
  return (
    <div className="threshold-field">
      <label>{label}</label>
      <div className="threshold-input-wrap">
        <input
          type="number"
          min={min}
          step={unit === "days" ? 0.5 : 1}
          value={value}
          onChange={(e) => onChange(e.target.value)}
        />
        <span className="threshold-unit">{unit}</span>
      </div>
    </div>
  );
}

export default function AdminSettings() {
  const [settings, setSettings] = useState(null);
  const [categoryRules, setCategoryRules] = useState(null);
  const [units, setUnits] = useState({});
  const [savingGlobal, setSavingGlobal] = useState(false);
  const [savingCategories, setSavingCategories] = useState(false);
  const [savedGlobal, setSavedGlobal] = useState(false);
  const [savedCategories, setSavedCategories] = useState(false);
  const [activePreset, setActivePreset] = useState(null);

  useEffect(() => {
    api.get("/settings").then((d) => {
      setSettings(d.settings);
      setCategoryRules(d.settings.categoryRules || {});
      const initialUnits = {};
      CATEGORY_DEFS.forEach((c) => {
        initialUnits[c.key] = { expiry: c.expiryUnit, window: c.windowUnit };
      });
      setUnits(initialUnits);
    });
  }, []);

  const saveGlobal = async (e) => {
    e.preventDefault();
    setSavingGlobal(true);
    try {
      const { settings: updated } = await api.patch("/settings", {
        expiryThresholdDays: settings.expiryThresholdDays,
        ticketCollectionWindowHours: settings.ticketCollectionWindowHours,
      });
      setSettings((prev) => ({ ...prev, ...updated }));
      setSavedGlobal(true);
      setTimeout(() => setSavedGlobal(false), 2000);
    } finally {
      setSavingGlobal(false);
    }
  };

  const saveCategoryRules = async () => {
    setSavingCategories(true);
    try {
      const { settings: updated } = await api.patch("/settings/category-rules", categoryRules);
      setCategoryRules(updated.categoryRules || {});
      setSavedCategories(true);
      setTimeout(() => setSavedCategories(false), 2500);
    } finally {
      setSavingCategories(false);
    }
  };

  const updateRuleHours = (key, field, hours) => {
    setCategoryRules((prev) => ({
      ...prev,
      [key]: { ...prev[key], [field]: hours },
    }));
    setActivePreset(null);
  };

  const applyPreset = (presetKey) => {
    const preset = PRESETS[presetKey];
    setSettings((prev) => ({ ...prev, ...preset.global }));
    setCategoryRules((prev) => {
      const next = { ...prev };
      Object.entries(preset.categoryRules).forEach(([k, v]) => {
        next[k] = { ...v };
      });
      return next;
    });
    setActivePreset(presetKey);
  };

  const toggleUnit = (key, field) => {
    setUnits((prev) => {
      const current = prev[key]?.[field] || "hours";
      const next = current === "hours" ? "days" : "hours";
      return { ...prev, [key]: { ...prev[key], [field]: next } };
    });
  };

  if (!settings || !categoryRules) return <div className="loading-wrap">Loading settings...</div>;

  return (
    <>
      <div className="page-header">
        <h1>System Settings</h1>
      </div>

      {/* Presets */}
      <div className="card preset-card">
        <div className="card-title">
          <h3 className="section-title-with-leaf"><IconSliders size={17} color="var(--primary)" /> Quick Presets</h3>
        </div>
        <div className="preset-grid">
          {Object.entries(PRESETS).map(([key, preset]) => (
            <button
              type="button"
              key={key}
              className={`preset-option ${activePreset === key ? "active" : ""}`}
              onClick={() => applyPreset(key)}
            >
              <strong>{preset.label}</strong>
              <span>{preset.description}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Category Rules */}
      <div className="category-rules-grid">
        {CATEGORY_DEFS.map((def) => {
          const Icon = def.icon;
          const rule = categoryRules[def.key] || { expiryThresholdHours: 0, collectionWindowHours: 0 };
          const expiryUnit = units[def.key]?.expiry || def.expiryUnit;
          const windowUnit = units[def.key]?.window || def.windowUnit;
          return (
            <div className="card category-rule-card" key={def.key}>
              <div className="category-rule-head">
                <div className="category-rule-icon" style={{ background: def.accentBg }}>
                  <Icon size={22} color={def.accent} />
                </div>
                <div>
                  <h3>{def.label}</h3>
                  {def.sublabel && <span className="category-rule-sublabel">{def.sublabel}</span>}
                </div>
              </div>

              <p className="category-rule-note">{def.note}</p>

              <div className="category-rule-fields">
                <div>
                  <div className="threshold-field-header">
                    <IconClock size={13} color="var(--text-mid)" />
                    <span>Expiry Threshold</span>
                    <button type="button" className="unit-toggle" onClick={() => toggleUnit(def.key, "expiry")}>
                      switch to {expiryUnit === "hours" ? "days" : "hours"}
                    </button>
                  </div>
                  <NumberField
                    label=""
                    value={hoursToUnit(rule.expiryThresholdHours, expiryUnit)}
                    unit={expiryUnit}
                    onChange={(v) => updateRuleHours(def.key, "expiryThresholdHours", unitToHours(v, expiryUnit))}
                  />
                </div>

                <div>
                  <div className="threshold-field-header">
                    <IconTicket size={13} color="var(--text-mid)" />
                    <span>QR Collection Window</span>
                    <button type="button" className="unit-toggle" onClick={() => toggleUnit(def.key, "window")}>
                      switch to {windowUnit === "hours" ? "days" : "hours"}
                    </button>
                  </div>
                  <NumberField
                    label=""
                    value={hoursToUnit(rule.collectionWindowHours, windowUnit)}
                    unit={windowUnit}
                    onChange={(v) => updateRuleHours(def.key, "collectionWindowHours", unitToHours(v, windowUnit))}
                  />
                </div>
              </div>
            </div>
          );
        })}

        {/* Global fallback card */}
        <div className="card category-rule-card fallback-card">
          <div className="category-rule-head">
            <div className="category-rule-icon" style={{ background: "var(--surface-muted)" }}>
              <IconGlobe size={22} color="var(--text-mid)" />
            </div>
            <div>
              <h3>Global Fallback</h3>
              <span className="category-rule-sublabel">Any other / unlisted category</span>
            </div>
          </div>
          <p className="category-rule-note">Used automatically whenever a donation's category doesn't match one of the rules above.</p>

          <form onSubmit={saveGlobal} className="category-rule-fields">
            <div className="form-row">
              <label>Expiry threshold (days)</label>
              <input
                type="number"
                min={0}
                value={settings.expiryThresholdDays}
                onChange={(e) => setSettings({ ...settings, expiryThresholdDays: Number(e.target.value) })}
              />
            </div>
            <div className="form-row">
              <label>Ticket collection window (hours)</label>
              <input
                type="number"
                min={1}
                value={settings.ticketCollectionWindowHours}
                onChange={(e) => setSettings({ ...settings, ticketCollectionWindowHours: Number(e.target.value) })}
              />
            </div>
            <button className="btn btn-outline btn-sm" disabled={savingGlobal} type="submit">
              {savingGlobal ? "Saving..." : "Save Global Defaults"}
            </button>
            {savedGlobal && <span className="save-ok">✅ Saved</span>}
          </form>
        </div>
      </div>

      <div className="card category-save-bar">
        <div>
          <h3 className="section-title-with-leaf"><IconSettings size={16} color="var(--primary)" /> Category Rules</h3>
          <p className="category-rule-note" style={{ margin: "2px 0 0" }}>
            Threshold checks and QR ticket generation read these category rules first, falling back to the Global Fallback above.
          </p>
        </div>
        <div className="category-save-actions">
          <button className="btn btn-primary" disabled={savingCategories} onClick={saveCategoryRules}>
            {savingCategories ? "Saving..." : "Save Category Rules"}
          </button>
          {savedCategories && <span className="save-ok">✅ Category rules saved</span>}
        </div>
      </div>
    </>
  );
}
