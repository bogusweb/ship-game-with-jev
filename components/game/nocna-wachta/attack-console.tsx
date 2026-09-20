"use client";

import { useLocale } from "@/lib/i18n";
import { cellLabel } from "@/lib/game/coords";
import type { Coord } from "@/lib/game";
import { Icon } from "./icons";

export type AttackConsoleProps = {
  selected: Coord | null;
  phase: "placement" | "playing" | "won" | "lost";
  jevThinking: boolean;
  onFire: () => void;
};

export function AttackConsole({
  selected,
  phase,
  jevThinking,
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
          : t("attack.pickFirst");

  const detail = complete
    ? t("attack.startAnother")
    : jevThinking
      ? t("attack.soonYourTurn")
      : placement
        ? t("attack.deployToBegin")
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
  );
}
