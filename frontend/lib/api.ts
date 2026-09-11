/*
 * Base URL for all API calls made from the browser.
 *
 * Empty string (the default) = same-origin: the browser calls
 * /api/... on this app's own origin, and next.config.ts proxies
 * it to the backend (API_PROXY_TARGET). This keeps cookies
 * first-party and avoids CORS/mixed-content entirely.
 *
 * Never interpolate the env var directly in templates -- an
 * unset var inlines as the string "undefined".
 */
export const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "";
