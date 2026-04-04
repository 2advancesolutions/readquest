/**
 * removeBackground.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Client-side background removal using the browser Canvas API.
 *
 * Works for BOTH:
 *   • Gallery portraits  — local paths like /char_icons/nova_pulse.png
 *   • Generated portraits — remote URLs from Supabase / fal.ai
 *
 * How it works:
 *   1. Draws the image onto an off-screen <canvas>
 *   2. Reads every pixel via getImageData()
 *   3. Sets white / near-white pixels (R,G,B ≥ threshold) to alpha = 0
 *   4. Returns the processed image as a data-URL (PNG with transparency)
 *
 * Returns the ORIGINAL src on any error so the UI always has a fallback.
 */

const WHITE_THRESHOLD = 230   // Pixels with R, G, B all ≥ this become transparent
const EDGE_FEATHER    = 245   // Pixels in this "soft edge" range get partial alpha

/**
 * Removes the white/near-white background from an image URL and returns
 * a transparent PNG data-URL.
 *
 * @param src - Any image URL (local path, data-URL, or remote HTTPS URL)
 * @returns   - A PNG data-URL with transparent background, or the original src on error
 */
export async function removeBackground(src: string): Promise<string> {
  if (!src) return src

  return new Promise<string>((resolve) => {
    const img = new Image()

    // Only set crossOrigin for external (remote) URLs.
    // Setting it on same-origin local paths taints the canvas because Vite's
    // dev server doesn't send CORS headers for static assets — causing
    // getImageData() to throw a SecurityError.
    if (src.startsWith('http://') || src.startsWith('https://')) {
      img.crossOrigin = 'anonymous'
    }

    img.onload = () => {
      try {
        const canvas  = document.createElement('canvas')
        const ctx     = canvas.getContext('2d')
        if (!ctx) { resolve(src); return }

        canvas.width  = img.naturalWidth
        canvas.height = img.naturalHeight
        ctx.drawImage(img, 0, 0)

        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
        const data      = imageData.data   // flat Uint8ClampedArray [R,G,B,A, R,G,B,A, …]

        for (let i = 0; i < data.length; i += 4) {
          const r = data[i]
          const g = data[i + 1]
          const b = data[i + 2]

          if (r >= WHITE_THRESHOLD && g >= WHITE_THRESHOLD && b >= WHITE_THRESHOLD) {
            // Fully transparent
            data[i + 3] = 0
          } else if (r >= EDGE_FEATHER - 15 && g >= EDGE_FEATHER - 15 && b >= EDGE_FEATHER - 15) {
            // Soft-edge feathering: ramp alpha down smoothly near the threshold
            const brightness = (r + g + b) / 3
            const ratio = (brightness - WHITE_THRESHOLD) / (255 - WHITE_THRESHOLD)
            data[i + 3] = Math.round((1 - Math.min(ratio, 1)) * 255)
          }
        }

        ctx.putImageData(imageData, 0, 0)
        resolve(canvas.toDataURL('image/png'))
      } catch (err) {
        console.warn('[removeBackground] canvas read failed, returning original src:', err)
        resolve(src)   // fallback — never break the UI
      }
    }

    img.onerror = () => resolve(src)   // fallback — broken image just passes through

    img.src = src
  })
}

/**
 * React hook-friendly wrapper — returns the processed src string.
 * Accepts null/undefined gracefully and returns null until ready.
 *
 * Usage:
 *   const transparentSrc = useTransparentImage(rawSrc)
 *   <img src={transparentSrc ?? rawSrc} />
 */
export function removeBackgroundIfNeeded(src: string | null | undefined): Promise<string | null> {
  if (!src) return Promise.resolve(null)
  return removeBackground(src)
}
