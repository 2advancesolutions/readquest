/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class',
  content: [
    './app/**/*.{js,jsx,ts,tsx}',
    './src/**/*.{js,jsx,ts,tsx}',
    './components/**/*.{js,jsx,ts,tsx}',
  ],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
        // ── ReadQuest Brand (matches design-tokens.css) ──────────────────
        'rq-purple':       '#702AE1',
        'rq-purple-light': '#B28CFF',
        'rq-purple-light2':'#EDE9FE',
        'rq-purple-dark':  '#5B1BB8',
        'rq-purple-dim':   '#6411D5',
        'rq-gold':         '#FFD709',
        'rq-gold-dark':    '#6C5A00',
        'rq-yellow':       '#FFB623',
        'rq-yellow-light': '#FFC96F',
        'rq-coral':        '#F74B6D',
        'rq-coral-light':  '#FF8EAC',
        'rq-green':        '#007439',
        'rq-green-light':  '#6DFE9C',

        // ── Night-Bloom dark theme ────────────────────────────────────────
        'nb-bg':           '#0d0d1a',
        'nb-surface':      '#12122a',
        'nb-card':         '#1a1a35',
        'nb-purple':       '#7C3AED',

        // ── Light surface hierarchy ───────────────────────────────────────
        'rq-bg':           '#FFFFFF',
        'rq-surface-low':  '#F9F9FB',
        'rq-surface':      '#F3F0FA',
        'rq-surface-high': '#EDE9F6',
        'rq-card':         '#FFFFFF',
        'rq-card-alt':     '#F7F3FF',

        // ── Text ─────────────────────────────────────────────────────────
        'rq-text':         '#322C3D',
        'rq-text-muted':   '#69537B',
        'rq-text-light':   '#ADA3B8',
        'rq-on-primary':   '#F8F0FF',
      },
      fontFamily: {
        heading: ['Plus Jakarta Sans', 'System'],
        body:    ['Plus Jakarta Sans', 'System'],
      },
      borderRadius: {
        'rq-sm': '12px',
        'rq-md': '16px',
        'rq-lg': '24px',
        'rq-xl': '32px',
      },
      spacing: {
        'rq-xs': '4px',
        'rq-sm': '8px',
        'rq-md': '16px',
        'rq-lg': '24px',
        'rq-xl': '40px',
        'rq-2xl': '64px',
      },
    },
  },
  plugins: [],
}
