import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import puppeteer from "puppeteer";
import ffmpegPath from "ffmpeg-static";
import { spawn } from "node:child_process";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = __dirname;
const OUT_WEBM = path.join(ROOT, "quadra-tour-panoramico.webm");
const OUT_MP4 = path.join(ROOT, "quadra-tour-panoramico.mp4");
const PORT = 8765;

const mime = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript",
  ".mjs": "text/javascript",
  ".css": "text/css",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".svg": "image/svg+xml",
  ".webp": "image/webp",
};

const server = http.createServer((req, res) => {
  const urlPath = decodeURIComponent((req.url || "/").split("?")[0]);
  let filePath = path.join(ROOT, urlPath === "/" ? "quadra-tour-3d.html" : urlPath);
  if (!filePath.startsWith(ROOT)) {
    res.writeHead(403);
    res.end("Forbidden");
    return;
  }
  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(404);
      res.end("Not found");
      return;
    }
    res.writeHead(200, { "Content-Type": mime[path.extname(filePath)] || "application/octet-stream" });
    res.end(data);
  });
});

function runFfmpeg(args) {
  return new Promise((resolve, reject) => {
    const p = spawn(ffmpegPath, args, { stdio: ["ignore", "inherit", "inherit"] });
    p.on("exit", (code) => (code === 0 ? resolve() : reject(new Error("ffmpeg exit " + code))));
  });
}

await new Promise((resolve) => server.listen(PORT, "127.0.0.1", resolve));
console.log("Servidor em http://127.0.0.1:" + PORT);

const browser = await puppeteer.launch({
  headless: true,
  defaultViewport: { width: 1280, height: 720, deviceScaleFactor: 1 },
  args: [
    "--autoplay-policy=no-user-gesture-required",
    "--use-fake-ui-for-media-stream",
    "--disable-web-security",
    "--allow-file-access-from-files",
    "--enable-webgl",
    "--ignore-gpu-blocklist",
    "--use-gl=angle",
  ],
});

const page = await browser.newPage();
page.setDefaultTimeout(300000);

const client = await page.createCDPSession();
await client.send("Browser.setDownloadBehavior", {
  behavior: "allow",
  downloadPath: ROOT,
  eventsEnabled: true,
});

let downloadPromise = new Promise((resolve) => {
  client.on("Browser.downloadProgress", (e) => {
    if (e.state === "completed") resolve(e);
  });
});

console.log("Abrindo tour e gravando… (pode levar ~1–2 min)");
await page.goto(`http://127.0.0.1:${PORT}/quadra-tour-3d.html?record=1`, {
  waitUntil: "networkidle0",
  timeout: 120000,
});

await page.waitForFunction(
  () => document.title.startsWith("TOUR_RECORD_DONE") || document.title === "TOUR_RECORD_ERROR",
  { timeout: 240000 }
);

const title = await page.title();
if (title === "TOUR_RECORD_ERROR") {
  const err = await page.evaluate(() => window.__tourRecordError || "unknown");
  await browser.close();
  server.close();
  throw new Error("Falha na gravação: " + err);
}

// Prefer blob exported from page (mais confiável que download)
const b64 = await page.evaluate(async () => {
  const blob = window.__lastTourBlob;
  if (!blob) return null;
  const buf = await blob.arrayBuffer();
  let binary = "";
  const bytes = new Uint8Array(buf);
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return btoa(binary);
});

await browser.close();
server.close();

if (!b64) {
  // espera download se blob não veio
  await Promise.race([
    downloadPromise,
    new Promise((_, rej) => setTimeout(() => rej(new Error("Sem blob e sem download")), 15000)),
  ]);
} else {
  fs.writeFileSync(OUT_WEBM, Buffer.from(b64, "base64"));
  console.log("WEBM salvo:", OUT_WEBM, "(" + fs.statSync(OUT_WEBM).size + " bytes)");
}

if (!fs.existsSync(OUT_WEBM)) {
  throw new Error("Arquivo WEBM não encontrado após gravação");
}

console.log("Convertendo para MP4…");
await runFfmpeg([
  "-y",
  "-i", OUT_WEBM,
  "-vf", "fps=30",
  "-c:v", "libx264",
  "-pix_fmt", "yuv420p",
  "-preset", "fast",
  "-crf", "20",
  "-movflags", "+faststart",
  "-an",
  OUT_MP4,
]);
console.log("MP4 pronto:", OUT_MP4, "(" + fs.statSync(OUT_MP4).size + " bytes)");
