/**
 * Railway/Nixpacks: sicherstellen, dass index.html und das referenzierte JS-Bundle zusammenpassen.
 * Verhindert „leises“ Bruchbild: index neu, /assets/*.js fehlt → Express lieferte fälschlich index.html mit MIME text/html.
 */
import fs from "node:fs";
import path from "node:path";

const dist = path.resolve(process.cwd(), "dist");
const indexPath = path.join(dist, "index.html");

if (!fs.existsSync(indexPath)) {
  console.error("verify-spa-dist: dist/index.html fehlt");
  process.exit(1);
}

const html = fs.readFileSync(indexPath, "utf8");
const m = html.match(/\/assets\/([^"'>]+\.js)/);
if (!m) {
  console.error("verify-spa-dist: kein /assets/*.js in index.html");
  process.exit(1);
}

const jsRel = m[1];
const jsPath = path.join(dist, "assets", jsRel);
if (!fs.existsSync(jsPath)) {
  console.error(`verify-spa-dist: referenzierte Datei fehlt: dist/assets/${jsRel}`);
  process.exit(1);
}

const sz = fs.statSync(jsPath).size;
if (sz < 50_000) {
  console.error(`verify-spa-dist: Bundle verdächtig klein (${sz} bytes): dist/assets/${jsRel}`);
  process.exit(1);
}

console.log(`verify-spa-dist: OK  dist/assets/${jsRel}  (${sz} bytes)`);
