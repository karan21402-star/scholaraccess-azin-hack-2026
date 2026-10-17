import { describe, expect, it } from "vitest";
import { parseCommand } from "./commands";

describe("parseCommand", () => {
  it("recognizes stop before other actions", () => {
    expect(parseCommand("Stop")).toEqual({ intent: "stop" });
  });

  it("finds the application form", () => {
    expect(parseCommand("Find the registration form")).toEqual({ intent: "find", target: "application-form" });
  });

  it("reads eligibility criteria", () => {
    expect(parseCommand("Read the eligibility criteria")).toEqual({ intent: "read", target: "eligibility" });
  });

  it("keeps ambiguous requests from selecting a target", () => {
    expect(parseCommand("open something")).toEqual({ intent: "unknown" });
    expect(parseCommand("do something")).toEqual({ intent: "unknown" });
  });

  it("requires a recognized explicit form submission command", () => {
    expect(parseCommand("submit application")).toEqual({ intent: "submit", target: "application-form" });
  });
});
