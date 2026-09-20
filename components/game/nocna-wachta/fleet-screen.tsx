"use client";

import { FLEET_LENGTHS, cellLabel, getShipCells } from "@/lib/game";
import type { OpponentView, PlayerBoard } from "@/lib/game";
import { ownBoardShips } from "@/lib/game/draft-fleet";
import { shipName, useLocale } from "@/lib/i18n";
import { FleetStrip, ShipDots } from "./chrome";
import { Icon } from "./icons";
import { SeaBoard } from "./sea-board";

export type FleetScreenProps = {
  board: PlayerBoard;
  /** Jev's shots on the player's own board. */
  view: OpponentView;
  focusIndex: number;
  onFocus: (index: number) => void;
  onBack: () => void;
  backLabel: string;
};

export function FleetScreen({
  board,
  view,
  focusIndex,
  onFocus,
  onBack,
  backLabel,
}: FleetScreenProps) {
  const { t } = useLocale();
  const ships = board.ships;
  const intact = ships.filter((ship) => ship.hits.length === 0).length;
  const damaged = ships.filter(
    (ship) => !ship.sunk && ship.hits.length > 0,
  ).length;
  const sunk = ships.filter((ship) => ship.sunk).length;
  const afloat = ships.length - sunk;
  const selected = ships[focusIndex] ?? ships[0];

  const statusOf = (hits: number, isSunk: boolean) =>
    isSunk
      ? t("ship.status.sunk")
      : hits > 0
        ? t("ship.status.damaged")
        : t("ship.status.intact");

  const range = (index: number) => {
    const ship = ships[index];
    if (!ship) return "";
    const cells = getShipCells(ship.origin, ship.length, ship.orientation);
    const first = cellLabel(cells[0].row, cells[0].col);
    if (cells.length === 1) return first;
    const last = cells[cells.length - 1];
    return `${first}–${cellLabel(last.row, last.col)}`;
  };

  return (
    <>
      <header className="fleet-intro">
        <div>
          <p className="eyebrow">{t("fleetPage.eyebrow")}</p>
          <h1>
            {t("fleetPage.titleLine1")}
            <br />
            {t("fleetPage.titleLine2")}
          </h1>
          <p>{t("fleetPage.lede")}</p>
        </div>
        <button type="button" className="secondary" onClick={onBack}>
          ← {backLabel}
        </button>
      </header>

      <div className="fleet-workspace">
        <section className="fleet-map">
          <div className="fleet-map-heading">
            <h2>{t("fleetPage.yourWaters")}</h2>
            <span className="badge">
              <Icon name="shield" />
              {t("sidebar.fleetAfloat", { afloat })}
            </span>
          </div>
          <SeaBoard
            ariaLabel={t("board.yourFleet")}
            cellState={(row, col) => view.cells[row][col]}
            ships={ownBoardShips(board)}
            focusRange={
              selected
                ? {
                    row: selected.origin.row,
                    col: selected.origin.col,
                    length: selected.length,
                    orientation: selected.orientation,
                  }
                : null
            }
          />
          {selected ? (
            <div className="fleet-selected">
              <span>
                <ShipDots length={selected.length} />
                <b>
                  {shipName(t, selected.length)}{" "}
                  {String(focusIndex + 1).padStart(2, "0")}
                </b>
              </span>
              <span className="mono">{range(focusIndex)}</span>
            </div>
          ) : null}
        </section>

        <aside className="fleet-inventory">
          <div className="fleet-summary">
            <div>
              <strong>{intact}</strong>
              <span>{t("fleetPage.intact")}</span>
            </div>
            <div>
              <strong>{damaged}</strong>
              <span>{t("fleetPage.damaged")}</span>
            </div>
            <div>
              <strong>{sunk}</strong>
              <span>{t("fleetPage.sunk")}</span>
            </div>
          </div>
          <h2 className="eyebrow">{t("fleetPage.register")}</h2>
          <div className="fleet-ship-list">
            {ships.map((ship, index) => (
              <button
                key={ship.id || index}
                type="button"
                className={ship.sunk ? "fleet-ship-row lost" : "fleet-ship-row"}
                aria-pressed={focusIndex === index}
                onClick={() => onFocus(index)}
              >
                <span className="ship-order mono">
                  {String(index + 1).padStart(2, "0")}
                </span>
                <ShipDots length={ship.length} />
                <span className="ship-row-name">
                  <strong>{shipName(t, ship.length)}</strong>
                  <small>{range(index)}</small>
                </span>
                <span
                  className={
                    ship.hits.length > 0 ? "ship-health hit" : "ship-health"
                  }
                >
                  {statusOf(ship.hits.length, ship.sunk)}
                </span>
              </button>
            ))}
          </div>
          <p className="fleet-note">
            <Icon name="shield" />
            {t("fleetPage.note")}
          </p>
          <div className="mt-4">
            <FleetStrip
              lengths={FLEET_LENGTHS}
              sunkLengths={ships.filter((s) => s.sunk).map((s) => s.length)}
            />
          </div>
        </aside>
      </div>
    </>
  );
}
