import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { CreditLine } from "@/components/CreditLine";
import { LICENCES } from "@/lib/sources/registry";
import { makeCredit, makePhoto, makeReference } from "@/test/factory";

const painting = makeReference("wheat-field", {
  kind: "artwork",
  credit: makeCredit({
    sourceId: "met",
    institution: "The Met",
    creator: "Vincent van Gogh",
    creatorUrl: "https://www.metmuseum.org/art/collection/artist/123",
    objectUrl: "https://www.metmuseum.org/art/collection/search/436535",
    dateDisplay: "1889",
    medium: "Oil on canvas",
    licence: LICENCES["cc0-1.0"],
  }),
});

const photo = makePhoto("a-pear");

describe("CreditLine: every surface names the maker", () => {
  it("credits a painting by maker and holding institution", () => {
    render(<CreditLine reference={painting} />);
    expect(screen.getByText("Vincent van Gogh, The Met (CC0 1.0)")).toBeVisible();
  });

  it("credits a photograph the way a photographer expects", () => {
    render(<CreditLine reference={photo} />);
    expect(screen.getByText("Photo by Jane Doe on Pexels (Pexels License)")).toBeVisible();
  });

  it("credits work whose licence asks for nothing", () => {
    // CC0 and both photo licences require no attribution at all. The credit is
    // a product commitment, so it must not disappear with the obligation.
    expect(painting.credit.licence.requiresAttribution).toBe(false);
    render(<CreditLine reference={painting} />);
    expect(screen.getByText(/Vincent van Gogh/)).toBeVisible();
  });

  it("names the source alone when no maker is recorded", () => {
    const anonymous = makeReference("unknown", {
      credit: makeCredit({ institution: "The Met", creator: null }),
    });
    render(<CreditLine reference={anonymous} />);
    expect(screen.getByText("The Met (CC0 1.0)")).toBeVisible();
  });
});

describe("CreditLine: linking back to the maker", () => {
  it("links the maker and the work on the inline variant", () => {
    render(<CreditLine reference={painting} variant="inline" />);
    expect(screen.getByRole("link", { name: "Vincent van Gogh" })).toHaveAttribute(
      "href",
      "https://www.metmuseum.org/art/collection/artist/123",
    );
    expect(screen.getByRole("link", { name: "The Met" })).toHaveAttribute(
      "href",
      "https://www.metmuseum.org/art/collection/search/436535",
    );
  });

  it("opens outbound links safely", () => {
    render(<CreditLine reference={painting} variant="inline" />);
    const link = screen.getByRole("link", { name: "The Met" });
    expect(link).toHaveAttribute("target", "_blank");
    expect(link).toHaveAttribute("rel", expect.stringContaining("noopener"));
  });

  it("renders an unlinked maker as plain text rather than a dead link", () => {
    const noProfile = makeReference("x", {
      credit: makeCredit({
        institution: "The Met",
        creator: "Anon",
        creatorUrl: null,
      }),
    });
    render(<CreditLine reference={noProfile} variant="inline" />);
    expect(screen.getByText(/Anon/)).toBeVisible();
    expect(screen.queryByRole("link", { name: "Anon" })).toBeNull();
  });

  it("links the licence so the terms are one tap away", () => {
    render(<CreditLine reference={photo} variant="inline" />);
    expect(screen.getByRole("link", { name: "Pexels License" })).toHaveAttribute(
      "href",
      "https://www.pexels.com/license/",
    );
  });
});

describe("CreditLine: the full variant on Detail", () => {
  it("adds date, medium and the licence in full", () => {
    render(<CreditLine reference={painting} variant="full" />);
    expect(screen.getByText(/1889/)).toBeVisible();
    expect(screen.getByText(/Oil on canvas/)).toBeVisible();
    expect(screen.getByText(/Licensed under/)).toBeVisible();
  });

  it("omits date and medium a provider does not record", () => {
    const sparse = makeReference("sparse", {
      credit: makeCredit({
        institution: "The Met",
        creator: "Anon",
        dateDisplay: null,
        medium: null,
      }),
    });
    render(<CreditLine reference={sparse} variant="full" />);
    // The maker is plain text and the institution is a link, so match the
    // whole line rather than a single text node.
    expect(
      screen.getByText((_, el) => el?.textContent === "Anon, The Met", {
        selector: "p",
      }),
    ).toBeVisible();
  });

  it("credits a photograph in full without inventing a medium", () => {
    render(<CreditLine reference={photo} variant="full" />);
    expect(screen.getByText(/Photo by/)).toBeVisible();
    expect(screen.getByRole("link", { name: "Jane Doe" })).toBeVisible();
  });
});
