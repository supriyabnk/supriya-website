/* ------------------------------------------------------------------
   Where the Posts page loads its content from.

   After you deploy the Post Studio (the separate "studio" project) on Vercel,
   paste its address below, e.g.  "https://supriya-studio.vercel.app"
   (no slash at the end), then deploy this website again.
------------------------------------------------------------------- */
var STUDIO_URL = "https://supriya-admin.vercel.app";

window.SITE_CONFIG = {
  /* On your own computer the Studio runs at localhost:4000 automatically. */
  API_BASE: (location.hostname === "localhost" || location.hostname === "127.0.0.1") ? "http://localhost:4000" : STUDIO_URL
};
