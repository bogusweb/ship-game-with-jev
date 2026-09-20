"use client";

import { FLEET_LENGTHS } from "@/lib/game";
import type { DraftShip, Orientation } from "@/lib/game";
import { draftShips } from "@/lib/game/draft-fleet";
import { shipName, useLocale } from "@/lib/i18n";
import { ShipDots } from "./chrome";
import { Icon } from "./icons";
import { SeaBoard } from "./sea-board";

export type SetupScreenProps = {
  draft: (DraftShip | null)[];
  activeIndex: number | null;
  orientation: Orientation;
  hover: { row: number; col: number } | null;
  status: string;
  onSelectSlot: (index: number) => void;
  onRotate: () => void;
  onAutoDeploy: () => void;
  onClear: () => void;
  onPlace: (row: number, col: number) => void;
  onHover: (row: number, col: number) => void;
  onHoverLeave: () => void;
  onStart: () => void;
  placementError: string | null;
};

export function SetupScreen({
  draft,
  activeIndex,
  orientation,
  hover,
  status,
  onSelectSlot,
  onRotate,
  onAutoDeploy,
  onClear,
  onPlace,
  onHover,
  onHoverLeave,
  onStart,
  placementError,
}: SetupScreenProps) {
  const { t } = useLocale();
  const placed = draftShips(draft);
  const complete = placed.length === FLEET_LENGTHS.length;
  const activeLength = activeIndex != null ? FLEET_LENGTHS[activeIndex] : null;

  const ghost =
    hover && activeLength
      ? {
          row: hover.row,
          col: hover.col,
          length: activeLength,
          orientation,
          valid: placementError === null,
        }
      : null;

  return (
    <>
      <header className="fleet-intro">
        <div>
          <p className="eyebrow">{t("setup.eyebrow")}</p>
          <h1>
            {t("setup.titleLine1")}
            <br />
            {t("setup.titleLine2")}
          </h1>
          <p>{t("setup.lede")}</p>
        </div>
        <span className="setup-progress">
          <strong>
            {placed.length}
            <small>/{FLEET_LENGTHS.length}</small>
          </strong>
          <span>{t("setup.progress")}</span>
        </span>
      </header>

      <div className="setup-workspace">
        <aside className="placement-controls">
          <div className="placement-step">
            <span className="step-num">01</span>
            <div>
              <h2>{t("setup.step1Title")}</h2>
              <p>{t("setup.step1Body")}</p>
            </div>
          </div>
          <div className="placement-roster">
            {FLEET_LENGTHS.map((length, index) => {
              const isPlaced = draft[index] !== null;
              return (
                <button
                  key={index}
                  type="button"
                  className={[
                    "placement-item",
                    activeIndex === index ? "active" : "",
                    isPlaced ? "placed" : "",
                  ]
                    .filter(Boolean)
                    .join(" ")}
                  aria-pressed={activeIndex === index}
                  onClick={() => onSelectSlot(index)}
                >
                  <span className="placement-label">
                    {shipName(t, length)}
                    <span>
                      {isPlaced ? "✓" : String(index + 1).padStart(2, "0")}
                    </span>
                  </span>
                  <ShipDots length={length} />
                  <small>
                    {length === 1
                      ? t("setup.cellsOne")
                      : t("setup.cellsMany", { length })}
                    {isPlaced ? ` · ${t("setup.placedMark")}` : ""}
                  </small>
                </button>
              );
            })}
          </div>

          <div className="placement-step second">
            <span className="step-num">02</span>
            <div>
              <h2>{t("setup.step2Title")}</h2>
              <p>{t("setup.step2Body")}</p>
            </div>
          </div>
          <button type="button" className="rotate-button" onClick={onRotate}>
            <Icon name="reset" />
            <span>
              {t(
                orientation === "horizontal"
                  ? "orientation.horizontal"
                  : "orientation.vertical",
              )}
            </span>
            <kbd>R</kbd>
          </button>
          <div className="placement-utilities">
            <button type="button" className="secondary" onClick={onAutoDeploy}>
              {t("setup.autoDeploy")}
            </button>
            <button type="button" className="text-btn" onClick={onClear}>
              {t("setup.clear")}
            </button>
          </div>
        </aside>

        <section className="placement-map">
          <div className="placement-map-header">
            <h2>{t("setup.yourWaters")}</h2>
            <span>{t("setup.noTouch")}</span>
          </div>
          <SeaBoard
            ariaLabel={t("setup.titleLine1")}
            ships={placed.map((ship) => ({
              key: `draft-${ship.index}`,
              row: ship.origin.row,
              col: ship.origin.col,
              length: ship.length,
              orientation: ship.orientation,
            }))}
            ghost={ghost}
            onCellActivate={onPlace}
            onCellHover={onHover}
            onCellLeave={onHoverLeave}
            cellHint={() => t("setup.cellPlaceHint")}
          />
          <div className="placement-map-footer">
            <p className="placement-status" role="status">
              {status}
            </p>
            <button
              type="button"
              className="primary"
              onClick={onStart}
              disabled={!complete}
            >
              {t("setup.start")}
              <Icon name="arrow" />
            </button>
          </div>
          <p className="placement-help">{t("setup.help")}</p>
        </section>
      </div>
    </>
  );
}
