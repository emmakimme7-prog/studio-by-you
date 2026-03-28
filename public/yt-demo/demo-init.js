// Demo mode: disable remote API calls, auto-authenticate admin
window.TY_CONFIG = { remoteApiBase: null };

try {
  localStorage.setItem(
    "fit_pick_admin_session",
    JSON.stringify({
      authenticated: true,
      expiresAt: Date.now() + 7 * 24 * 60 * 60 * 1000,
    })
  );
} catch (e) {}
