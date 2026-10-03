import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import { useNavigate } from "react-router-dom";
import { ACCOUNT_CONFIG } from "@/lib/account/config";
import { browserGuestStore } from "@/lib/account/guest";
import {
  createAccountService,
  type AccountService,
  type AccountSnapshot,
} from "@/lib/account/service";

/**
 * Lets a test hand AppShell its own service (an in-memory backend) without
 * AppShell growing a prop that only tests would ever pass.
 */
export const AccountServiceOverride = createContext<AccountService | null>(null);

/*
  One service for the life of the page, and so one supabase-js client.
  AppShell, which holds the provider, unmounts on the routes outside it and
  mounts again on the way back; a service per mount left the old one's timers
  and listeners running beside a second client on the same session
  (independent review, 02/10/2026).
*/
let shared: AccountService | null = null;

function appService(): AccountService {
  shared ??= createAccountService({
    config: ACCOUNT_CONFIG,
    guest: browserGuestStore,
    // The only route to supabase-js: a separate chunk, fetched on first need.
    loadBackend: (config) =>
      import("@/lib/account/supabaseBackend").then((module) => module.createSupabaseBackend(config)),
  });
  return shared;
}

export interface AccountContextValue extends AccountSnapshot {
  signIn: () => Promise<void>;
  signOut: (options?: { discardUnsent?: boolean }) => Promise<void>;
  keepSignedIn: () => void;
  deleteAccount: () => Promise<void>;
  toggleSaved: (id: string) => void;
  togglePainted: (id: string, on: string) => void;
  retry: () => void;
  dismissNotice: () => void;
  /** The sign-in sheet: one, in AppShell, opened from wherever offers it. */
  sheetOpen: boolean;
  /**
   * A notice that arrived while the sheet was open, such as a sign-in that
   * could not start. The page behind an open sheet is inert, so the sheet
   * says it itself.
   */
  sheetNotice: AccountSnapshot["notice"];
  openSignIn: () => void;
  closeSignIn: () => void;
}

const noop = () => undefined;
const resolved = () => Promise.resolve();

/** What every screen sees with no provider: a build without accounts. */
const UNAVAILABLE: AccountContextValue = {
  status: "unavailable",
  user: null,
  record: null,
  sync: "idle",
  pending: 0,
  busy: null,
  notice: null,
  host: null,
  returnTo: null,
  confirmSignOut: false,
  signIn: resolved,
  signOut: resolved,
  keepSignedIn: noop,
  deleteAccount: resolved,
  toggleSaved: noop,
  togglePainted: noop,
  retry: noop,
  dismissNotice: noop,
  sheetOpen: false,
  sheetNotice: null,
  openSignIn: noop,
  closeSignIn: noop,
};

const AccountContext = createContext<AccountContextValue>(UNAVAILABLE);

export function AccountProvider({ children }: { children: ReactNode }) {
  const injected = useContext(AccountServiceOverride);
  const [service] = useState(() => injected ?? appService());

  useEffect(() => {
    service.start();
    return () => service.stop();
  }, [service]);

  const snapshot = useSyncExternalStore(service.subscribe, service.getSnapshot, service.getSnapshot);

  // After a fresh sign-in the address is the page Google returned to, which
  // is the root; take the person back to where they tapped "Sign in".
  const navigate = useNavigate();
  useEffect(() => {
    if (!snapshot.returnTo) return;
    const to = service.takeReturnTo();
    if (to) navigate(to, { replace: true });
  }, [snapshot.returnTo, service, navigate]);

  // While the sheet is open: the id of the notice showing when it opened, so
  // anything newer can be said inside it. Null while it is closed.
  const [sheetSince, setSheetSince] = useState<number | null>(null);
  const openSignIn = useCallback(() => {
    service.prepare();
    setSheetSince(service.getSnapshot().notice?.id ?? 0);
  }, [service]);
  const closeSignIn = useCallback(() => setSheetSince(null), []);
  const sheetOpen = sheetSince !== null && snapshot.status !== "signed-in";
  // Signed in with the sheet open - followed from another tab - closes it for
  // good, not just out of sight: a later sign-out must not bring it back.
  useEffect(() => {
    if (snapshot.status === "signed-in") setSheetSince(null);
  }, [snapshot.status]);

  const value = useMemo<AccountContextValue>(
    () => ({
      ...snapshot,
      signIn: service.signIn,
      signOut: service.signOut,
      keepSignedIn: service.keepSignedIn,
      deleteAccount: service.deleteAccount,
      toggleSaved: service.toggleSaved,
      togglePainted: service.togglePainted,
      retry: service.retry,
      dismissNotice: service.dismissNotice,
      sheetOpen,
      sheetNotice:
        sheetOpen && snapshot.notice && snapshot.notice.id > (sheetSince ?? 0) ? snapshot.notice : null,
      openSignIn,
      closeSignIn,
    }),
    [snapshot, service, sheetOpen, sheetSince, openSignIn, closeSignIn],
  );

  return <AccountContext.Provider value={value}>{children}</AccountContext.Provider>;
}

export function useAccount(): AccountContextValue {
  return useContext(AccountContext);
}
