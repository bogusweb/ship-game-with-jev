"use client";

import { useEffect, useRef } from "react";
import { useLocale } from "@/lib/i18n";

export function RulesDialog({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const { t } = useLocale();
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    if (open && !node.open) node.showModal();
    if (!open && node.open) node.close();
  }, [open]);

  return (
    <dialog ref={ref} onClose={onClose}>
      <button
        type="button"
        className="modal-close"
        onClick={onClose}
        aria-label={t("rules.close")}
      >
        ×
      </button>
      <p className="eyebrow muted">{t("action.rules")}</p>
      <h2>{t("rules.title")}</h2>
      <p>{t("rules.lede")}</p>
      <ul>
        <li>{t("rules.item1")}</li>
        <li>{t("rules.item2")}</li>
        <li>{t("rules.item3")}</li>
        <li>{t("rules.item4")}</li>
        <li>{t("rules.item5")}</li>
      </ul>
      <button type="button" className="primary" onClick={onClose}>
        {t("rules.close")}
      </button>
    </dialog>
  );
}
