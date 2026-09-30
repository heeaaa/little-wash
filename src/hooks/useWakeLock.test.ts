import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, renderHook, waitFor } from "@testing-library/react";
import { useWakeLock } from "@/hooks/useWakeLock";

/*
  jsdom has no Screen Wake Lock, so these run against a stand-in that behaves
  like the spec: request() resolves to a sentinel, release() fires a "release"
  event, and the browser can drop the lock on its own. This proves the hook's
  bookkeeping, not that any real browser keeps a screen awake - that needs a
  device.
*/
class FakeSentinel extends EventTarget {
  released = false;
  readonly type = "screen" as const;
  onrelease = null;
  release = vi.fn(async () => {
    this.drop();
  });
  /** What the browser does when the page is hidden. */
  drop() {
    if (this.released) return;
    this.released = true;
    this.dispatchEvent(new Event("release"));
  }
}

let sentinels: FakeSentinel[];
let request: ReturnType<typeof vi.fn>;
let visibility: DocumentVisibilityState;

function install(impl?: () => Promise<FakeSentinel>) {
  request = vi.fn(
    impl ??
      (async () => {
        const s = new FakeSentinel();
        sentinels.push(s);
        return s;
      }),
  );
  Object.defineProperty(navigator, "wakeLock", {
    configurable: true,
    value: { request },
  });
}

function setVisibility(state: DocumentVisibilityState) {
  visibility = state;
  document.dispatchEvent(new Event("visibilitychange"));
}

beforeEach(() => {
  sentinels = [];
  visibility = "visible";
  Object.defineProperty(document, "visibilityState", {
    configurable: true,
    get: () => visibility,
  });
});

afterEach(() => {
  delete (navigator as { wakeLock?: unknown }).wakeLock;
});

describe("useWakeLock", () => {
  it("reports unsupported where the browser has no wake lock", () => {
    const { result } = renderHook(() => useWakeLock(true));
    expect(result.current.status).toBe("unsupported");
  });

  it("holds a lock once asked, and lets it go when switched off", async () => {
    install();
    const { result } = renderHook(() => useWakeLock(true));
    expect(result.current.status).toBe("off");
    expect(request).not.toHaveBeenCalled();

    act(() => result.current.toggle());
    await waitFor(() => expect(result.current.status).toBe("on"));
    expect(request).toHaveBeenCalledWith("screen");

    act(() => result.current.toggle());
    await waitFor(() => expect(result.current.status).toBe("off"));
    expect(sentinels[0]!.release).toHaveBeenCalled();
  });

  it("releases when the warm-up closes, and forgets the wish", async () => {
    install();
    const { result, rerender } = renderHook(({ active }) => useWakeLock(active), {
      initialProps: { active: true },
    });
    act(() => result.current.toggle());
    await waitFor(() => expect(result.current.status).toBe("on"));

    rerender({ active: false });
    await waitFor(() => expect(result.current.status).toBe("off"));
    expect(sentinels[0]!.released).toBe(true);
    expect(result.current.wanted).toBe(false);

    // Reopening does not quietly take the lock again.
    rerender({ active: true });
    expect(request).toHaveBeenCalledTimes(1);
  });

  it("asks again when the page comes back, after the browser dropped the lock", async () => {
    install();
    const { result } = renderHook(() => useWakeLock(true));
    act(() => result.current.toggle());
    await waitFor(() => expect(result.current.status).toBe("on"));

    act(() => {
      setVisibility("hidden");
      sentinels[0]!.drop();
    });
    await waitFor(() => expect(result.current.status).toBe("off"));
    expect(result.current.wanted).toBe(true);

    act(() => setVisibility("visible"));
    await waitFor(() => expect(result.current.status).toBe("on"));
    expect(request).toHaveBeenCalledTimes(2);
  });

  it("does not ask while the page is hidden", () => {
    install();
    visibility = "hidden";
    const { result } = renderHook(() => useWakeLock(true));
    act(() => result.current.toggle());
    expect(request).not.toHaveBeenCalled();
  });

  it("says so when the browser refuses, instead of claiming to be on", async () => {
    install(async () => {
      throw new DOMException("Battery saver", "NotAllowedError");
    });
    const { result } = renderHook(() => useWakeLock(true));
    act(() => result.current.toggle());
    await waitFor(() => expect(result.current.status).toBe("refused"));
    // The switch reads off after a refusal, so the wish is dropped with it.
    expect(result.current.wanted).toBe(false);

    // One tap on a switch that reads "off" asks again - not two.
    act(() => result.current.toggle());
    await waitFor(() => expect(request).toHaveBeenCalledTimes(2));
  });

  it("does not quietly take the lock after a refusal when the page comes back", async () => {
    let refuse = true;
    install(async () => {
      if (refuse) throw new DOMException("Battery saver", "NotAllowedError");
      const s = new FakeSentinel();
      sentinels.push(s);
      return s;
    });
    const { result } = renderHook(() => useWakeLock(true));
    act(() => result.current.toggle());
    await waitFor(() => expect(result.current.status).toBe("refused"));

    refuse = false;
    act(() => {
      setVisibility("hidden");
      setVisibility("visible");
    });
    expect(request).toHaveBeenCalledTimes(1);
    expect(result.current.status).toBe("refused");
  });

  it("shows a lock the browser drops while the page is visible as off, not on", async () => {
    install();
    const { result } = renderHook(() => useWakeLock(true));
    act(() => result.current.toggle());
    await waitFor(() => expect(result.current.status).toBe("on"));

    // Battery saver or a power policy, with the page still in front.
    act(() => sentinels[0]!.drop());
    await waitFor(() => expect(result.current.status).toBe("refused"));
    expect(result.current.wanted).toBe(false);
  });

  it("gives back a lock that arrives after it was no longer wanted", async () => {
    let resolve!: (s: FakeSentinel) => void;
    const late = new FakeSentinel();
    install(() => new Promise((r) => (resolve = r)));
    const { result } = renderHook(() => useWakeLock(true));

    act(() => result.current.toggle());
    expect(result.current.status).toBe("requesting");
    act(() => result.current.toggle());

    await act(async () => resolve(late));
    expect(late.release).toHaveBeenCalled();
    expect(result.current.status).toBe("off");
  });

  it("releases on unmount", async () => {
    install();
    const { result, unmount } = renderHook(() => useWakeLock(true));
    act(() => result.current.toggle());
    await waitFor(() => expect(result.current.status).toBe("on"));
    unmount();
    expect(sentinels[0]!.released).toBe(true);
  });
});
