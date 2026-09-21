import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { materializePackIcons } from "./materialize-pack-icons";
import AppleIcon from "../../app/apple-icon";

const ROOT = process.cwd();

const PACK_LOGO_HORIZONTAL_ON_DARK =
  "92ce2a92fbd1d6ef0a15a0dfe0d2707eeef0f023407db081f5521d0ce8d1be39";
const PACK_SYMBOL_LIME =
  "c33e658d8b6dc05091c716aa8abd573578e4840f8c28f9611440c3d435a6213d";
const PACK_FAVICON_ICO =
  "c84ad9de321d1ba348f146c9df6d12845e332de49f50537b55bdad88804702e3";
const PACK_APPLE_TOUCH =
  "29082853e1b1a6e5194e4cd2dd17c5d3733cd2b862667d6c930d9fe5e71a519b";
const PACK_FAVICON_SVG =
  "684c3fe9c54a46b8519d6286ef6620a3f6af86d6556fe784828a26a611f4e25e";

function sha256(path: string) {
  return createHash("sha256").update(readFileSync(path)).digest("hex");
}

function gitCheckIgnore(path: string): string {
  try {
    return execFileSync("git", ["check-ignore", "-v", path], {
      encoding: "utf8",
      cwd: ROOT,
    }).trim();
  } catch (err) {
    const e = err as { status?: number };
    if (e.status === 1) return "";
    throw err;
  }
}

describe("marketing pack logotype in chrome", () => {
  it("TopBar uses pack horizontal-on-dark and lime symbol, not the prototype ship icon", () => {
    const src = readFileSync("components/game/nocna-wachta/chrome.tsx", "utf8");
    const start = src.indexOf("export function TopBar");
    const end = src.indexOf("export type TurnPillKind");
    const topBar = src.slice(start, end);
    assert.match(topBar, /logo-horizontal-on-dark\.svg/);
    assert.match(topBar, /symbol-lime\.svg/);
    assert.match(topBar, /alt=["']Sink Jev["']/);
    assert.doesNotMatch(topBar, /Icon name="logo"/);
    assert.doesNotMatch(topBar, /chrome\.wordmark/);
    assert.doesNotMatch(topBar, /<a className="wordmark"/);
    assert.doesNotMatch(topBar, /href=["']\/["']/);
  });

  it("serves pack logotype SVGs under public/brand/logo", () => {
    assert.equal(
      sha256("public/brand/logo/logo-horizontal-on-dark.svg"),
      PACK_LOGO_HORIZONTAL_ON_DARK,
    );
    assert.equal(sha256("public/brand/logo/symbol-lime.svg"), PACK_SYMBOL_LIME);
  });

  it("replaces nocna-wachta ikona-logo with the pack lime symbol", () => {
    assert.equal(sha256("public/nocna-wachta/ikona-logo.svg"), PACK_SYMBOL_LIME);
  });
});

describe("served pack favicon rasters", () => {
  const trackedSvg = [
    "app/icon.svg",
    "app/apple-icon.ts",
    "public/brand/favicons/favicon.svg",
  ];

  it("does not gitignore public ICO/PNG favicons", () => {
    const gitignore = readFileSync(".gitignore", "utf8");
    assert.doesNotMatch(gitignore, /\/app\/favicon\.ico/);
    assert.doesNotMatch(gitignore, /\/app\/apple-icon\.png/);
    assert.doesNotMatch(gitignore, /\/public\/brand\/favicons\/\*\.png/);
    assert.doesNotMatch(gitignore, /\/public\/brand\/favicons\/favicon\.ico/);
    for (const path of [
      "public/favicon.ico",
      "public/apple-touch-icon.png",
      "public/brand/favicons/favicon.ico",
      "public/brand/favicons/apple-touch-icon.png",
    ]) {
      assert.equal(gitCheckIgnore(path), "", path);
    }
  });

  it("serves pack favicon.ico from public and apple-touch from App Router", async () => {
    materializePackIcons(ROOT);
    const ico = readFileSync("public/favicon.ico");
    assert.equal(createHash("sha256").update(ico).digest("hex"), PACK_FAVICON_ICO);
    const res = AppleIcon();
    const apple = Buffer.from(await res.arrayBuffer());
    assert.equal(
      createHash("sha256").update(apple).digest("hex"),
      PACK_APPLE_TOUCH,
    );
  });

  it("ships pack favicon SVG and the App Router Apple icon module", () => {
    for (const path of trackedSvg) {
      assert.equal(sha256(path).length, 64, path);
    }
    assert.equal(sha256("app/icon.svg"), PACK_FAVICON_SVG);
    assert.equal(sha256("public/brand/favicons/favicon.svg"), PACK_FAVICON_SVG);
    assert.match(
      readFileSync("app/apple-icon.ts", "utf8"),
      /PACK_ICON_FILES\["apple-touch-icon\.png"\]/,
    );
  });
});
