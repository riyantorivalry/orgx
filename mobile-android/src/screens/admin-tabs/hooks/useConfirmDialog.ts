import { useState } from "react";
import type { ConfirmDialogState } from "../types";

type ConfirmOptions = Omit<ConfirmDialogState, "resolve">;

export function useConfirmDialog() {
  const [dialog, setDialog] = useState<ConfirmDialogState | null>(null);

  function openConfirm(options: ConfirmOptions): Promise<boolean> {
    return new Promise((resolve) => {
      setDialog({ ...options, resolve });
    });
  }

  function closeConfirm(result: boolean) {
    setDialog((current) => {
      if (current) {
        current.resolve(result);
      }
      return null;
    });
  }

  return { dialog, openConfirm, closeConfirm };
}
