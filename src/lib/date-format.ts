export function formatDateTime(input: string, options: Intl.DateTimeFormatOptions) {
  const date = safeDate(input);

  return new Intl.DateTimeFormat("en", options).format(date);
}

export function safeDate(input: string | Date | null | undefined) {
  if (!input) {
    return new Date();
  }

  const date = new Date(input);

  if (Number.isNaN(date.getTime())) {
    return new Date();
  }

  return date;
}
