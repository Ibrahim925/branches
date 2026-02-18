function extractDatePart(value: string | null | undefined): string | null {
  if (!value) return null;
  const match = value.match(/^(\d{4}-\d{2}-\d{2})/);
  return match?.[1] || null;
}

export function getDateOnlyYear(value: string | null | undefined): number | null {
  const datePart = extractDatePart(value);
  if (!datePart) return null;
  const year = Number(datePart.slice(0, 4));
  return Number.isFinite(year) ? year : null;
}

export function formatDateOnly(
  value: string | null | undefined,
  locale: Intl.LocalesArgument = 'en-US',
  options: Intl.DateTimeFormatOptions = {}
): string | null {
  const datePart = extractDatePart(value);
  if (!datePart) return null;

  const [yearRaw, monthRaw, dayRaw] = datePart.split('-');
  const year = Number(yearRaw);
  const month = Number(monthRaw);
  const day = Number(dayRaw);

  if (!Number.isFinite(year) || !Number.isFinite(month) || !Number.isFinite(day)) {
    return null;
  }

  const utcDate = new Date(Date.UTC(year, month - 1, day));
  return new Intl.DateTimeFormat(locale, {
    ...options,
    timeZone: 'UTC',
  }).format(utcDate);
}
