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

// Role-based redirect paths
export function getRoleBasedRedirectPath(role: string) {
  switch (role) {
    case "master-admin":
      return "/admin";
    case "branch-manager":
      return "/manager";
    case "tailor":
      return "/tailor";
    case "customer":
    default:
      return "/catalog";
  }
}

// Combined function for login redirect
export function getLoginRedirect(role: string, fallback = "/catalog") {
  const requestedPath = getSafeReturnPath(fallback);
  // If user tried to access a specific page before login, respect that
  if (requestedPath !== fallback && !requestedPath.includes("/login") && !requestedPath.includes("/signup")) {
    return requestedPath;
  }
  // Otherwise, go to role-specific dashboard
  return getRoleBasedRedirectPath(role);
}
