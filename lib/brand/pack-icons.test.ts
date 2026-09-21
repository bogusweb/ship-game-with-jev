import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, it } from "node:test";
import { materializePackIcons } from "./materialize-pack-icons";
import { PACK_ICON_FILES } from "./pack-icons";

const PNG = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
const ICO = Buffer.from([0x00, 0x00, 0x01, 0x00]);

const PACK_HASHES: Record<string, { size: number; sha256: string }> = {
  "favicon.ico": {
    size: 2166,
    sha256: "c84ad9de321d1ba348f146c9df6d12845e332de49f50537b55bdad88804702e3",
  },
  "apple-touch-icon.png": {
    size: 2506,
    sha256: "29082853e1b1a6e5194e4cd2dd17c5d3733cd2b862667d6c930d9fe5e71a519b",
  },
  "favicon-16x16.png": {
    size: 407,
    sha256: "710af66ee98fd7f30bc3dc9fab86ee23c0cc5d74378732d362acb1a5fc0f37a4",
  },
  "favicon-32x32.png": {
    size: 711,
    sha256: "d3fae2531da6114fc2f5524285cf7a19ee3a95eec0f17e070492674f65c943ab",
  },
  "favicon-48x48.png": {
    size: 994,
    sha256: "317577ab0b5cedb1416e38cceea7b36c442421c347a843bf32aabcc97b7db6c6",
  },
  "icon-192.png": {
    size: 2702,
    sha256: "e322d403e7b63bad32248595e34ee37f2b14fb51bf0938196d229138f158fb61",
  },
  "icon-512.png": {
    size: 11118,
    sha256: "be22b44b97f1334df74962e8a1af3ec606e51f927ff53a0f83cd6a3a16bc9b7f",
  },
  "icon-maskable-512.png": {
    size: 11167,
    sha256: "e9316e39c4a90e735e0ec236bde70858e3c7700740b282ad91b827ce73911b37",
  },
};

describe("marketing pack icons", () => {
  it("decodes to the pack ICO/PNG byte-for-byte", () => {
    for (const [name, meta] of Object.entries(PACK_HASHES)) {
      const buf = Buffer.from(PACK_ICON_FILES[name as keyof typeof PACK_ICON_FILES], "base64");
      assert.equal(buf.length, meta.size, name);
      assert.equal(createHash("sha256").update(buf).digest("hex"), meta.sha256, name);
      if (name.endsWith(".png")) {
        assert.ok(buf.subarray(0, 8).equals(PNG), name);
      } else {
        assert.ok(buf.subarray(0, 4).equals(ICO), name);
      }
    }
  });

  it("writes App Router and public icon files", () => {
    const root = join(process.cwd());
    materializePackIcons(root);
    const ico = readFileSync(join(root, "app/favicon.ico"));
    const apple = readFileSync(join(root, "app/apple-icon.png"));
    const png192 = readFileSync(join(root, "public/brand/favicons/icon-192.png"));
    assert.equal(
      createHash("sha256").update(ico).digest("hex"),
      PACK_HASHES["favicon.ico"].sha256,
    );
    assert.equal(
      createHash("sha256").update(apple).digest("hex"),
      PACK_HASHES["apple-touch-icon.png"].sha256,
    );
    assert.equal(
      createHash("sha256").update(png192).digest("hex"),
      PACK_HASHES["icon-192.png"].sha256,
    );
  });
});
