import React, { useEffect, useMemo, useState } from "react";
import { Minus, Plus, Zap, Clock3, RotateCcw, Save, Loader2, Info, Check } from "lucide-react";
import { api } from "../api.js";
import { useToast } from "../components/Toast.jsx";
import {
  IconFoodPlate,
  IconMilkCarton,
  IconPackageBox,
  IconGlobe,
  IconClock,
  IconTicket,
} from "../components/Icons.jsx";
import "../styles/admin-settings.css";

const CATEGORY_DEFS = [
  {
    key: "cooked_bakery",
    label: "Cooked Food & Bakery",
    sublabel: "Meals, bread, pastries",
    icon: IconFoodPlate,
    tone: "warn",
    note: "Short window prevents cooked items from spoiling before beneficiary pickup.",
    expiryUnit: "hours",
    windowUnit: "hours",
  },
  {
    key: "perishable_dairy",
    label: "Perishables & Dairy",
    sublabel: "Fruits, veggies, milk",
    icon: IconMilkCarton,
    tone: "info",
    note: "Gives NGOs a realistic pickup window while produce and dairy are still safe to use.",
    expiryUnit: "days",
    windowUnit: "hours",
  },
  {
    key: "packaged_dry",
    label: "Packaged & Dry Rations",
    sublabel: "Canned, dry and boxed goods",
    icon: IconPackageBox,
    tone: "brown",
    note: "Long shelf life allows a wider collection window without added spoilage risk.",
    expiryUnit: "days",
    windowUnit: "hours",
  },
];

const PRESETS = {
  strict: {
    label: "Strict / Rapid",
    Icon: Zap,
    description: "Tight thresholds and short pickup windows - pushes items out fast.",
    global: { expiryThresholdDays: 2, ticketCollectionWindowHours: 12 },
    categoryRules: {
      cooked_bakery: { expiryThresholdHours: 2, collectionWindowHours: 1 },
      perishable_dairy: { expiryThresholdHours: 24, collectionWindowHours: 6 },
      packaged_dry: { expiryThresholdHours: 96, collectionWindowHours: 24 },
    },
  },
  relaxed: {
    label: "Relaxed timing",
    Icon: Clock3,
    description: "Wider thresholds and longer pickup windows - more flexibility for logistics.",
    global: { expiryThresholdDays: 5, ticketCollectionWindowHours: 48 },
    categoryRules: {
      cooked_bakery: { expiryThresholdHours: 6, collectionWindowHours: 4 },
      perishable_dairy: { expiryThresholdHours: 48, collectionWindowHours: 24 },
      packaged_dry: { expiryThresholdHours: 168, collectionWindowHours: 48 },
    },
  },
};

const hoursToUnit = (hours, unit) => (unit === "days" ? Math.round((hours / 24) * 10) / 10 : hours);
const unitToHours = (value, unit) => {
  const n = Number(value) || 0;
  return unit === "days" ? Math.round(n * 24) : Math.round(n);
};

/** "36 hours" -> "1.5 days"; keeps the preview readable whatever unit is being edited. */
function humanHours(h) {
  const n = Number(h) || 0;
  if (n >= 24 && n % 24 === 0) return `${n / 24} day${n === 24 ? "" : "s"}`;
  if (n >= 48) return `${Math.round((n / 24) * 10) / 10} days`;
  return `${n} hour${n === 1 ? "" : "s"}`;
}

const sameRules = (a, b) =>
  CATEGORY_DEFS.every(
    (d) =>
      Number(a?.[d.key]?.expiryThresholdHours) === Number(b?.[d.key]?.expiryThresholdHours) &&
      Number(a?.[d.key]?.collectionWindowHours) === Number(b?.[d.key]?.collectionWindowHours)
  );
const sameGlobal = (a, b) =>
  Number(a?.expiryThresholdDays) === Number(b?.expiryThresholdDays) &&
  Number(a?.ticketCollectionWindowHours) === Number(b?.ticketCollectionWindowHours);

/** Number input with -/+ steppers and an hours/days switch. */
function DurationField({ id, label, Icon, value, unit, onChange, onUnit, units = ["hours", "days"], min = 0 }) {
  const step = unit === "days" ? 0.5 : 1;
  const bump = (dir) => onChange(Math.max(min, Math.round((Number(value || 0) + dir * step) * 10) / 10));
  return (
    <div className="st-field">
      <div className="st-field-head">
        <label htmlFor={id}><Icon size={14} color="currentColor" /> {label}</label>
        {units.length > 1 && (
          <div className="st-units" role="radiogroup" aria-label={`${label} unit`}>
            {units.map((u) => (
              <button key={u} type="button" role="radio" aria-checked={unit === u} className={unit === u ? "active" : ""} onClick={() => onUnit(u)}>
                {u}
              </button>
            ))}
          </div>
        )}
      </div>
      <div className="st-input">
        <button type="button" onClick={() => bump(-1)} aria-label={`Decrease ${label}`} disabled={Number(value) <= min}><Minus size={15} /></button>
        <input id={id} type="number" min={min} step={step} value={value} onChange={(e) => onChange(e.target.value)} />
        <span className="st-unit">{unit}</span>
        <button type="button" onClick={() => bump(1)} aria-label={`Increase ${label}`}><Plus size={15} /></button>
      </div>
    </div>
  );
}

export default function AdminSettings() {
  const toast = useToast();
  const [saved, setSaved] = useState(null); // last values from the server
  const [settings, setSettings] = useState(null);
  const [categoryRules, setCategoryRules] = useState(null);
  const [units, setUnits] = useState(() =>
    Object.fromEntries(CATEGORY_DEFS.map((c) => [c.key, { expiry: c.expiryUnit, window: c.windowUnit }]))
  );
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api
      .get("/settings")
      .then((d) => {
        setSaved({ global: d.settings, rules: d.settings.categoryRules || {} });
        setSettings(d.settings);
        setCategoryRules(d.settings.categoryRules || {});
      })
      .catch((e) => toast.error(e.message));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const globalDirty = !!saved && !sameGlobal(settings, saved.global);
  const rulesDirty = !!saved && !sameRules(categoryRules, saved.rules);
  const dirty = globalDirty || rulesDirty;

  // Warn before leaving with unsaved edits.
  useEffect(() => {
    if (!dirty) return undefined;
    const onBefore = (e) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", onBefore);
    return () => window.removeEventListener("beforeunload", onBefore);
  }, [dirty]);

  // The active preset is whichever one the current values match - not just the last button clicked.
  const activePreset = useMemo(() => {
    if (!settings || !categoryRules) return null;
    return (
      Object.entries(PRESETS).find(([, p]) => sameGlobal(settings, p.global) && sameRules(categoryRules, p.categoryRules))?.[0] || null
    );
  }, [settings, categoryRules]);

  const updateRuleHours = (key, field, hours) =>
    setCategoryRules((prev) => ({ ...prev, [key]: { ...prev[key], [field]: hours } }));

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
  };

  const discard = () => {
    setSettings(saved.global);
    setCategoryRules(saved.rules);
  };

  const invalid =
    CATEGORY_DEFS.some((d) => !(Number(categoryRules?.[d.key]?.collectionWindowHours) > 0)) ||
    !(Number(settings?.ticketCollectionWindowHours) > 0);

  const saveAll = async () => {
    if (invalid) {
      toast.error("Every collection window must be longer than zero.");
      return;
    }
    setSaving(true);
    try {
      let nextGlobal = saved.global;
      let nextRules = saved.rules;
      if (globalDirty) {
        const { settings: updated } = await api.patch("/settings", {
          expiryThresholdDays: Number(settings.expiryThresholdDays),
          ticketCollectionWindowHours: Number(settings.ticketCollectionWindowHours),
        });
        nextGlobal = { ...saved.global, ...updated };
      }
      if (rulesDirty) {
        const { settings: updated } = await api.patch("/settings/category-rules", categoryRules);
        nextRules = updated.categoryRules || categoryRules;
      }
      setSaved({ global: nextGlobal, rules: nextRules });
      setSettings(nextGlobal);
      setCategoryRules(nextRules);
      toast.success("Settings saved - new listings and tickets use them right away.");
    } catch (e) {
      toast.error(e.message || "Could not save settings.");
    } finally {
      setSaving(false);
    }
  };

  if (!settings || !categoryRules) return <div className="loading-wrap">Loading settings...</div>;

  return (
    <div className={dirty ? "st-page st-has-bar" : "st-page"}>
      <div className="page-header">
        <h1>System Settings</h1>
        <p>Decide when a donation counts as surplus and how long collectors have to pick it up - per food category.</p>
      </div>

      {/* ---------- Presets ---------- */}
      <section className="st-presets">
        {Object.entries(PRESETS).map(([key, p]) => {
          const active = activePreset === key;
          return (
            <button type="button" key={key} className={active ? "st-preset active" : "st-preset"} onClick={() => applyPreset(key)} aria-pressed={active}>
              <span className="st-preset-icon"><p.Icon size={20} /></span>
              <span className="st-preset-text">
                <strong>{p.label}{active && <em><Check size={11} strokeWidth={3} /> Current</em>}</strong>
                <span>{p.description}</span>
                <span className="st-preset-values">
                  {CATEGORY_DEFS.map((d) => (
                    <i key={d.key}>{d.label.split(" ")[0]} {humanHours(p.categoryRules[d.key].expiryThresholdHours)}</i>
                  ))}
                </span>
              </span>
            </button>
          );
        })}
        <div className={activePreset ? "st-preset st-custom" : "st-preset st-custom active"} aria-hidden={!!activePreset}>
          <span className="st-preset-icon"><IconClock size={20} color="currentColor" /></span>
          <span className="st-preset-text">
            <strong>Custom{!activePreset && <em><Check size={11} strokeWidth={3} /> Current</em>}</strong>
            <span>Edit any value below to fine-tune a single category.</span>
          </span>
        </div>
      </section>

      {/* ---------- Category rules ---------- */}
      <div className="st-grid">
        {CATEGORY_DEFS.map((def) => {
          const Icon = def.icon;
          const rule = categoryRules[def.key] || { expiryThresholdHours: 0, collectionWindowHours: 0 };
          const savedRule = saved.rules[def.key] || {};
          const changed =
            Number(rule.expiryThresholdHours) !== Number(savedRule.expiryThresholdHours) ||
            Number(rule.collectionWindowHours) !== Number(savedRule.collectionWindowHours);
          const expiryUnit = units[def.key].expiry;
          const windowUnit = units[def.key].window;
          const setUnit = (field) => (u) => setUnits((prev) => ({ ...prev, [def.key]: { ...prev[def.key], [field]: u } }));
          return (
            <section className={`st-card st-tone-${def.tone}${changed ? " st-changed" : ""}`} key={def.key}>
              <header className="st-card-head">
                <span className="st-card-icon"><Icon size={22} color="currentColor" /></span>
                <div>
                  <h3>{def.label}</h3>
                  <span>{def.sublabel}</span>
                </div>
                {changed && <span className="st-badge">Edited</span>}
              </header>
              <p className="st-note">{def.note}</p>

              <div className="st-fields">
                <DurationField
                  id={`${def.key}-expiry`}
                  label="Surplus threshold"
                  Icon={IconClock}
                  value={hoursToUnit(rule.expiryThresholdHours, expiryUnit)}
                  unit={expiryUnit}
                  onUnit={setUnit("expiry")}
                  onChange={(v) => updateRuleHours(def.key, "expiryThresholdHours", unitToHours(v, expiryUnit))}
                />
                <DurationField
                  id={`${def.key}-window`}
                  label="Pickup window"
                  Icon={IconTicket}
                  min={0}
                  value={hoursToUnit(rule.collectionWindowHours, windowUnit)}
                  unit={windowUnit}
                  onUnit={setUnit("window")}
                  onChange={(v) => updateRuleHours(def.key, "collectionWindowHours", unitToHours(v, windowUnit))}
                />
              </div>

              <p className="st-preview">
                <Info size={14} />
                <span>
                  Listed as surplus within <strong>{humanHours(rule.expiryThresholdHours)}</strong> of expiry; collectors get{" "}
                  <strong>{humanHours(rule.collectionWindowHours)}</strong> to pick it up once approved.
                </span>
              </p>
            </section>
          );
        })}

        {/* Global fallback */}
        <section className={`st-card st-tone-neutral${globalDirty ? " st-changed" : ""}`}>
          <header className="st-card-head">
            <span className="st-card-icon"><IconGlobe size={22} color="currentColor" /></span>
            <div>
              <h3>Global fallback</h3>
              <span>Any other / unlisted category</span>
            </div>
            {globalDirty && <span className="st-badge">Edited</span>}
          </header>
          <p className="st-note">Used automatically whenever a donation's category doesn't match one of the rules above.</p>
          <div className="st-fields">
            <DurationField
              id="global-expiry"
              label="Surplus threshold"
              Icon={IconClock}
              units={["days"]}
              value={settings.expiryThresholdDays}
              unit="days"
              onUnit={() => {}}
              onChange={(v) => setSettings({ ...settings, expiryThresholdDays: v })}
            />
            <DurationField
              id="global-window"
              label="Pickup window"
              Icon={IconTicket}
              units={["hours"]}
              value={settings.ticketCollectionWindowHours}
              unit="hours"
              onUnit={() => {}}
              onChange={(v) => setSettings({ ...settings, ticketCollectionWindowHours: v })}
            />
          </div>
          <p className="st-preview">
            <Info size={14} />
            <span>
              Listed as surplus within <strong>{humanHours(Number(settings.expiryThresholdDays) * 24)}</strong> of expiry; collectors get{" "}
              <strong>{humanHours(settings.ticketCollectionWindowHours)}</strong>.
            </span>
          </p>
        </section>
      </div>

      <p className="st-footnote">
        Threshold checks and QR ticket generation read the category rules first, then fall back to the global values.
      </p>

      {/* ---------- Save bar ---------- */}
      {dirty && (
        <div className="st-savebar" role="region" aria-label="Unsaved changes">
          <span className="st-savebar-dot" />
          <span className="st-savebar-text">
            <strong>Unsaved changes</strong>
            <span>
              {[rulesDirty && "category rules", globalDirty && "global fallback"].filter(Boolean).join(" and ")}
              {activePreset ? ` · ${PRESETS[activePreset].label} preset` : ""}
            </span>
          </span>
          <button type="button" className="st-btn st-btn-ghost" onClick={discard} disabled={saving}>
            <RotateCcw size={15} /> Discard
          </button>
          <button type="button" className="st-btn st-btn-primary" onClick={saveAll} disabled={saving || invalid}>
            {saving ? <Loader2 size={15} className="st-spin" /> : <Save size={15} />} Save changes
          </button>
        </div>
      )}
    </div>
  );
}
