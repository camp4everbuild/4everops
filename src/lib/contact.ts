/** Normalizes to a bare digit string, assuming a US number when one isn't already prefixed with a country code — good enough for a single-camp staff roster. */
function phoneDigits(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  return digits.length === 10 ? `1${digits}` : digits;
}

export function telUrl(phone: string) {
  return `tel:+${phoneDigits(phone)}`;
}

export function smsUrl(phone: string) {
  return `sms:+${phoneDigits(phone)}`;
}

export function whatsappUrl(phone: string) {
  return `https://wa.me/${phoneDigits(phone)}`;
}
