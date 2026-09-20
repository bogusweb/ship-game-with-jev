"use client";

import { FLEET_LENGTHS } from "@/lib/game";
import type { OpponentView, PlayerBoard } from "@/lib/game";
import { ownBoardShips, revealedOpponentShips } from "@/lib/game/draft-fleet";
import { useLocale } from "@/lib/i18n";
import { FleetStrip } from "./chrome";
import { Icon } from "./icons";
import { SeaBoard } from "./sea-board";

export type ResultScreenProps = {
  won: boolean;
  /** Player shots fired at Jev's waters. */
  shots: number;
  /** Player shots that struck a ship. */
  hits: number;
  playerBoard: PlayerBoard;
  playerView: OpponentView;
  jevBoard: PlayerBoard;
  opponentView: OpponentView;
  jevSunkCount: number;
  onNewGame: () => void;
  onFleetReport: () => void;
};

export function ResultScreen({
  won,
  shots,
  hits,
  playerBoard,
  playerView,
  jevBoard,
  opponentView,
  jevSunkCount,
  onNewGame,
  onFleetReport,
}: ResultScreenProps) {
  const { t } = useLocale();
  const accuracy = shots > 0 ? Math.round((hits / shots) * 100) : 0;
  const surviving = playerBoard.ships.filter((ship) => !ship.sunk).length;
  const reportBoard = won ? playerBoard : jevBoard;
  const reportView = won ? playerView : opponentView;
  const reportShips = won
    ? ownBoardShips(playerBoard)
    : revealedOpponentShips(jevBoard, { revealRemaining: true });

  return (
    <>
      <section
        className={`result-screen ${won ? "human-victory" : "jev-victory"}`}
        aria-labelledby="result-title"
      >
        <div className="result-copy">
          <div className="result-eyebrow">
            <span className="dot" />
            {t("result.eyebrowComplete")}
            <span>/</span>
            {won ? t("result.eyebrowWon") : t("result.eyebrowLost")}
          </div>
          <div className="result-emblem">
            <Icon name={won ? "shield" : "jev"} />
          </div>
          <h1 id="result-title">
            {won ? t("result.titleWonLine1") : t("result.titleLostLine1")}
            <br />
            <em>
              {won ? t("result.titleWonLine2") : t("result.titleLostLine2")}
            </em>
          </h1>
          <p className="result-description">
            {won ? t("result.descWon") : t("result.descLost")}
          </p>
          <div className="result-stats">
            <div>
              <strong>{shots}</strong>
              <span>{t("result.statShots")}</span>
            </div>
            <div>
              <strong>
                {accuracy}
                <small>%</small>
              </strong>
              <span>{t("result.statAccuracy")}</span>
            </div>
            <div>
              <strong>
                {won ? surviving : jevSunkCount}
                <small>/{FLEET_LENGTHS.length}</small>
              </strong>
              <span>
                {won ? t("result.statSurviving") : t("result.statJevSunk")}
              </span>
            </div>
          </div>
          <div className="result-actions">
            <button type="button" className="primary" onClick={onNewGame}>
              <Icon name="reset" />
              {t("action.newGame")}
              <Icon name="arrow" />
            </button>
            <button type="button" className="secondary" onClick={onFleetReport}>
              {t("result.fleetReport")}
            </button>
          </div>
        </div>

        <div className="result-ocean">
          <div className="result-board-header">
            <span className="eyebrow">
              {won ? t("result.boardHeader") : t("result.boardHeaderLost")}
            </span>
            <span className="result-seal">
              {won ? t("result.sealWon") : t("result.sealLost")}
            </span>
          </div>
          <SeaBoard
            ariaLabel={won ? t("board.yourFleet") : t("board.jevWaters")}
            cellState={(row, col) => reportView.cells[row][col]}
            ships={reportShips}
          />
          <div className="result-board-footer">
            <FleetStrip
              lengths={FLEET_LENGTHS}
              sunkLengths={reportBoard.ships
                .filter((ship) => ship.sunk)
                .map((ship) => ship.length)}
            />
            <span>{won ? t("result.footerWon") : t("result.footerLost")}</span>
          </div>
        </div>
      </section>
    </>
  );
}
