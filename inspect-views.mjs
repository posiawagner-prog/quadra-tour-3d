import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import puppeteer from "puppeteer";

const ROOT = path.dirname(fileURLToPath(import.meta.url));
const PORT = 8766;
const ASSETS = "C:/Users/Wagner/.cursor/projects/C-Users-Wagner-AppData-Local-Temp-c70ecfb6-54ba-45a5-bfd7-205822cb34bd/assets";

const server = http.createServer((req, res) => {
  const urlPath = decodeURIComponent((req.url || "/").split("?")[0]);
  const filePath = path.join(ROOT, urlPath === "/" ? "quadra-tour-3d.html" : urlPath);
  fs.readFile(filePath, (err, data) => {
    if (err) { res.writeHead(404); res.end("nf"); return; }
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
await page.goto(`http://127.0.0.1:${PORT}/quadra-tour-3d.html`, { waitUntil: "networkidle0", timeout: 90000 });
await page.waitForFunction(() => typeof window.previewCamera === "function", { timeout: 30000 });
await page.evaluate(() => {
  document.body.classList.add("preview", "walking");
  document.getElementById("blocker").style.display = "none";
});
await new Promise((r) => setTimeout(r, 800));

// Approximate image start: outside front fence center looking at LED
await page.evaluate(() => {
  // COURT.z+COURT.d = 313.51, fence ~ there; stand just outside
  window.previewCamera(111, 320, 1.55, [111, 45, 2.2]);
});
await new Promise((r) => setTimeout(r, 400));
await page.screenshot({ path: path.join(ASSETS, "inspect-start-outside.png") });

await page.evaluate(() => window.previewCamera(206, 320, 1.55, [111, 100, 1.8]));
await new Promise((r) => setTimeout(r, 300));
await page.screenshot({ path: path.join(ASSETS, "inspect-gate-outside.png") });

await page.evaluate(() => window.previewCamera(111, 280, 1.55, [200, 313, 1.0]));
await new Promise((r) => setTimeout(r, 300));
await page.screenshot({ path: path.join(ASSETS, "inspect-fence-bottom.png") });

await browser.close();
server.close();
console.log("screenshots ok");
