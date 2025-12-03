import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatTokenAge(tokenAgeDays: number) {
  if (tokenAgeDays == null || isNaN(tokenAgeDays)) return "N/A";

  const hours = tokenAgeDays * 24;
  const minutes = hours * 60;

  if (hours < 1) {
    // less than 1 hour → minutes
    return `${Math.max(1, Math.round(minutes))}m`;
  }

  if (tokenAgeDays < 1) {
    // less than 1 day → hours
    return `${hours.toFixed(1)}h`;
  }

  if (tokenAgeDays < 7) {
    // under a week → one decimal day
    return `${tokenAgeDays.toFixed(1)}d`;
  }

  // 7+ days → whole days
  return `${Math.floor(tokenAgeDays)}d`;
}
