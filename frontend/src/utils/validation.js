// Kept in sync with EMAIL_REGEX in backend-spring RegisterRequestDTO.
// Requires a dotted domain with an alphabetic TLD (rejects "a@b", "a@b.c",
// "a..b@x.com", "a@x..com") — the browser's type="email" check allows these.
export const EMAIL_REGEX =
  /^[A-Za-z0-9_%+-]+(\.[A-Za-z0-9_%+-]+)*@([A-Za-z0-9]([A-Za-z0-9-]*[A-Za-z0-9])?\.)+[A-Za-z]{2,}$/;

export const EMAIL_ERROR = "Please enter a valid email address";

export function isValidEmail(email) {
  return EMAIL_REGEX.test(String(email ?? "").trim());
}

/** Returns an error message for the email, or "" if it is valid. */
export function validateEmail(email) {
  if (!String(email ?? "").trim()) return "Email address is required.";
  return isValidEmail(email) ? "" : EMAIL_ERROR;
}

// Kept in sync with PASSWORD_MIN_LENGTH in backend-spring RegisterRequestDTO.
export const PASSWORD_MIN_LENGTH = 5;

/** Returns an error message for the password, or "" if it is valid. */
export function validatePassword(password) {
  if (!password) return "Password is required.";
  return password.length < PASSWORD_MIN_LENGTH
    ? `Password must be at least ${PASSWORD_MIN_LENGTH} characters long.`
    : "";
}

// Kept in sync with PHONE_REGEX in backend-spring RegisterRequestDTO.
export const PHONE_LENGTH = 10;
export const PHONE_REGEX = /^[0-9]{10}$/;
export const PHONE_ERROR = "Phone number must be exactly 10 digits";

/** Strips non-digit characters and caps the value at PHONE_LENGTH digits. */
export function sanitizePhone(value) {
  return String(value ?? "").replace(/\D/g, "").slice(0, PHONE_LENGTH);
}

/** Returns an error message for the phone number, or "" if it is valid. */
export function validatePhone(phone) {
  if (!String(phone ?? "").trim()) return "Phone number is required.";
  return PHONE_REGEX.test(phone) ? "" : PHONE_ERROR;
}
