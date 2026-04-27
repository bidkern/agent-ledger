const FALLBACK_APP_URL = "http://localhost:3260";

export function getAppUrl() {
  const configured = process.env.APP_URL?.trim();

  try {
    return new URL(configured || FALLBACK_APP_URL);
  } catch {
    return new URL(FALLBACK_APP_URL);
  }
}

export function getAppUrlString() {
  return getAppUrl().toString().replace(/\/$/, "");
}
