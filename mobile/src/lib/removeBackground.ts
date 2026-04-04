/**
 * removeBackground.ts (Mobile port)
 * ─────────────────────────────────────────────────────────────────────────────
 * React Native does not provide a Canvas/OffscreenCanvas API, so the
 * client-side pixel-manipulation approach from the web version is not available.
 *
 * Instead we delegate to the backend /api/stories/remove-background endpoint
 * which already exists (see api.ts → storiesApi.removeBackground).
 *
 * Returns the transparent image URL on success, or the original src on any error
 * so the UI always has a fallback — consistent with the web version's contract.
 */

const API_BASE = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:8000'

/**
 * Removes the background from an image URL by calling the backend endpoint.
 *
 * @param src - Any image URL (local asset URI or remote HTTPS URL)
 * @returns   - A transparent PNG URL, or the original src on error
 */
export async function removeBackground(src: string): Promise<string> {
  if (!src) return src

  try {
    const res = await fetch(`${API_BASE}/api/stories/remove-background`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ image_url: src }),
    })
    if (!res.ok) return src

    const json = await res.json() as { transparent_url?: string }
    return json.transparent_url ?? src
  } catch (err) {
    console.warn('[removeBackground] backend call failed, returning original src:', err)
    return src  // fallback — never break the UI
  }
}

/**
 * Graceful null-safe wrapper (mirrors web version's removeBackgroundIfNeeded).
 */
export function removeBackgroundIfNeeded(src: string | null | undefined): Promise<string | null> {
  if (!src) return Promise.resolve(null)
  return removeBackground(src)
}
