import { describe, it, expect } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { RefArt } from "@/components/RefArt";
import { makeLocalImage, makePhoto, makeReference } from "@/test/factory";

const ladder = makeReference("pear", {
  alt: "A single ripe pear with a short stem, rounded and full at the base.",
  image: makeLocalImage(
    [
      { width: 400, src: "/pear-400.avif" },
      { width: 800, src: "/pear-800.avif" },
      { width: 1600, src: "/pear-1600.avif" },
    ],
    1600,
    1200,
  ),
});

describe("RefArt: choosing a file to load", () => {
  it("offers the browser every width it has", () => {
    render(<RefArt reference={ladder} />);
    const img = screen.getByAltText(ladder.alt);
    expect(img).toHaveAttribute(
      "srcset",
      "/pear-400.avif 400w, /pear-800.avif 800w, /pear-1600.avif 1600w",
    );
    expect(img).toHaveAttribute("sizes");
  });

  it("reserves the item's own proportions, not a hard-coded square", () => {
    // This used to be width={1000} height={1000} for twelve square SVGs.
    // Photographs are not square, and a wrong ratio is a layout shift.
    const img = render(<RefArt reference={ladder} />).container.querySelector("img");
    expect(img).toHaveAttribute("width", "1600");
    expect(img).toHaveAttribute("height", "1200");
  });

  it("asks a provider CDN for widths when the image is not ours", () => {
    render(<RefArt reference={makePhoto("photo")} />);
    const srcset = screen.getByRole("img").getAttribute("srcset") ?? "";
    expect(srcset).toContain("w=400");
    expect(srcset).toContain("w=1600");
  });

  it("omits srcset and sizes when there is only one file", () => {
    render(<RefArt reference={makeReference("single", { alt: "One file." })} />);
    const img = screen.getByAltText("One file.");
    expect(img).not.toHaveAttribute("srcset");
    expect(img).not.toHaveAttribute("sizes");
  });

  it("loads the featured piece eagerly and the rest lazily", () => {
    const { rerender } = render(<RefArt reference={ladder} priority />);
    expect(screen.getByAltText(ladder.alt)).toHaveAttribute("loading", "eager");
    rerender(<RefArt reference={ladder} />);
    expect(screen.getByAltText(ladder.alt)).toHaveAttribute("loading", "lazy");
  });
});

describe("RefArt: colour fidelity", () => {
  it("never puts a filter on the artwork itself", () => {
    // DESIGN.md:495-502 - a painter mixes against what is on screen, so the
    // placeholder is a sibling that unmounts, never a filter on the image.
    const withLqip = makeReference("lqip", {
      alt: "Blurred while loading.",
      image: makeLocalImage(
        [{ width: 400, src: "/a.avif" }],
        400,
        400,
        "data:image/gif;base64,AAAA",
      ),
    });
    const { container } = render(<RefArt reference={withLqip} />);
    const img = screen.getByAltText("Blurred while loading.");

    expect(container.querySelector(".blur-lg")).not.toBeNull();
    expect(img.className).not.toContain("blur");

    fireEvent.load(img);
    expect(container.querySelector(".blur-lg")).toBeNull();
  });

  it("shows no placeholder for an item that has none", () => {
    const { container } = render(<RefArt reference={ladder} />);
    expect(container.querySelector(".blur-lg")).toBeNull();
  });
});

describe("RefArt: when an image will not load", () => {
  it("says so in words instead of leaving a broken-image icon on the mat", () => {
    render(<RefArt reference={makePhoto("gone", "pexels", { alt: "A pear." })} />);
    fireEvent.error(screen.getByRole("img"));

    expect(screen.getByText(/didn.t load/i)).toBeVisible();
    expect(screen.getByText(/Check your connection/i)).toBeVisible();
  });

  it("keeps describing the subject so the screen stays useful", () => {
    render(<RefArt reference={makePhoto("gone", "pexels", { alt: "A pear." })} />);
    fireEvent.error(screen.getByRole("img"));

    expect(screen.getByRole("img", { name: "A pear." })).toBeVisible();
  });
});

describe("RefArt: a plate shaped like the reference", () => {
  /*
    Every plate used to carry a fixed ratio, because every reference was a
    400x400 SVG. The first broad harvest is 53% square-ish, 22% tall portraits
    and 14% wide - so a 0.6-ratio photograph in a 4/3 plate would render at 45%
    of the plate's width with the rest left as empty mat.
  */
  const portrait = makeReference("tall", {
    alt: "A tall photograph.",
    image: makeLocalImage([{ width: 400, src: "/a.avif" }], 1200, 2000),
  });
  const wide = makeReference("wide", {
    alt: "A wide photograph.",
    image: makeLocalImage([{ width: 400, src: "/a.avif" }], 2400, 1600),
  });

  function plate(container: HTMLElement): HTMLElement {
    return container.firstElementChild as HTMLElement;
  }

  it("shapes the plate to a tall reference", () => {
    const { container } = render(<RefArt reference={portrait} ownAspect />);
    expect(plate(container).style.getPropertyValue("--ar")).toBe("0.6");
    expect(plate(container).className).toContain("art-ratio");
  });

  it("shapes the plate to a wide reference", () => {
    const { container } = render(<RefArt reference={wide} ownAspect />);
    expect(plate(container).style.getPropertyValue("--ar")).toBe("1.5");
  });

  it("drops the fallback ratio utility, which would otherwise win the cascade", () => {
    // Tailwind utilities beat the components layer whatever the specificity,
    // so leaving aspect-[4/3] on would silently defeat the whole feature.
    const { container } = render(
      <RefArt reference={portrait} ownAspect className="art-cap aspect-[4/3] w-full" />,
    );
    expect(plate(container).className).not.toContain("aspect-[4/3]");
    expect(plate(container).className).toContain("art-cap");
    expect(plate(container).className).toContain("w-full");
  });

  it("strips aspect-square too", () => {
    const { container } = render(
      <RefArt reference={wide} ownAspect className="aspect-square w-full" />,
    );
    expect(plate(container).className).not.toContain("aspect-square");
  });

  it("leaves the fixed ratio alone when not asked to shape itself", () => {
    // Cards keep a fixed ratio: a grid of differently shaped cards reads as
    // broken rather than as varied.
    const { container } = render(
      <RefArt reference={portrait} className="aspect-[5/4] w-full" />,
    );
    expect(plate(container).className).toContain("aspect-[5/4]");
    expect(plate(container).style.getPropertyValue("--ar")).toBe("");
  });

  it("falls back to the fixed ratio when an item has no usable size", () => {
    const sizeless = makeReference("sizeless", {
      image: makeLocalImage([{ width: 400, src: "/a.avif" }], 0, 0),
    });
    const { container } = render(
      <RefArt reference={sizeless} ownAspect className="aspect-[4/3]" />,
    );
    expect(plate(container).className).toContain("aspect-[4/3]");
    expect(plate(container).className).not.toContain("art-ratio");
  });

  it("clamps an extreme ratio to what the pipeline allows", () => {
    // A 6:1 strip would collapse the plate. The ingestion pipeline rejects
    // anything outside 0.5-2.0, and this makes a hand-edited entry safe too.
    const strip = makeReference("strip", {
      image: makeLocalImage([{ width: 400, src: "/a.avif" }], 6000, 1000),
    });
    const { container } = render(<RefArt reference={strip} ownAspect />);
    expect(plate(container).style.getPropertyValue("--ar")).toBe("2");
  });

  it("keeps the view transition name alongside the ratio", () => {
    const { container } = render(
      <RefArt reference={wide} ownAspect transitionName="piece-art" />,
    );
    expect(plate(container).style.getPropertyValue("--ar")).toBe("1.5");
    expect(plate(container).style.viewTransitionName).toBe("piece-art");
  });

  it("keeps the shape when an image fails, so nothing jumps", () => {
    render(<RefArt reference={wide} ownAspect />);
    fireEvent.error(screen.getByAltText("A wide photograph."));
    const failed = screen.getByRole("img", { name: "A wide photograph." })
      .parentElement as HTMLElement;
    expect(failed.style.getPropertyValue("--ar")).toBe("1.5");
  });
});
