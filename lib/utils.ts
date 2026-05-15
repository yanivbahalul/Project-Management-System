import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function makeId(prefix = ""): string {
  try {
    if (
      typeof globalThis !== "undefined" &&
      typeof globalThis.crypto !== "undefined" &&
      typeof globalThis.crypto.randomUUID === "function"
    ) {
      return `${prefix}${globalThis.crypto.randomUUID()}`;
    }
  } catch {
    // ignore
  }
  return `${prefix}${Date.now().toString(36)}-${Math.random()
    .toString(36)
    .slice(2, 10)}`;
}

export function trimToLength(value: string, max: number): string {
  const trimmed = value.trim();
  return trimmed.length > max ? trimmed.slice(0, max) : trimmed;
}
