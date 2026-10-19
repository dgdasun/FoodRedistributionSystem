// `user.avatar` holds an uploaded photo URL, but older/seeded accounts store a
// single initial there (e.g. "R"). Only treat it as an image when it is a URL.
export function avatarUrl(user) {
  const value = user?.avatar;
  if (typeof value !== "string") return null;
  return value.startsWith("/") || /^https?:\/\//.test(value) ? value : null;
}
