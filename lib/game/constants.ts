export const BOARD_SIZE = 10;

/** Standard fleet for this PoC: 4,3,3,2,2,2,1,1,1,1 */
export const FLEET_LENGTHS = [4, 3, 3, 2, 2, 2, 1, 1, 1, 1] as const;

export const SHIP_NAMES: Record<number, string> = {
  4: "Cruiser",
  3: "Submarine",
  2: "Destroyer",
  1: "Patrol boat",
};
