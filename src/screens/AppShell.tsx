import { Link, NavLink, Outlet } from "react-router-dom";
import { AppProvider, useApp } from "@/state/AppContext";
import { AccountProvider, useAccount } from "@/state/AccountContext";
import { AccountNotice } from "@/components/account/AccountNotice";
import { SignInSheet } from "@/components/account/SignInSheet";
import { paintedReferences, savedReferences } from "@/lib/catalog";
import { platformAttributions } from "@/lib/sources/attribution";
import { CATALOGUE } from "@/data/catalogue";
import { INSPIRATION_PHOTOS } from "@/data/inspiration";
import { Icon } from "@/components/Icon";
import { WashFilter } from "@/components/WashFilter";
import { SavedPalette } from "@/components/SavedPalette";
import { useNewPageAtTop } from "@/hooks/useNewPageAtTop";
import markUrl from "@/assets/brand/mark.png";

export function AppShell() {
  useNewPageAtTop();

  return (
    // Accounts sit outside the app's state: AppProvider reads the signed-in
    // record, when there is one, in place of this browser's own lists.
    <AccountProvider>
      <AppProvider references={CATALOGUE}>
        <div className="paper-grain relative flex min-h-dvh flex-col">
          <WashFilter />
          <a
            href="#main"
            className="sr-only left-3 top-3 z-50 min-h-[44px] items-center rounded-chip bg-accent px-4 py-2 font-semibold text-accent-ink focus:not-sr-only focus:absolute focus:inline-flex"
          >
            Skip to content
          </a>
          <Header />
          <main id="main" className="relative z-10 flex-1">
            <AccountNotice />
            <Outlet />
          </main>
          <Footer />
          <SignInSheet />
        </div>
      </AppProvider>
    </AccountProvider>
  );
}

const NAV = [
  { to: "", label: "Today", icon: "today" as const, end: true },
  { to: "browse", label: "Browse", icon: "grid" as const, end: false },
  { to: "exercises", label: "Exercises", icon: "brush" as const, end: false },
];

const STUDIO = { to: "studio", label: "Studio", icon: "palette" as const, end: false };

/*
  The studio joins the nav only once there is something in it. An empty
  destination advertised on every screen is the pattern that made saving feel
  like a dead end in the first place; the header palette still links there
  either way, so the route is never unreachable - including for someone already
  standing on it who has just removed their last piece.
*/
function navItems(savedCount: number) {
  return savedCount > 0 ? [...NAV, STUDIO] : NAV;
}

function Wordmark() {
  return (
    <Link
      to="/"
      aria-label="little wash - home"
      className="flex min-h-[44px] shrink-0 items-center gap-2.5 rounded-chip text-ink"
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

function Header() {
  const { favorites, painted, references } = useApp();
  /*
    Count what the studio can actually show, not raw ids. `savedReferences`
    drops ids whose catalogue entry has gone, so counting the raw array would
    advertise "Studio" in the nav while the page renders its empty state -
    the dead end this rule exists to prevent.
  */
  /*
    Either list makes the studio worth opening. Counting only saved pieces
    would strand someone who has painted things but set none aside - the same
    dead end this rule was written to prevent, from the other direction.
  */
  const items = navItems(
    savedReferences(references, favorites).length +
      paintedReferences(references, painted).length,
  );

  return (
    <header className="sticky top-0 z-20 border-b border-line bg-[rgb(var(--surface-raised)/0.85)] backdrop-blur">
      <div className="mx-auto w-full max-w-6xl px-3 sm:px-6">
        <div className="flex items-center justify-between gap-3 py-3">
          <Wordmark />

          <nav aria-label="Primary" className="nav-inline hidden md:block">
            <ul className="flex items-center gap-1">
              {items.map((item) => (
                <li key={item.label}>
                  <NavLink
                    to={`/${item.to}`}
                    end={item.end}
                    className={({ isActive }) =>
                      `inline-flex min-h-[44px] items-center gap-2 rounded-chip px-3 text-[0.95rem] font-semibold transition-colors ${
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

          <SavedPalette />
        </div>

        <nav aria-label="Primary" className="nav-stacked -mx-3 overflow-x-auto px-3 pb-2 md:hidden">
          <ul className="flex items-center gap-1">
            {items.map((item) => (
              <li key={item.label}>
                <NavLink
                  to={`/${item.to}`}
                  end={item.end}
                  className={({ isActive }) =>
                    `inline-flex min-h-[44px] items-center gap-1.5 whitespace-nowrap rounded-chip px-3 text-[0.9rem] font-semibold transition-colors ${
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

/**
 * Credits the application owes its providers, as distinct from the credit each
 * reference carries.
 *
 * Pexels asks for a prominent "Photos provided by Pexels" link wherever its
 * photos appear; Unsplash asks to be named alongside the photographer. Built
 * from the sources actually on screen, so the footer only ever claims what is
 * true: switch a source off and its line goes with it.
 */
function PlatformCredits() {
  const { catalogue, isSourceEnabled } = useApp();
  /*
    Warm-up inspiration photos come from the same platforms and owe the same
    credit. They are named here rather than assumed to be covered by the
    catalogue, and they obey the same switch: a source turned off hides its
    warm-up photos too.
  */
  const inspiration = Object.values(INSPIRATION_PHOTOS)
    .map((photo) => photo.credit.sourceId)
    .filter(isSourceEnabled);
  const credits = platformAttributions([
    ...catalogue.map((reference) => reference.credit.sourceId),
    ...inspiration,
  ]);

  if (credits.length === 0) return null;

  return (
    <p className="flex flex-wrap gap-x-3 gap-y-1">
      {credits.map((credit) => (
        <a
          key={credit.url}
          href={credit.url}
          target="_blank"
          rel="noopener noreferrer"
          className="underline decoration-[rgb(var(--ink)/0.25)] underline-offset-2 hover:decoration-[rgb(var(--ink)/0.6)]"
        >
          {credit.label}
        </a>
      ))}
    </p>
  );
}

const FOOTER_LINK =
  "underline decoration-[rgb(var(--ink)/0.25)] underline-offset-2 hover:decoration-[rgb(var(--ink)/0.6)]";

/**
 * Where what you save and paint lives, in a sentence. The second of the two
 * places sign-in is offered (the studio is the other), and the quieter: small
 * print, no button styling, there for whoever reads that far.
 */
function WhereThingsAreKept() {
  const { status, openSignIn } = useAccount();
  if (status === "unavailable") {
    return <>What you save, paint and switch off stays in this browser.</>;
  }
  if (status === "signed-in") {
    return <>Signed in: what you save and paint is kept with your account.</>;
  }
  return (
    <>
      What you save and paint stays in this browser unless you{" "}
      {/* A real button with a 44px target, dressed as the footer's links. */}
      <button
        type="button"
        onClick={openSignIn}
        className={`-my-3 inline-flex min-h-[44px] items-center ${FOOTER_LINK}`}
      >
        sign in
      </button>
      .
    </>
  );
}

function Footer() {
  return (
    <footer className="relative z-10 border-t border-line px-4 py-6 sm:px-6">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-1 text-[0.78rem] text-ink-faint">
        <p className="text-pretty">
          Design-exploration prototype. <WhereThingsAreKept /> References are
          real photographs and museum works, credited on every piece.
        </p>
        <PlatformCredits />
        <p>
          little wash - a little colour, every day. Working name.{" "}
          <Link to="/sources" className={FOOTER_LINK}>
            Where ideas come from
          </Link>
          {" · "}
          <Link to="/privacy" className={FOOTER_LINK}>
            Privacy
          </Link>
        </p>
      </div>
    </footer>
  );
}
