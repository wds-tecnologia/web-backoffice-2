/**
 * Serverless function que serve o manifest.json.
 * Evita 403 em arquivos estáticos quando o Vercel Firewall/Checkpoint bloqueia.
 */

const manifest = {
  short_name: "Pet Store",
  name: "Pet Store",
  icons: [
    { src: "favicon.ico", sizes: "64x64 32x32 24x24 16x16", type: "image/x-icon" },
    { src: "favicon.ico", type: "image/png", sizes: "192x192" },
    { src: "favicon.ico", type: "image/png", sizes: "512x512" },
  ],
  start_url: ".",
  display: "standalone",
  theme_color: "#000000",
  background_color: "#ffffff",
};

module.exports = (req, res) => {
  res.setHeader("Content-Type", "application/manifest+json");
  res.setHeader("Cache-Control", "public, max-age=86400");
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.status(200).json(manifest);
};
