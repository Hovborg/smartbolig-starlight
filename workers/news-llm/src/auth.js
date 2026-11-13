// Shared-secret check for the news job. Both values are hashed first so the
// comparison is constant-time regardless of the length of the caller's value.
const encoder = new TextEncoder();
const MIN_SECRET_LENGTH = 32;

async function digest(value) {
  return new Uint8Array(await crypto.subtle.digest("SHA-256", encoder.encode(value)));
}

export async function authorized(request, secret) {
  if (typeof secret !== "string" || secret.length < MIN_SECRET_LENGTH) return false;
  const header = request.headers.get("authorization") || "";
  if (!header.startsWith("Bearer ")) return false;
  const [given, expected] = await Promise.all([digest(header.slice(7)), digest(secret)]);
  return crypto.subtle.timingSafeEqual(given, expected);
}
