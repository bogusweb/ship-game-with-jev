import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { firstEnabledCell, moveRoving, ROVING_ARROWS } from "./roving";

const allOn = () => true;
const skipA1 = (row: number, col: number) => !(row === 0 && col === 0);

describe("keyboard roving", () => {
  it("moves one cell and stops at the edge", () => {
    assert.deepEqual(
      moveRoving({ row: 0, col: 0 }, ROVING_ARROWS.ArrowRight, allOn),
      { row: 0, col: 1 },
    );
    assert.deepEqual(
      moveRoving({ row: 0, col: 0 }, ROVING_ARROWS.ArrowUp, allOn),
      { row: 0, col: 0 },
    );
    assert.deepEqual(
      moveRoving({ row: 9, col: 9 }, ROVING_ARROWS.ArrowDown, allOn),
      { row: 9, col: 9 },
    );
  });

  it("skips disabled cells in the travel direction", () => {
    assert.deepEqual(
      moveRoving({ row: 0, col: 1 }, ROVING_ARROWS.ArrowLeft, skipA1),
      { row: 0, col: 1 },
    );
    const missFirstCol = (row: number, col: number) => col !== 0;
    assert.deepEqual(
      moveRoving({ row: 3, col: 1 }, ROVING_ARROWS.ArrowLeft, missFirstCol),
      { row: 3, col: 1 },
    );
    const hole = (row: number, col: number) => !(row === 0 && col === 1);
    assert.deepEqual(
      moveRoving({ row: 0, col: 0 }, ROVING_ARROWS.ArrowRight, hole),
      { row: 0, col: 2 },
    );
  });

  it("finds the first remaining cell", () => {
    assert.deepEqual(firstEnabledCell(skipA1), { row: 0, col: 1 });
  });
});
