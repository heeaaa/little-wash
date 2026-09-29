import { describe, it, expect } from "vitest";
import { REMOTE_WIDTHS, buildImageSources } from "./images";
import { remoteImageUrl } from "./registry";
import type { ImageSet } from "./types";

const local: ImageSet = {
  delivery: "local",
  widths: [
    { width: 1600, src: "/refs/pear-1600.avif" },
    { width: 400, src: "/refs/pear-400.avif" },
    { width: 800, src: "/refs/pear-800.avif" },
  ],
  intrinsicWidth: 1600,
  intrinsicHeight: 1200,
  lqip: "data:image/gif;base64,AAAA",
};

const pexels: ImageSet = {
  delivery: "remote",
  baseUrl: "https://images.pexels.com/photos/1108099/pexels-photo-1108099.jpeg",
  intrinsicWidth: 3000,
  intrinsicHeight: 2000,
  lqip: null,
};

const unsplash: ImageSet = {
  delivery: "remote",
  baseUrl: "https://images.unsplash.com/photo-1506744038136-46273834b3fb?ixid=abc",
  intrinsicWidth: 4000,
  intrinsicHeight: 6000,
  lqip: null,
};

describe("buildImageSources: images we ship ourselves", () => {
  it("offers every generated width, ascending", () => {
    const { srcSet } = buildImageSources(local, "met");
    expect(srcSet).toBe(
      "/refs/pear-400.avif 400w, /refs/pear-800.avif 800w, /refs/pear-1600.avif 1600w",
    );
  });

  it("falls back to a middling width, not the widest", () => {
    // A browser without srcset is the one least able to ask for something
    // smaller, so handing it the 1600px file is the wrong way round.
    expect(buildImageSources(local, "met").src).toBe("/refs/pear-800.avif");
  });

  it("carries the item's own intrinsic size and placeholder", () => {
    const built = buildImageSources(local, "met");
    expect(built).toMatchObject({
      width: 1600,
      height: 1200,
      lqip: "data:image/gif;base64,AAAA",
    });
  });

  it("omits srcset when there is only one candidate", () => {
    const single: ImageSet = { ...local, widths: [{ width: 400, src: "/a.avif" }] };
    const built = buildImageSources(single, "met");
    expect(built.srcSet).toBe("");
    expect(built.src).toBe("/a.avif");
  });

  it("falls back to the narrowest when every candidate is oversized", () => {
    const big: ImageSet = {
      ...local,
      widths: [
        { width: 1600, src: "/big.avif" },
        { width: 2400, src: "/bigger.avif" },
      ],
    };
    expect(buildImageSources(big, "met").src).toBe("/big.avif");
  });

  it("survives an item with no widths rather than throwing", () => {
    const empty: ImageSet = { ...local, widths: [] };
    expect(buildImageSources(empty, "met")).toMatchObject({ src: "", srcSet: "" });
  });
});

describe("buildImageSources: images served by a provider CDN", () => {
  it("asks Pexels for each width with its own parameters", () => {
    const { srcSet } = buildImageSources(pexels, "pexels");
    for (const width of REMOTE_WIDTHS) {
      expect(srcSet).toContain(`w=${width}`);
      expect(srcSet).toContain(`${width}w`);
    }
    expect(srcSet).toContain("auto=compress");
    expect(srcSet).toContain("cs=tinysrgb");
  });

  it("asks Unsplash for AVIF explicitly, since it does not negotiate", () => {
    const { srcSet } = buildImageSources(unsplash, "unsplash");
    expect(srcSet).toContain("fm=avif");
    expect(srcSet).toContain("fit=max");
  });

  it("preserves parameters already on a provider URL", () => {
    // Unsplash URLs arrive carrying ixid; dropping it would break their
    // attribution tracking.
    expect(buildImageSources(unsplash, "unsplash").src).toContain("ixid=abc");
  });

  it("reports the photograph's real proportions, not the requested width", () => {
    expect(buildImageSources(unsplash, "unsplash")).toMatchObject({
      width: 4000,
      height: 6000,
    });
  });
});

describe("remoteImageUrl", () => {
  it("leaves a URL alone for a source with no CDN resizing", () => {
    expect(remoteImageUrl("met", "https://images.metmuseum.org/a.jpg", 400)).toBe(
      "https://images.metmuseum.org/a.jpg",
    );
  });

  it("returns a malformed URL unchanged rather than throwing", () => {
    expect(remoteImageUrl("pexels", "not a url", 400)).toBe("not a url");
  });

  it("replaces an existing width rather than appending a second one", () => {
    const url = remoteImageUrl("pexels", "https://i.pexels.com/a.jpg?w=99", 400);
    expect(url).toContain("w=400");
    expect(url).not.toContain("w=99");
  });
});
