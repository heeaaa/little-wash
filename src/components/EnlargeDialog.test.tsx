import { describe, it, expect, beforeAll, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { EnlargeDialog } from "@/components/EnlargeDialog";
import { REFERENCES } from "@/data/references";

const reference = REFERENCES.find((r) => r.id === "ripe-pear")!;

// jsdom ships <dialog> without the modal methods, so drive `open` directly.
beforeAll(() => {
  const proto = window.HTMLDialogElement.prototype;
  proto.showModal = function showModal(this: HTMLDialogElement) {
    this.open = true;
  };
  proto.close = function close(this: HTMLDialogElement) {
    this.open = false;
    this.dispatchEvent(new Event("close"));
  };
});

describe("EnlargeDialog", () => {
  it("opens on demand and shows the reference uncropped with its description", () => {
    render(<EnlargeDialog reference={reference} open onClose={() => {}} />);

    const dialog = screen.getByRole("dialog", { hidden: true });
    expect(dialog).toHaveAttribute("open");
    expect(dialog).toHaveAccessibleName(`Enlarged view of ${reference.title}`);

    const art = screen.getByAltText(reference.alt);
    expect(art).toHaveClass("object-contain");
  });

  it("closes from the close button", async () => {
    const onClose = vi.fn();
    const user = userEvent.setup();
    render(<EnlargeDialog reference={reference} open onClose={onClose} />);

    await user.click(screen.getByRole("button", { name: /close enlarged view/i }));
    expect(onClose).toHaveBeenCalled();
  });

  /*
    Regression guard for the landscape bug: the dialog used to force a 4:3 box,
    which on a propped phone (844x390) overflowed the viewport and cropped the
    subject. Sizing now comes from the viewport via the `.enlarge` rules, so no
    element inside may pin an aspect ratio or a fixed height. jsdom does not lay
    out, so the geometry itself is measured in the browser; this keeps the fixed
    box from coming back.
  */
  it("pins no aspect ratio or fixed height, and defers sizing to the viewport", () => {
    const { container } = render(
      <EnlargeDialog reference={reference} open onClose={() => {}} />,
    );

    const classes = [...container.querySelectorAll<HTMLElement>("*")]
      .flatMap((el) => [...el.classList])
      .join(" ");
    expect(classes).not.toMatch(/\baspect-/);
    expect(classes).not.toMatch(/\bh-\[\d+(px|rem)/);

    expect(screen.getByRole("dialog", { hidden: true })).toHaveClass("enlarge");
  });
});
