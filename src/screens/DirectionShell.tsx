import { useEffect } from "react";
import { Link, NavLink, Outlet } from "react-router-dom";
import { AppProvider, useApp, type DirectionId } from "@/state/AppContext";
import { REFERENCES } from "@/data/references";
import { Icon } from "@/components/Icon";
import markUrl from "@/assets/brand/mark.png";

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

function Wordmark({ direction }: DirectionShellProps) {
  return (
    <Link
      to={`/${direction}`}
      aria-label="little wash - home"
      className="flex shrink-0 items-center gap-2.5 rounded-chip text-ink"
    >
      <img
        src={markUrl}
        alt=""
        aria-hidden="true"
        width={512}
        height={512}
        className="h-8 w-8 select-none"
        draggable={false}
      />
      <span className="whitespace-nowrap font-display text-[1.25rem] leading-none tracking-tight sm:text-[1.4rem]">
        little wash
      </span>
    </Link>
  );
}

function Header({ direction }: DirectionShellProps) {
  const { favorites } = useApp();
  const savedCount = favorites.length;

  return (
    <header className="sticky top-0 z-20 border-b border-line bg-[rgb(var(--surface-raised)/0.85)] backdrop-blur">
      <div className="mx-auto w-full max-w-6xl px-3 sm:px-6">
        <div className="flex items-center justify-between gap-3 py-3">
          <Wordmark direction={direction} />

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

          <span
            className="inline-flex items-center gap-1.5 rounded-chip px-2 py-1.5 text-[0.85rem] font-semibold text-ink-soft"
            aria-label={`${savedCount} saved ${savedCount === 1 ? "piece" : "pieces"}`}
          >
            <Icon name={savedCount > 0 ? "heart-filled" : "heart"} size={17} />
            <span className="tnum">{savedCount}</span>
          </span>
        </div>

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

function Footer() {
  return (
    <footer className="relative z-10 border-t border-line px-4 py-6 sm:px-6">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-1 text-[0.78rem] text-ink-faint">
        <p className="text-pretty">
          Design-exploration prototype. All data is local to your browser and
          artwork is original placeholder illustration (CC0). Saving, filtering,
          Surprise me and exercises are simulated on-device - no account or network.
        </p>
        <p>little wash - a little colour, every day. Working name.</p>
      </div>
    </footer>
  );
}
