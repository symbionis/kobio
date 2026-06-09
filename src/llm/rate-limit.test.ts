import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { clientIp, rateLimit } from "./rate-limit";

describe("rateLimit", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it("allows exactly `limit` calls in the window, then blocks", () => {
    for (let i = 0; i < 3; i++) expect(rateLimit("a", 3, 1000)).toBe(true);
    expect(rateLimit("a", 3, 1000)).toBe(false);
    expect(rateLimit("a", 3, 1000)).toBe(false);
  });

  it("slides: allows again once the window has passed", () => {
    for (let i = 0; i < 3; i++) rateLimit("b", 3, 1000);
    expect(rateLimit("b", 3, 1000)).toBe(false);
    vi.advanceTimersByTime(1001);
    expect(rateLimit("b", 3, 1000)).toBe(true);
  });

  it("keys are independent", () => {
    for (let i = 0; i < 3; i++) rateLimit("c", 3, 1000);
    expect(rateLimit("c", 3, 1000)).toBe(false);
    expect(rateLimit("d", 3, 1000)).toBe(true);
  });
});

describe("clientIp", () => {
  it("takes the first x-forwarded-for hop, trimmed", () => {
    const req = new Request("http://x", {
      headers: { "x-forwarded-for": "1.2.3.4, 5.6.7.8" },
    });
    expect(clientIp(req)).toBe("1.2.3.4");
  });

  it("falls back to x-real-ip, then 'unknown'", () => {
    expect(clientIp(new Request("http://x", { headers: { "x-real-ip": "9.9.9.9" } }))).toBe("9.9.9.9");
    expect(clientIp(new Request("http://x"))).toBe("unknown");
  });
});
