import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { PACK_ICON_FILES } from "./pack-icons";

function writeIfChanged(path: string, buf: Buffer) {
  try {
    if (readFileSync(path).equals(buf)) return;
  } catch {
    // File is missing or unreadable; write it.
  }
  writeFileSync(path, buf);
}

/** Write pack ICO/PNG files for Next.js metadata conventions and `/brand/favicons/`. */
export function materializePackIcons(root = process.cwd()) {
  const publicDir = join(root, "public/brand/favicons");
  mkdirSync(publicDir, { recursive: true });
  for (const [name, b64] of Object.entries(PACK_ICON_FILES)) {
    writeIfChanged(join(publicDir, name), Buffer.from(b64, "base64"));
  }
  const faviconIco = Buffer.from(PACK_ICON_FILES["favicon.ico"], "base64");
  const appleTouch = Buffer.from(
    PACK_ICON_FILES["apple-touch-icon.png"],
    "base64",
  );
  writeIfChanged(join(root, "public/favicon.ico"), faviconIco);
  writeIfChanged(join(root, "public/apple-touch-icon.png"), appleTouch);
}
