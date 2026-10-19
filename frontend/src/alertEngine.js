// Threshold & unclaimed-food evaluator for the Alert & Notification Engine.
//
// Pure functions only — no React, no fetch, no localStorage. Given a donation
// listing, its request count, and the admin's System Settings, this module
// decides which alert state(s) currently apply. Keeping it pure makes it easy
// to reason about (and unit-test) independently of how/when it gets polled.

/** Rule-map keys, mirrored from Settings.java on the backend. */
const CATEGORY_RULE_KEYS = {
  COOKED_BAKERY: "cooked_bakery",
  PERISHABLE_DAIRY: "perishable_dairy",
  PACKAGED_DRY: "packaged_dry",
};

/**
 * Maps a free-text donation category ("Bakery", "Dairy", "Packaged Goods", ...)
 * to one of the configured category-rule keys. Mirrors
 * SettingsService#resolveCategoryKey so a listing picks up the exact same rule
 * here as it does on the server.
 */
export function resolveCategoryKey(rawCategory) {
  if (!rawCategory) return null;
  const c = rawCategory.toLowerCase();
  if (/(cook|bake|bread|meal|hot food)/.test(c)) return CATEGORY_RULE_KEYS.COOKED_BAKERY;
  if (/(dairy|milk|veg|fruit|produce|perishable)/.test(c)) return CATEGORY_RULE_KEYS.PERISHABLE_DAIRY;
  if (/(pack|dry|canned|ration|grain)/.test(c)) return CATEGORY_RULE_KEYS.PACKAGED_DRY;
  return null;
}

/**
 * Resolves the { expiryThresholdHours, collectionWindowHours } pair that
 * applies to this item's category, falling back to the settings' global
 * defaults when no category rule matches.
 */
export function ruleFor(category, settings) {
  const key = resolveCategoryKey(category);
  const rule = key && settings?.categoryRules?.[key];
  if (rule) return rule;
  return {
    expiryThresholdHours: (settings?.expiryThresholdDays ?? 3) * 24,
    collectionWindowHours: settings?.ticketCollectionWindowHours ?? 24,
  };
}

// A donation's expiryDate is a calendar date with no time-of-day, so "expiry"
// is treated as the end of that day — the last moment it's still fit to eat.
function endOfDay(dateStr) {
  return new Date(`${dateStr}T23:59:59.999`);
}

export const ALERT_STATES = {
  UNCLAIMED: "unclaimed",
  URGENT: "urgent",
  EXPIRED: "expired",
};

const UNCLAIMED_AFTER_HOURS = 1;

/**
 * Evaluates one donation listing against "now" and the admin-configured
 * thresholds, returning the alert state(s) that currently apply.
 *
 * - EXPIRED wins outright — once shelf life is over, "unclaimed" and "urgent"
 *   no longer mean anything, the item is simply rerouted.
 * - UNCLAIMED and URGENT are independent and can both be true at once (e.g. a
 *   cooked meal that's had zero requests AND is about to expire).
 */
export function evaluateItem(item, requestCount, settings, now = new Date()) {
  if (!item?.expiryDate || !item?.createdAt) return { states: [], hoursRemaining: null };

  const expiresAt = endOfDay(item.expiryDate);
  const createdAt = new Date(item.createdAt);
  const hoursRemaining = (expiresAt.getTime() - now.getTime()) / 3_600_000;
  const hoursListed = (now.getTime() - createdAt.getTime()) / 3_600_000;

  if (hoursRemaining <= 0) {
    return { states: [ALERT_STATES.EXPIRED], hoursRemaining };
  }

  const states = [];
  const { expiryThresholdHours } = ruleFor(item.category, settings);

  if (hoursListed >= UNCLAIMED_AFTER_HOURS && requestCount === 0) {
    states.push(ALERT_STATES.UNCLAIMED);
  }
  if (hoursRemaining <= expiryThresholdHours) {
    states.push(ALERT_STATES.URGENT);
  }
  return { states, hoursRemaining };
}

/**
 * Turns an active alert state into the user-facing notification copy.
 * `type` follows the { info | warning | urgent } vocabulary the bell renders.
 */
export function buildAlert(item, state, hoursRemaining) {
  switch (state) {
    case ALERT_STATES.UNCLAIMED:
      return {
        title: "Unclaimed Food",
        message: `⚠️ Unclaimed Food: ${item.name} has had no claims for 1 hour. Available for immediate pickup!`,
        type: "warning",
      };

    case ALERT_STATES.URGENT: {
      const hours = Math.max(1, Math.round(hoursRemaining));
      return {
        title: "Urgent Expiry Alert",
        message: `🚨 Urgent Expiry Alert: ${item.name} expires in ${hours} hour${hours === 1 ? "" : "s"}! Priority matching active.`,
        type: "urgent",
      };
    }

    case ALERT_STATES.EXPIRED:
      return {
        title: "Rerouted to Composting",
        message: `🌱 Rerouted to Composting: ${item.name} is no longer suitable for human meals and routed to Farm Partners.`,
        type: "info",
      };

    default:
      return null;
  }
}
