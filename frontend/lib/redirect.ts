export function getSafeReturnPath(fallback = "/catalog") {
  if (typeof window === "undefined") return fallback;

  const requestedPath = new URLSearchParams(window.location.search).get("redirect");
  if (!requestedPath || !requestedPath.startsWith("/")) {
    return fallback;
  }

  try {
    const destination = new URL(requestedPath, window.location.origin);
    if (destination.origin !== window.location.origin) return fallback;
    if (["/login", "/signup"].includes(destination.pathname)) return fallback;
    return `${destination.pathname}${destination.search}${destination.hash}`;
  } catch {
    return fallback;
  }
}
