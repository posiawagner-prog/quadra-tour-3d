import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import puppeteer from "puppeteer";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = __dirname;
const OUT = path.join(ROOT, "start-view-tests");
const PORT = 8766;

fs.mkdirSync(OUT, { recursive: true });

const server = http.createServer((req, res) => {
  const urlPath = decodeURIComponent((req.url || "/").split("?")[0]);
  const filePath = path.join(ROOT, urlPath === "/" ? "quadra-tour-3d.html" : urlPath);
  fs.readFile(filePath, (err, data) => {
    if (err) { res.writeHead(404); res.end("nf"); return; }
    const ext = path.extname(filePath);
    const mime = ext === ".html" ? "text/html" : "application/octet-stream";
    res.writeHead(200, { "Content-Type": mime });
    res.end(data);
  });
});
await new Promise((r) => server.listen(PORT, "127.0.0.1", r));

const browser = await puppeteer.launch({
  headless: true,
  defaultViewport: { width: 1280, height: 720 },
  args: ["--enable-webgl", "--ignore-gpu-blocklist", "--use-gl=angle"],
});
const page = await browser.newPage();
await page.goto(`http://127.0.0.1:${PORT}/quadra-tour-3d.html?preview=1`, { waitUntil: "networkidle0", timeout: 120000 });
await page.evaluate(() => {
  document.body.classList.add("preview", "recording");
  document.getElementById("blocker").style.display = "none";
});
await new Promise((r) => setTimeout(r, 1200));

// COURT.z + COURT.d ≈ 313.51 — candidatos fora da grade, olhando o telão
const candidates = [
  { name: "a", x: 111, z: 318, y: 1.7, lx: 111, lz: 80, ly: 2.0 },
  { name: "b", x: 111, z: 316, y: 1.75, lx: 111, lz: 100, ly: 1.8 },
  { name: "c", x: 111, z: 315, y: 1.85, lx: 111, lz: 120, ly: 1.6 },
  { name: "d", x: 111, z: 317, y: 2.1, lx: 111, lz: 90, ly: 1.9 },
  { name: "e", x: 111, z: 320, y: 2.0, lx: 111, lz: 70, ly: 2.2 },
  { name: "f", x: 111, z: 314.5, y: 1.65, lx: 111, lz: 140, ly: 1.5 },
  { name: "g", x: 111, z: 319, y: 1.9, lx: 111, lz: 45, ly: 2.4 },
  { name: "h", x: 111, z: 322, y: 2.2, lx: 111, lz: 60, ly: 2.0 },
];

for (const c of candidates) {
  await page.evaluate((p) => {
    window.previewCamera(p.x, p.z, p.y, [p.lx, p.lz, p.ly]);
  }, c);
  await new Promise((r) => setTimeout(r, 400));
  const file = path.join(OUT, `start-${c.name}.png`);
  await page.screenshot({ path: file, type: "png" });
  console.log("saved", file);
}

await browser.close();
server.close();
console.log("done");
