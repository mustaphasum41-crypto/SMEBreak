import { describe, it, expect } from "vitest";
import { statusFor } from "./breaks";

const min = (m: number) => m * 60000;

describe("break duration rules", () => {
  it("short break up to 20 min is normal", () => {
    expect(statusFor("short", min(20))).toBe("normal");
  });
  it("short break over 20 up to 25 min is slightly alarming", () => {
    expect(statusFor("short", min(20.1))).toBe("alarming");
    expect(statusFor("short", min(25))).toBe("alarming");
  });
  it("short break over 25 min is excessive", () => {
    expect(statusFor("short", min(25.1))).toBe("excessive");
  });
  it("lunch up to 60 min is normal", () => {
    expect(statusFor("lunch", min(60))).toBe("normal");
  });
  it("lunch over 60 up to 70 min is slightly alarming", () => {
    expect(statusFor("lunch", min(61))).toBe("alarming");
    expect(statusFor("lunch", min(70))).toBe("alarming");
  });
  it("lunch over 70 min is excessive", () => {
    expect(statusFor("lunch", min(71))).toBe("excessive");
  });
});
