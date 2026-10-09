/** Opens the phone's maps app (Google Maps universal link works on Android and iOS). */
export function directionsUrl(lat: number, lng: number): string {
  return `https://www.google.com/maps/dir/?api=1&destination=${lat.toFixed(6)},${lng.toFixed(6)}`;
}

/** Native share sheet when available (WhatsApp etc.), otherwise copy the link. */
export async function sharePage(path: string, title: string): Promise<"shared" | "copied" | "failed"> {
  const url = new URL(path, window.location.origin).toString();
  try {
    if (navigator.share) {
      await navigator.share({ title, url });
      return "shared";
    }
    await navigator.clipboard.writeText(url);
    return "copied";
  } catch {
    return "failed";
  }
}
