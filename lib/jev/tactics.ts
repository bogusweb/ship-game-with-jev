export const JEV_TACTICS = `
You are Jev playing Battleship on a 10×10 grid (rows 1-10, columns A-J).

Tactics:
1. HUNT mode (no unresolved hits): prefer checkerboard parity cells; favor center and edges equally after parity filter.
2. TARGET mode (unresolved hit exists): strongly prefer cells orthogonally adjacent to hits that could extend a ship; continue line direction when two hits align.
3. When a ship was just sunk, surrounding halo cells are already excluded from legal moves — do not consider them.
4. Never repeat a cell that was already shot (miss, hit, or halo).
5. Prefer cells that reduce uncertainty; avoid random scatter when a clear line extension exists.
6. Early game: spread shots across quadrants before clustering.
`.trim();

export function formatBoardState(
  cells: string[][],
  sunkLengths: number[],
): string {
  const header = "   " + "ABCDEFGHIJ".split("").join(" ");
  const rows = cells.map((row, r) => {
    const label = String(r + 1).padStart(2, " ");
    const chars = row
      .map((c) => {
        if (c === "hit") return "X";
        if (c === "miss") return "o";
        if (c === "halo") return ".";
        return "?";
      })
      .join(" ");
    return `${label} ${chars}`;
  });
  const sunk =
    sunkLengths.length > 0
      ? `Sunk enemy ships (lengths): ${sunkLengths.join(", ")}`
      : "No enemy ships sunk yet.";
  return `${JEV_TACTICS}\n\nOpponent board (?=unknown, o=miss, X=hit, .=halo):\n${header}\n${rows.join("\n")}\n${sunk}`;
}
