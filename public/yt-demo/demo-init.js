// Demo mode: disable remote API calls, auto-authenticate admin
window.TY_CONFIG = { remoteApiBase: null };

try {
  localStorage.removeItem("fit_pick_site_state");
  localStorage.removeItem("fit_pick_site_state_version");
  localStorage.removeItem("ty_studio_projects");
  localStorage.setItem(
    "fit_pick_admin_session",
    JSON.stringify({
      authenticated: true,
      expiresAt: Date.now() + 7 * 24 * 60 * 60 * 1000,
    })
  );
} catch (e) {}
