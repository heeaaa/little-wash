# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

Mobile-first, installable PWA. Mobile web and installed PWA are the same design language; there is no native app target.

## Stack

Fixed by the repository instructions in CLAUDE.md, not chosen here:

- React, TypeScript in strict mode, Vite, Tailwind CSS, optional shadcn/ui, PWA integration.
- Backend: Supabase (PostgreSQL, Auth, Storage).
- Hosting target: Netlify free tier, or an explicitly agreed alternative.
- Tests: Vitest, React Testing Library, Playwright, axe-core.
- One package manager with a committed lockfile; npm and a supported Node LTS by default.

Prototyping runs on mock data first. Production services are not connected until that phase is requested.

## Users

Both newcomers and returning hobbyists, served by one app, with difficulty and time filters carrying the work of matching each person to their level.

- **Nervous beginners:** own a modest watercolour set, feel intimidated by the blank page, and need permission to make an ordinary painting more than they need instruction.
- **Returning hobbyists:** already own real supplies and have painted before. Their blocker is "what do I paint today", not technique.

The shared situation: a short window of free time, a phone in one hand and a sketchbook and paints on the table, deciding whether to start at all. The job is to get from opening the app to brush on paper with as little deliberation as possible.

Because one library serves both groups, the catalogue must be broad enough that filtering produces a satisfying result at every difficulty level, not just the middle.

## Product Purpose

Little Wash removes the decision that stops people painting. It offers a daily piece of inspiration, curated reference collections, and short brushwork and colour exercises, all filtered by subject, available time and difficulty, so a person can start a painting in under a minute.

Success is a person painting more often, and feeling relaxed about it. It is not engagement time in the app, and explicitly not streaks: the app must never punish a missed day or apply pressure to keep a run alive. Practice history exists to let someone look back with satisfaction, not to enforce consistency.

## Positioning

Most painting apps either teach technique through structured courses or act as generic image galleries. Little Wash does neither. It curates specifically for sketchability: simple shapes, a clear focal subject, minimal background, and a composition a person can finish in the time they actually have. The filters are built around the real constraint (how long have I got, how much energy do I have today) rather than around art-historical categories.

The deliberate absence of streaks and pressure mechanics is part of the position, not an omission.

## Operating Context

- Used on a phone, mostly, propped beside a physical sketchbook while the user paints with real paint on real paper. The screen is a reference surface, not a canvas.
- Sessions are short and bounded: a warm-up of a few minutes, or a single study of fifteen to forty-five minutes.
- Likely used with wet hands, poor lighting, or a device set down at an angle. Touch targets, glare tolerance and legibility at arm's length matter more than usual.
- Offline or patchy connectivity is realistic: a kitchen table, a park, a café. Installability and offline behaviour are real usage requirements, not features.
- Reference colour fidelity is load-bearing. The user is mixing paint to match what is on screen, so decorative tints, filters or theme-driven colour shifts must never alter a reference image. Detail view shows references uncropped on a neutral surface, with an enlarged view usable beside a sketchbook.

## Capabilities and Constraints

Confirmed capabilities (from the brief in CLAUDE.md):

- Daily inspiration, curated reference collections, subject/time/difficulty filters, reference detail view, favourites, practice history, brushwork and colour exercises, and optional daily reminders.

Confirmed constraints:

- **Accounts:** local-first. The app works fully with no account, with data on-device. Supabase sign-in is optional and additive, for syncing across devices. No sign-up wall before the first painting.
- **Reminders:** a service worker alone cannot reliably deliver scheduled local reminders. Reminders are best-effort, scheduled on the backend against the user's timezone, and therefore only available to signed-in users. Notification permission is requested only after an explicit user action. Denial, revocation and expired subscriptions are ordinary states to design for.
- **Cost:** free-tier only. No paid services, no runtime AI calls, no app-store distribution without agreement.
- **Access control:** per-user and admin access enforced in the backend with Supabase RLS, not hidden UI. Ordinary users cannot curate content.
- **Content bar:** every reference must be easy to sketch. Simple shapes, clear focal subject, minimal background, manageable composition. This is a curation gate, not a nice-to-have.

Open decisions, not yet made:

- How the curated catalogue is administered (who curates, through what interface).
- Whether exercises are tied to references or stand alone.
- Whether collections are editorial only, or user-buildable.

## Brand Commitments

- **Name:** Little Wash. Confirmed as the product name, not a placeholder.
- **Tone:** approachable and unpressured. The product must not moralise about consistency or use achievement language.
- **Visual intent recorded in CLAUDE.md:** a welcoming artist's sketchbook feel, with expressive but readable type, subtle tactile detail, restrained pigment accents and generous space, letting the artwork carry most of the colour. The specific visual system is decided later and recorded in DESIGN.md, not here.
- Assets must be original or appropriately licensed, with provenance and attribution recorded. Arbitrary artwork is never scraped. Temporary assets are labelled honestly.

## Evidence on Hand

- **Reference imagery:** open-licensed and public-domain collections (for example Rijksmuseum, the Met's open access, Smithsonian Open Access, and CC0 photo libraries). This requires per-item attribution and provenance tracking as a first-class data requirement, and a curation pipeline that filters those large collections down to genuinely sketchable subjects.
- No existing codebase, design system, brand assets, logo, or copy exist yet. The repository currently contains only project instructions and tooling configuration.
- No users, testimonials, usage data, press or case studies exist. Future work must not fabricate any of these, or imply a catalogue size, user count or partnership that has not been established.

## Product Principles

1. **Starting beats choosing.** Every screen is measured by how quickly it gets someone to brush on paper. Deliberation is the enemy, not lack of options.
2. **No pressure, ever.** No streaks, no guilt, no achievement language. History is a record to enjoy, never a target to maintain.
3. **The artwork carries the colour.** The interface stays quiet and neutral so references read truthfully; nothing decorative may alter a reference's colour.
4. **Sketchability is the curation gate.** A beautiful image that cannot be painted in the stated time at the stated difficulty does not belong in the catalogue.
5. **Works where painting happens.** Offline, one-handed, in bad light, beside a wet sketchbook. Anything that assumes a good connection and full attention is wrong about the context.

## Accessibility & Inclusion

- Target WCAG 2.2 AA: semantic controls, labelled inputs, descriptive image alternatives, visible focus, full keyboard navigation, sufficient contrast, and reduced-motion support.
- Touch targets of at least 44 by 44 CSS pixels, which the wet-hands, phone-propped context makes a practical requirement rather than only a standard.
- Reference alternatives must describe the subject usefully for someone deciding whether to paint it, not just name the file.
- Layouts verified at representative phone, tablet and desktop widths (390, 768 and 1440 CSS pixels) including text zoom and narrow layouts.
