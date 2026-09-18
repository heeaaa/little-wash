/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // Semantic tokens resolve to CSS custom properties, which each visual
        // direction redefines under its own [data-direction] scope.
        surface: "rgb(var(--surface) / <alpha-value>)",
        "surface-raised": "rgb(var(--surface-raised) / <alpha-value>)",
        "surface-sunken": "rgb(var(--surface-sunken) / <alpha-value>)",
        "art-mat": "rgb(var(--art-mat) / <alpha-value>)",
        ink: "rgb(var(--ink) / <alpha-value>)",
        "ink-soft": "rgb(var(--ink-soft) / <alpha-value>)",
        "ink-faint": "rgb(var(--ink-faint) / <alpha-value>)",
        line: "rgb(var(--line) / <alpha-value>)",
        accent: "rgb(var(--accent) / <alpha-value>)",
        "accent-ink": "rgb(var(--accent-ink) / <alpha-value>)",
        "accent-soft": "rgb(var(--accent-soft) / <alpha-value>)",
        save: "rgb(var(--save) / <alpha-value>)",
      },
      fontFamily: {
        display: "var(--font-display)",
        body: "var(--font-body)",
        hand: "var(--font-hand)",
      },
      borderRadius: {
        card: "var(--radius-card)",
        chip: "var(--radius-chip)",
      },
      boxShadow: {
        plate: "var(--shadow-plate)",
        lift: "var(--shadow-lift)",
      },
      maxWidth: {
        reading: "68ch",
      },
    },
  },
  plugins: [],
};
