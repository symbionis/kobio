import { describe, expect, it } from "vitest";
import { audioFormat } from "./audio";

describe("audioFormat", () => {
  it("strips codec params and maps aliases to the format Whisper expects", () => {
    expect(audioFormat("audio/webm;codecs=opus")).toBe("webm");
    expect(audioFormat("audio/webm")).toBe("webm");
    expect(audioFormat("audio/mp4")).toBe("m4a");
    expect(audioFormat("audio/x-m4a")).toBe("m4a");
    expect(audioFormat("audio/mpeg")).toBe("mp3");
    expect(audioFormat("audio/x-wav")).toBe("wav");
  });

  it("falls back to webm when the mime is unusable", () => {
    expect(audioFormat("")).toBe("webm");
  });
});
