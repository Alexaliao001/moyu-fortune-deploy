import { beforeEach, describe, expect, it, vi } from "vitest";
import { isOffline, onNetworkChange } from "./offlineStorage";

describe("offline network helpers", () => {
  beforeEach(() => {
    vi.unstubAllGlobals();
  });

  it("reports the browser network state", () => {
    vi.stubGlobal("navigator", { onLine: false });
    expect(isOffline()).toBe(true);
    vi.stubGlobal("navigator", { onLine: true });
    expect(isOffline()).toBe(false);
  });

  it("subscribes and unsubscribes to both network events", () => {
    const callback = vi.fn();
    const addEventListener = vi.fn();
    const removeEventListener = vi.fn();
    vi.stubGlobal("window", { addEventListener, removeEventListener });

    const unsubscribe = onNetworkChange(callback);
    expect(addEventListener).toHaveBeenCalledWith("online", expect.any(Function));
    expect(addEventListener).toHaveBeenCalledWith("offline", expect.any(Function));

    unsubscribe();
    expect(removeEventListener).toHaveBeenCalledWith(
      "online",
      expect.any(Function)
    );
    expect(removeEventListener).toHaveBeenCalledWith(
      "offline",
      expect.any(Function)
    );
  });
});
