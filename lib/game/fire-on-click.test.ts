import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  FIRE_ON_CLICK_STORAGE_KEY,
  loadFireOnClick,
  saveFireOnClick,
} from "./fire-on-click";

function mockStorage(): StorageLike {
  const data = new Map<string, string>();
  return {
    getItem: (key) => data.get(key) ?? null,
    setItem: (key, value) => {
      data.set(key, value);
    },
  };
}

type StorageLike = {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
};

describe("fire-on-click preference", () => {
  it("defaults to true when unset", () => {
    assert.equal(loadFireOnClick(mockStorage()), true);
  });

  it("defaults to true without storage", () => {
    assert.equal(loadFireOnClick(null), true);
  });

  it("persists false", () => {
    const storage = mockStorage();
    saveFireOnClick(false, storage);
    assert.equal(storage.getItem(FIRE_ON_CLICK_STORAGE_KEY), "false");
    assert.equal(loadFireOnClick(storage), false);
  });

  it("persists true", () => {
    const storage = mockStorage();
    saveFireOnClick(true, storage);
    assert.equal(loadFireOnClick(storage), true);
  });
});
