import { mkdir, rm, writeFile } from "node:fs/promises";
import path from "node:path";

const source = "https://sentimentlab-ziwexqtc.manus.space/";
const outDir = path.resolve("dist/public");

const response = await fetch(source, { cache: "no-store" });
if (!response.ok) throw new Error(`Could not fetch published app: ${response.status}`);
let html = await response.text();

await rm(outDir, { recursive: true, force: true });
await mkdir(outDir, { recursive: true });

const assetUrls = new Set();
for (const match of html.matchAll(/(?:src|href)="([^"]+)"/g)) {
  const value = match[1];
  if (value.startsWith("/assets/") || value.startsWith("/__manus/pwa/")) {
    assetUrls.add(new URL(value, source).href);
  }
}

for (const assetUrl of assetUrls) {
  const assetResponse = await fetch(assetUrl, { cache: "no-store" });
  if (!assetResponse.ok) throw new Error(`Could not fetch asset ${assetUrl}: ${assetResponse.status}`);
  const relativePath = new URL(assetUrl).pathname.replace(/^\//, "");
  const target = path.join(outDir, relativePath);
  await mkdir(path.dirname(target), { recursive: true });
  let asset = Buffer.from(await assetResponse.arrayBuffer());
  if (relativePath.endsWith(".css")) {
    asset = Buffer.from(asset.toString("utf8").replaceAll("url(/assets/", "url("), "utf8");
  }
  await writeFile(target, asset);
  const rootPath = `/${relativePath}`;
  html = html.split(`="${rootPath}`).join(`="./${relativePath}`);
}

 const pathShim = '<script>if(location.pathname.startsWith("/Sentiment-Analysis")){var p=location.pathname.slice("/Sentiment-Analysis".length)||"/";history.replaceState(null,"",p+location.search+location.hash)}</script>';
 html = html.replace('<div id="root"></div>', `${pathShim}<div id="root"></div>`);
 await writeFile(path.join(outDir, "index.html"), html);
console.log(`Mirrored ${source} with ${assetUrls.size} local assets into ${outDir}`);
