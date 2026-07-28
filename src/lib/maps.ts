/**
 * Both of these are free-text place search, not a strict address lookup —
 * "Walmart" works exactly the same as a formatted street address, since
 * we're just handing the query straight to Maps/Waze's own search.
 */
export function mapsUrl(query: string) {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
}

export function wazeUrl(query: string) {
  return `https://waze.com/ul?q=${encodeURIComponent(query)}&navigate=yes`;
}
