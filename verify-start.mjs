import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import puppeteer from "puppeteer";

const ROOT = path.dirname(fileURLToPath(import.meta.url));
const PORT = 8768;
const ASSETS =
  "C:/Users/Wagner/.cursor/projects/C-Users-Wagner-AppData-Local-Temp-c70ecfb6-54ba-45a5-bfd7-205822cb34bd/assets";

const server = http.createServer((req, res) => {
  const urlPath = decodeURIComponent((req.url || "/").split("?")[0]);
  const filePath = path.join(ROOT, urlPath === "/" ? "quadra-tour-3d.html" : urlPath);
  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(404);
      res.end("nf");
      return;
    }
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
await page.goto(`http://127.0.0.1:${PORT}/quadra-tour-3d.html`, {
  waitUntil: "networkidle0",
  timeout: 90000,
});
await page.waitForFunction(() => typeof window.previewCamera === "function", {
  timeout: 30000,
});
await page.evaluate(() => {
  document.body.classList.add("preview", "walking", "recording");
  document.getElementById("blocker").style.display = "none";
  const frontZ = 10.22 + 303.29 + 26;
  window.previewCamera(111, frontZ, 1.48, [111, 170, 1.2]);
});
await new Promise((r) => setTimeout(r, 700));
await page.screenshot({ path: path.join(ASSETS, "verify-image-start.png") });
await browser.close();
server.close();
console.log("verify ok");
