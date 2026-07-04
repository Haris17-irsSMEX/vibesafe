const DATE_FORMATTER = new Intl.DateTimeFormat("en-US", {
  year: "numeric",
  month: "short",
  day: "numeric",
  timeZone: "UTC",
});

const DATE_TIME_FORMATTER = new Intl.DateTimeFormat("en-US", {
  year: "numeric",
  month: "short",
  day: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  timeZone: "UTC",
});

function parseDate(value: string | null | undefined): Date | null {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function formatSafeDate(
  value: string | null | undefined,
  fallback = "Not available"
): string {
  const date = parseDate(value);
  return date ? DATE_FORMATTER.format(date) : fallback;
}

export function formatSafeDateTime(
  value: string | null | undefined,
  fallback = "Not available"
): string {
  const date = parseDate(value);
  return date ? DATE_TIME_FORMATTER.format(date) : fallback;
}
