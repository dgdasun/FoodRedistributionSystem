/**
 * One verification status per account, shared by Admin > Users and
 * Admin > Verifications so the two pages can never disagree.
 *
 * `verified` is the source of truth - it is the flag that actually gates what
 * an account can do. `verificationStatus` is only trusted for "rejected": the
 * seed data leaves it at "pending" on accounts that are verified, which used to
 * park fully working accounts in the review queue (where they could never be
 * approved, since approval needs an uploaded document).
 */

/** Roles an admin reviews (BeneficiaryService lists exactly these). */
export const REVIEWED_ROLES = new Set(["donor", "beneficiary", "farm"]);

/** "approved" | "pending" | "rejected", or "active" for roles that are never reviewed. */
export function verificationStatusOf(user) {
  if (!REVIEWED_ROLES.has(user?.role)) return "active";
  if (user.verified) return "approved";
  return user.verificationStatus === "rejected" ? "rejected" : "pending";
}
