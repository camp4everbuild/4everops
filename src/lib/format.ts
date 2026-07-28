/** Capitalizes the first letter of each word, leaving the rest untouched (so "McDonald" survives). */
export function capitalizeWords(value: string): string {
  return value.replace(/\b\w/g, (c) => c.toUpperCase());
}

/** Formats a run of digits as a US phone number, growing as you type: "555" -> "(555) 123" -> "(555) 123-4567". */
export function formatPhone(digits: string): string {
  const d = digits.slice(0, 10);
  if (d.length <= 3) return d;
  if (d.length <= 6) return `(${d.slice(0, 3)}) ${d.slice(3)}`;
  return `(${d.slice(0, 3)}) ${d.slice(3, 6)}-${d.slice(6)}`;
}

export function digitsOnly(value: string): string {
  return value.replace(/\D/g, "");
}
