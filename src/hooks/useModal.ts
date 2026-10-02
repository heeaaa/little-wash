import { useEffect, useRef } from "react";

/**
 * A native modal `<dialog>` driven by an `open` flag, for the sign-in sheet
 * and the account's confirmations.
 *
 * The same guard EnlargeDialog carries (DESIGN.md, "Closing a dialog must not
 * re-enter"): `dialog.close()` fires the native `close` event, so a close this
 * hook makes must not report back as if the person had closed it. Escape and
 * a button that calls `onClose` do report back. Either way, focus returns to
 * whatever opened the dialog, if it is still on the page.
 */
export function useModal(open: boolean, onClose: () => void) {
  const ref = useRef<HTMLDialogElement>(null);
  const closingSelf = useRef(false);
  const opener = useRef<HTMLElement | null>(null);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) {
      opener.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
      dialog.showModal();
    }
    if (!open && dialog.open) {
      closingSelf.current = true;
      dialog.close();
    }
  }, [open]);

  const onNativeClose = () => {
    const back = opener.current;
    opener.current = null;
    if (back?.isConnected) back.focus();
    if (closingSelf.current) {
      closingSelf.current = false;
      return;
    }
    onClose();
  };

  return { ref, onNativeClose };
}
