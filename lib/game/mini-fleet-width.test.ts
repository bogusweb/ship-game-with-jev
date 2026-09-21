import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";

function css(path: string) {
  return readFileSync(path, "utf8");
}

function rule(source: string, selector: string) {
  const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const match = source.match(new RegExp(`${escaped}\\s*\\{[^}]*\\}`));
  assert.ok(match, `missing CSS rule ${selector}`);
  return match[0];
}

describe("mini-fleet fills the battle sidebar", () => {
  it("keeps Paweł's 550px desktop column", () => {
    const globals = css("app/globals.css");
    assert.match(globals, /--sj-layout-column:\s*550px/);
    const chrome = css("app/styles/nocna-wachta-chrome.css");
    assert.match(
      chrome,
      /grid-template-columns:\s*var\(--sj-layout-column\)\s+1fr/,
    );
    const wide = css("app/styles/nocna-wachta-responsive-wide.css");
    assert.doesNotMatch(wide, /grid-template-columns:\s*296px/);
  });

  it("does not inset .mini-fleet to the 296px mockup width", () => {
    const chrome = css("app/styles/nocna-wachta-chrome.css");
    const block = rule(chrome, ".night .mini-fleet");
    assert.doesNotMatch(block, /max-width:\s*var\(--sj-layout-sidebar\)/);
    assert.doesNotMatch(block, /max-width:\s*296px/);
    assert.match(block, /width:\s*100%/);
  });

  it("lets the mini board grow with the sidebar tile", () => {
    const chrome = css("app/styles/nocna-wachta-chrome.css");
    const block = rule(chrome, ".night .mini-fleet .board-art");
    assert.doesNotMatch(block, /max-width:\s*var\(--sj-layout-mini-board\)/);
    assert.doesNotMatch(block, /max-width:\s*270px/);
    assert.match(block, /max-width:\s*100%/);
  });

  it("does not recap the mini board at 210px on short desktop", () => {
    const wide = css("app/styles/nocna-wachta-responsive-wide.css");
    assert.doesNotMatch(
      wide,
      /\.night \.mini-fleet \.board-art\s*\{[^}]*max-width:\s*210px/,
    );
  });
});
