import { useEffect } from "react";
import { Link, NavLink, Outlet } from "react-router-dom";
import { AppProvider, useApp, type DirectionId } from "@/state/AppContext";
import { REFERENCES } from "@/data/references";
import { Icon } from "@/components/Icon";

interface DirectionShellProps {
  direction: DirectionId;
}

export function DirectionShell({ direction }: DirectionShellProps) {
  useEffect(() => {
    const root = document.documentElement;
    root.dataset.direction = direction;
    return () => {
      delete root.dataset.direction;
    };
  }, [direction]);

  return (
    <AppProvider direction={direction} references={REFERENCES}>
      <div className="paper-grain relative flex min-h-dvh flex-col">
        <a
          href="#main"
          className="sr-only left-3 top-3 z-50 rounded-chip bg-accent px-4 py-2 font-semibold text-accent-ink focus:not-sr-only focus:absolute"
        >
          Skip to content
        </a>
        <Header direction={direction} />
        <main id="main" className="relative z-10 flex-1">
          <Outlet />
        </main>
        <Footer />
      </div>
    </AppProvider>
  );
}

const NAV = [
  { to: "", label: "Today", icon: "today" as const, end: true },
  { to: "browse", label: "Browse", icon: "grid" as const, end: false },
  { to: "exercises", label: "Exercises", icon: "brush" as const, end: false },
];

function Header({ direction }: DirectionShellProps) {
  const { favorites } = useApp();
  const savedCount = favorites.length;

  return (
    <header className="sticky top-0 z-20 border-b border-line bg-[rgb(var(--surface-raised)/0.82)] backdrop-blur">
      <div className="mx-auto w-full max-w-6xl px-3 sm:px-6">
        <div className="flex items-center justify-between gap-3 py-3">
          <Link
            to={`/${direction}`}
            className="flex shrink-0 items-center gap-2 rounded-chip text-ink sm:gap-2.5"
          >
            <Brushmark />
            <span className="whitespace-nowrap font-display text-[1.2rem] font-medium tracking-tight sm:text-[1.3rem]">
              Little Wash
            </span>
          </Link>

          <nav aria-label="Primary" className="hidden md:block">
            <ul className="flex items-center gap-1">
              {NAV.map((item) => (
                <li key={item.label}>
                  <NavLink
                    to={`/${direction}/${item.to}`}
                    end={item.end}
                    className={({ isActive }) =>
                      `inline-flex min-h-[40px] items-center gap-2 rounded-chip px-3 text-[0.95rem] font-semibold transition-colors ${
                        isActive
                          ? "bg-[rgb(var(--accent)/0.12)] text-ink"
                          : "text-ink-faint hover:text-ink"
                      }`
                    }
                  >
                    <Icon name={item.icon} size={17} />
                    {item.label}
                  </NavLink>
                </li>
              ))}
            </ul>
          </nav>

          <div className="flex items-center gap-2 sm:gap-3">
            <span
              className="inline-flex items-center gap-1.5 rounded-chip px-2 py-1.5 text-[0.85rem] font-semibold text-ink-soft"
              aria-label={`${savedCount} saved ${savedCount === 1 ? "piece" : "pieces"}`}
            >
              <Icon name={savedCount > 0 ? "heart-filled" : "heart"} size={17} />
              <span className="tnum">{savedCount}</span>
            </span>
            <DirectionSwitch current={direction} />
          </div>
        </div>

        {/* Mobile nav row */}
        <nav aria-label="Primary" className="-mx-3 overflow-x-auto px-3 pb-2 md:hidden">
          <ul className="flex items-center gap-1">
            {NAV.map((item) => (
              <li key={item.label}>
                <NavLink
                  to={`/${direction}/${item.to}`}
                  end={item.end}
                  className={({ isActive }) =>
                    `inline-flex min-h-[40px] items-center gap-1.5 whitespace-nowrap rounded-chip px-3 text-[0.9rem] font-semibold transition-colors ${
                      isActive
                        ? "bg-[rgb(var(--accent)/0.12)] text-ink"
                        : "text-ink-faint hover:text-ink"
                    }`
                  }
                >
                  <Icon name={item.icon} size={16} />
                  {item.label}
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>
      </div>
    </header>
  );
}

function DirectionSwitch({ current }: { current: DirectionId }) {
  return (
    <div
      role="group"
      aria-label="Switch colour treatment"
      className="flex items-center rounded-chip bg-surface-sunken p-1"
    >
      {(["a", "b"] as const).map((dir) => {
        const isActive = dir === current;
        return (
          <Link
            key={dir}
            to={`/${dir}`}
            aria-current={isActive ? "page" : undefined}
            aria-label={dir === "a" ? "Organised Chaos treatment" : "Scattered Accents treatment"}
            className={`inline-flex min-h-[36px] items-center rounded-[calc(var(--radius-chip)-2px)] px-2.5 text-[0.82rem] font-bold transition-colors sm:px-3 ${
              isActive ? "bg-accent text-accent-ink" : "text-ink-soft hover:opacity-80"
            }`}
          >
            {dir === "a" ? "Bold" : "Calm"}
          </Link>
        );
      })}
    </div>
  );
}

function Brushmark() {
  return (
    <svg width="26" height="26" viewBox="0 0 26 26" aria-hidden="true">
      <path
        d="M6 20c-1.6-3 .4-7 3-10s6.5-6 9.5-6c2 0 3 1.4 2 3.5C18.6 15 12 20 8.5 21c-1.4.4-2.5.2-2.5-1Z"
        fill="rgb(var(--accent))"
        opacity="0.9"
      />
      <circle cx="17.5" cy="8" r="2.4" fill="rgb(var(--surface-raised))" opacity="0.7" />
    </svg>
  );
}

function Footer() {
  return (
    <footer className="relative z-10 border-t border-line px-4 py-6 sm:px-6">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-1 text-[0.78rem] text-ink-faint">
        <p className="text-pretty">
          Design-exploration prototype. All data is local to your browser and
          artwork is original placeholder illustration (CC0). Saving, filtering,
          Surprise me and exercises are simulated on-device - no account or network.
        </p>
        <p>Little Wash - working name.</p>
      </div>
    </footer>
  );
}
