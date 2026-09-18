import { useEffect } from "react";
import { Link } from "react-router-dom";
import { REFERENCES } from "@/data/references";
import { pickDaily } from "@/lib/catalog";
import { RefArt } from "@/components/RefArt";
import { Icon } from "@/components/Icon";
import type { PaintReference } from "@/lib/types";

/**
 * Landing screen for the design-exploration phase: both share the "Studio
 * Table" structure and differ only in how much colour they let onto the table.
 */
export function Chooser() {
  useEffect(() => {
    document.documentElement.dataset.direction = "a";
    return () => {
      delete document.documentElement.dataset.direction;
    };
  }, []);

  const daily = pickDaily(REFERENCES);

  return (
    <div className="paper-grain relative min-h-dvh">
      <div className="relative z-10 mx-auto flex min-h-dvh w-full max-w-4xl flex-col justify-center px-5 py-14 sm:px-6">
        <p className="mb-3 font-hand text-2xl text-accent">Little Wash</p>
        <h1 className="max-w-reading text-balance font-display text-[2.4rem] font-medium leading-[1.05] tracking-tight text-ink sm:text-[3.1rem]">
          What&rsquo;s on your palette today?
        </h1>
        <p className="mt-4 max-w-reading text-pretty text-[1.05rem] leading-relaxed text-ink-soft">
          Same organised studio table, two amounts of colour. Both keep the neat
          structure; they differ in how much the paint spills onto the table.
          Step into either - the Bold / Calm switch flips between them anywhere.
        </p>

        <div className="mt-10 grid gap-5 sm:grid-cols-2">
          <DirectionCard
            to="/a"
            eyebrow="Treatment A"
            name="Organised Chaos"
            blurb="A working studio table: washi-tape tags, sticky-note prompts, colour-coded sections and pigment dabs scattered in the margins - all held to a strict grid."
            daily={daily}
            pigmentVar="--pig-fruit"
          />
          <DirectionCard
            to="/b"
            eyebrow="Treatment B"
            name="Scattered Accents"
            blurb="The same calm structure, colour arriving lightly: pigment dots, small painted swatches and quiet tags. Tidy first, colourful second."
            daily={daily}
            pigmentVar="--pig-still-life"
          />
        </div>
      </div>
    </div>
  );
}

interface DirectionCardProps {
  to: string;
  eyebrow: string;
  name: string;
  blurb: string;
  daily: PaintReference | null;
  pigmentVar: string;
}

function DirectionCard({ to, eyebrow, name, blurb, daily, pigmentVar }: DirectionCardProps) {
  return (
    <Link
      to={to}
      className="group flex flex-col gap-4 rounded-card border border-line bg-surface-raised p-5 text-ink shadow-plate transition-transform hover:-translate-y-1"
    >
      <div className="flex items-center justify-between">
        <span className="text-[0.78rem] font-semibold uppercase tracking-[0.12em] text-ink-faint">
          {eyebrow}
        </span>
        <Icon name="arrow-left" size={20} className="rotate-180 transition-transform group-hover:translate-x-1" />
      </div>
      {daily ? (
        <div style={{ boxShadow: `inset 0 0 0 3px rgb(var(${pigmentVar}) / 0.5)` }} className="rounded-[calc(var(--radius-card)-6px)]">
          <RefArt
            reference={daily}
            priority
            inset="roomy"
            className="aspect-[5/3] rounded-[calc(var(--radius-card)-6px)]"
          />
        </div>
      ) : null}
      <div>
        <p className="font-display text-2xl font-semibold tracking-tight">{name}</p>
        <p className="mt-1.5 text-pretty text-[0.95rem] leading-relaxed text-ink-soft">{blurb}</p>
      </div>
    </Link>
  );
}
