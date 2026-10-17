export type CommandIntent =
  | "stop"
  | "find"
  | "read"
  | "explain"
  | "scroll"
  | "submit"
  | "help"
  | "unknown";

export interface ParsedCommand {
  intent: CommandIntent;
  target?: string;
  direction?: "up" | "down";
}

export function parseCommand(raw: string): ParsedCommand {
  const command = raw.trim().toLowerCase();
  if (!command) return { intent: "unknown" };
  if (/^(stop|cancel|quiet|be quiet)\b/.test(command)) return { intent: "stop" };
  if (/\b(help|what can you do)\b/.test(command)) return { intent: "help" };
  if (/\b(submit|send) (the )?(application|form)\b/.test(command)) return { intent: "submit", target: "application-form" };
  if (/\b(scroll|move)\s+(down|up)\b/.test(command)) {
    return { intent: "scroll", direction: /\bdown\b/.test(command) ? "down" : "up" };
  }
  if (/\b(explain|simpl(er|ify)|in simple words)\b/.test(command)) return { intent: "explain" };
  if (/\b(read|tell me|what does)\b/.test(command)) {
    const section = command.includes("eligib") ? "eligibility" : command.includes("document") ? "documents" : "scholarship-details";
    return { intent: "read", target: section };
  }
  if (/\b(find|locate|show|open|go to)\b/.test(command)) {
    const target = command.includes("registr") || command.includes("form")
      ? "application-form"
      : command.includes("eligib")
        ? "eligibility"
        : command.includes("document")
          ? "documents"
          : command.includes("deadline")
            ? "scholarship-details"
            : command.includes("scholarship") || command.includes("details") || command.includes("opportunit")
              ? "scholarship-details"
              : undefined;
    if (!target) return { intent: "unknown" };
    return { intent: "find", target };
  }
  return { intent: "unknown" };
}
