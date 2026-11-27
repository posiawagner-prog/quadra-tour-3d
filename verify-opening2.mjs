import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import puppeteer from "puppeteer";

const ROOT = path.dirname(fileURLToPath(import.meta.url));
const PORT = 8771;
const ASSETS = "C:/Users/Wagner/.cursor/projects/C-Users-Wagner-AppData-Local-Temp-c70ecfb6-54ba-45a5-bfd7-205822cb34bd/assets";
const server = http.createServer((req,res)=>{
  const u=decodeURIComponent((req.url||"/").split("?")[0]);
  fs.readFile(path.join(ROOT,u==="/"?"quadra-tour-3d.html":u),(e,d)=>{if(e){res.writeHead(404);res.end("nf");return;}res.end(d);});
});
await new Promise(r=>server.listen(PORT,"127.0.0.1",r));
const browser=await puppeteer.launch({headless:true,defaultViewport:{width:1280,height:720},args:["--enable-webgl","--ignore-gpu-blocklist","--use-gl=angle"]});
const page=await browser.newPage();
await page.goto(`http://127.0.0.1:${PORT}/quadra-tour-3d.html`,{waitUntil:"networkidle0",timeout:90000});
await page.waitForFunction(()=>typeof window.previewCamera==="function",{timeout:30000});
await page.evaluate(()=>{document.body.classList.add("preview","walking","recording");document.getElementById("blocker").style.display="none";});

// Ângulo parecido com a imagem do usuário: buffet à esquerda, telão à direita, vão no canto
await page.evaluate(()=>window.previewCamera(40, 75, 1.55, [20, 25, 1.05]));
await new Promise(r=>setTimeout(r,500));
await page.screenshot({path:path.join(ASSETS,"verify-buffet-corner.png")});

// Fora no canto esquerdo de trás — deve ver o vão
await page.evaluate(()=>window.previewCamera(5, 5, 1.55, [25, 25, 1.0]));
await new Promise(r=>setTimeout(r,400));
await page.screenshot({path:path.join(ASSETS,"verify-buffet-outside.png")});

// Portão: bem de frente para o vão do GATE
await page.evaluate(()=>window.previewCamera(206.5, 330, 1.55, [206.5, 280, 1.2]));
await new Promise(r=>setTimeout(r,400));
await page.screenshot({path:path.join(ASSETS,"verify-portao-front.png")});

await browser.close(); server.close(); console.log("ok");
