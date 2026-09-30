import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { EXERCISE_ART_IDS, ExerciseArt, ExerciseArtDefs } from "@/components/ExerciseArt";

describe("ExerciseArt", () => {
  it("names a drawing that carries meaning", () => {
    render(<ExerciseArt art="values-mountains" label="Five ridges, pale to dark" />);
    expect(screen.getByRole("img", { name: "Five ridges, pale to dark" })).toBeInTheDocument();
  });

  it("hides a thumbnail whose name is carried by the text beside it", () => {
    const { container } = render(<ExerciseArt art="values-mountains" />);
    expect(screen.queryByRole("img")).toBeNull();
    expect(container.querySelector("svg")).toHaveAttribute("aria-hidden", "true");
  });

  /*
    "Give each variation a distinct, relevant preview": twenty variations must
    not quietly share a drawing.
  */
  it("draws every variation differently", () => {
    const markup = EXERCISE_ART_IDS.map((art) => {
      const { container, unmount } = render(<ExerciseArt art={art} />);
      const svg = container.querySelector("svg")!;
      // Instance ids differ by construction; compare the drawing, not them.
      const html = svg.innerHTML.replace(/lw[a-zA-Z0-9]+-/g, "id-");
      unmount();
      return html;
    });
    expect(EXERCISE_ART_IDS).toHaveLength(20);
    expect(new Set(markup).size).toBe(20);
  });

  it("gives each instance its own gradient ids, so two copies never share one", () => {
    const { container } = render(
      <>
        <ExerciseArt art="graded-sky" />
        <ExerciseArt art="graded-sky" />
      </>,
    );
    const ids = [...container.querySelectorAll("linearGradient")].map((g) => g.id);
    expect(ids).toHaveLength(2);
    expect(new Set(ids).size).toBe(2);
    for (const svg of container.querySelectorAll("svg")) {
      const id = svg.querySelector("linearGradient")!.id;
      expect(svg.innerHTML).toContain(`url(#${id})`);
    }
  });

  it("defines the shared paint once, hidden from assistive technology", () => {
    const { container } = render(<ExerciseArtDefs />);
    const svg = container.querySelector("svg")!;
    expect(svg).toHaveAttribute("aria-hidden", "true");
    expect([...svg.querySelectorAll("filter")].map((f) => f.id)).toEqual([
      "lw-paint",
      "lw-wet",
      "lw-bloom",
      "lw-line",
    ]);
  });
});
