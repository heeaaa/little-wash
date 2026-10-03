import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { useAccount } from "@/state/AccountContext";

/** An address for questions, if the build was given one (docs/deploying-accounts.md). */
function supportEmail(): string | null {
  const value = import.meta.env.VITE_SUPPORT_EMAIL?.trim();
  return value && /^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/.test(value) ? value : null;
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="mt-8">
      <h2 className="font-display text-xl font-medium tracking-tight text-ink">{title}</h2>
      <div className="mt-3 space-y-3 text-pretty text-[1rem] leading-relaxed text-ink-soft">{children}</div>
    </section>
  );
}

/**
 * What little wash keeps about a person, in plain words.
 *
 * Written to be true of this build and nothing more: the section on accounts
 * appears only when the build has them. The owner reviews it before it goes
 * live (docs/deploying-accounts.md); it is not legal advice.
 */
export function Privacy() {
  const email = supportEmail();
  const accounts = useAccount().status !== "unavailable";

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 lg:py-12">
      <div className="max-w-reading">
        <h1 className="text-balance font-display text-[2rem] font-medium leading-tight tracking-tight text-ink sm:text-[2.5rem]">
          Privacy
        </h1>
        <p className="mt-2 text-pretty text-[1.02rem] leading-relaxed text-ink-soft">
          little wash keeps as little about you as it can. This is all of it.
        </p>

        <Section title="Without an account">
          <p>
            Everything you save, mark painted or switch off stays in this browser, on this device.
            None of it is sent anywhere. Clearing this site&rsquo;s data in your browser removes it.
          </p>
          <p>
            The pictures load from where they are kept: Pexels and Unsplash for photographs, and
            little wash itself for museum works. As with any website, those servers see your
            device&rsquo;s internet address when a picture loads.
          </p>
        </Section>

        {accounts ? (
          <>
            <Section title="If you sign in with Google">
              <p>
                Signing in is optional. Google confirms who you are and shares your email address,
                name and profile picture link with Supabase, the service little wash keeps accounts
                with. little wash never sees your Google password.
              </p>
              <p>
                Your account holds your email address, the name and picture link Google shared, the
                pieces you save and mark painted with the day you painted them, and when you signed
                in. Supabase also records the internet address each sign-in came from, for security.
              </p>
              <p>
                It is used only to show you your studio on each device you sign in on. It is not
                shared, sold or used for advertising, and nothing tracks what you do in the app.
              </p>
            </Section>

            <Section title="Signing out and deleting">
              <p>
                Signing out removes your account&rsquo;s pieces from this browser. They stay in your
                account for next time.
              </p>
              <p>
                <strong className="font-semibold text-ink">Delete my account</strong>, at the foot of{" "}
                <Link to="/studio" className="underline decoration-[rgb(var(--ink)/0.3)] underline-offset-2">
                  your studio
                </Link>{" "}
                when you are signed in, deletes your account and everything in it, on every device.
                It cannot be undone.
              </p>
            </Section>
          </>
        ) : null}

        <Section title="Your rights">
          <p>
            Under New Zealand&rsquo;s Privacy Act 2020 you can ask to see, or correct, what is held
            about you.
            {email ? (
              <>
                {" "}
                Email{" "}
                <a href={`mailto:${email}`} className="underline decoration-[rgb(var(--ink)/0.3)] underline-offset-2">
                  {email}
                </a>
                .
              </>
            ) : null}
          </p>
        </Section>

        <p className="mt-10 text-[0.85rem] text-ink-faint">Last updated 02/10/2026.</p>
      </div>
    </div>
  );
}
