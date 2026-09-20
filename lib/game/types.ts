export type Orientation = "horizontal" | "vertical";

export type Coord = {
  row: number;
  col: number;
};

export type ShipPlacement = {
  id: string;
  length: number;
  orientation: Orientation;
  origin: Coord;
};

export type Ship = ShipPlacement & {
  cells: Coord[];
  hits: Coord[];
  sunk: boolean;
};

export type ShotCellState = "unknown" | "miss" | "hit" | "halo";

export type PlayerBoard = {
  ships: Ship[];
};

export type OpponentView = {
  /** What the attacker knows about each cell */
  cells: ShotCellState[][];
  sunkShipLengths: number[];
};

export type ShotResult = {
  row: number;
  col: number;
  outcome: "miss" | "hit" | "sunk";
  shipId?: string;
  shipLength?: number;
};

export type GamePhase = "placement" | "playing" | "won" | "lost";

export type GameState = {
  phase: GamePhase;
  playerBoard: PlayerBoard;
  opponentView: OpponentView;
  /** Hidden Jev fleet — never sent to client in production, but used server-side */
  jevBoard: PlayerBoard;
  turn: "player" | "jev";
  moveCount: number;
  /** Latest player fire on Jev's waters; null before the first shot. */
  lastPlayerShot: Coord | null;
  /** Latest Jev fire on the player's fleet; null before the first shot. */
  lastJevShot: Coord | null;
};
