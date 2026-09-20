"use client";

import { useLocale } from "@/lib/i18n";
import { cellLabel } from "@/lib/game/coords";
import type { Coord } from "@/lib/game";
import { Icon } from "./icons";

export type AttackConsoleProps = {
  selected: Coord | null;
  phase: "placement" | "playing" | "won" | "lost";
  jevThinking: boolean;
  fireOnClick: boolean;
  onFireOnClickChange: (value: boolean) => void;
  onFire: () => void;
};

export function AttackConsole({
  selected,
  phase,
  jevThinking,
  fireOnClick,
  onFireOnClickChange,
  onFire,
}: AttackConsoleProps) {
  const { t } = useLocale();
  const complete = phase === "won" || phase === "lost";
  const placement = phase === "placement";

  const headline = complete
    ? t("attack.battleOver")
    : jevThinking
      ? t("attack.jevChoosing")
      : placement
        ? t("attack.placeFleetFirst")
        : selected
          ? t("attack.targetLocked")
          : fireOnClick
            ? t("attack.clickToFire")
            : t("attack.pickFirst");

  const detail = complete
    ? t("attack.startAnother")
    : jevThinking
      ? t("attack.soonYourTurn")
      : placement
        ? t("attack.deployToBegin")
        : fireOnClick
          ? t("attack.clickToFireDetail")
          : t("attack.clickToChange");

  const disabled = complete || placement || jevThinking || !selected;

  return (
    <div className="attack-console">
      <div className="target-data">
        <div className="attack-coordinate">
          {selected ? cellLabel(selected.row, selected.col) : "—"}
        </div>
        <div className="attack-caption">
          <b>{headline}</b>
          <br />
          {detail}
        </div>
      </div>
      <div className="attack-actions">
        <label className="fire-click-toggle">
          <input
            type="checkbox"
            checked={fireOnClick}
            onChange={(event) => onFireOnClickChange(event.target.checked)}
          />
          {t("attack.fireOnClick")}
        </label>
        <button
          type="button"
          className="primary"
          onClick={onFire}
          disabled={disabled}
        >
          <Icon name="target" />
          {jevThinking ? t("attack.jevMove") : t("attack.fire")}
          {jevThinking ? null : <Icon name="arrow" />}
        </button>
      </div>
    </div>
  );
}
