# Design System

> Brand name: **"Levitation Library"** — Purple-forward with gold accents, rounded shapes, tinted shadows.
> Font: **Plus Jakarta Sans** (Google Fonts)

## CSS Design Tokens (`styles/design-tokens.css`)

### Brand Colors
| Token | Value | Usage |
|-------|-------|-------|
| `--rq-purple` | `#702AE1` | Primary brand |
| `--rq-purple-light` | `#B28CFF` | Hover states, accents |
| `--rq-purple-light2` | `#EDE9FE` | Light backgrounds |
| `--rq-purple-dark` | `#5B1BB8` | Dark variant |
| `--rq-purple-dim` | `#6411D5` | Gradient endpoint |
| `--rq-gold` | `#FFD709` | XP, stars, rewards |
| `--rq-gold-dark` | `#6C5A00` | Gold text |
| `--rq-yellow` | `#FFB623` | Badges, highlights |
| `--rq-yellow-light` | `#FFC96F` | Soft gold |
| `--rq-coral` | `#F74B6D` | Errors, alerts |
| `--rq-coral-light` | `#FF8EAC` | Soft red |
| `--rq-green` | `#007439` | Success, correct |
| `--rq-green-light` | `#6DFE9C` | Soft green |

### Surface Hierarchy (Depth Through Tone — No Borders)
| Token | Value | Level |
|-------|-------|-------|
| `--rq-bg` | `#FFFFFF` | Level 0 — Base |
| `--rq-surface-low` | `#F9F9FB` | Level 1 — Sections |
| `--rq-surface` | `#F3F0FA` | Level 2 — Interactive zones |
| `--rq-surface-high` | `#EDE9F6` | Level 3 — Popped-out |
| `--rq-surface-highest` | `#E7E2F2` | Level 4 — Badges/chips |
| `--rq-card` | `#FFFFFF` | Floating cards |
| `--rq-card-alt` | `#F7F3FF` | Alt card background |

### Text Colors
| Token | Value | Usage |
|-------|-------|-------|
| `--rq-text` | `#322C3D` | Primary text |
| `--rq-text-muted` | `#69537B` | Secondary text |
| `--rq-text-light` | `#ADA3B8` | Tertiary / placeholder |
| `--rq-on-primary` | `#F8F0FF` | Text on purple backgrounds |

### Spacing
| Token | Size |
|-------|------|
| `--rq-space-xs` | 4px |
| `--rq-space-sm` | 8px |
| `--rq-space-md` | 16px |
| `--rq-space-lg` | 24px |
| `--rq-space-xl` | 40px |
| `--rq-space-2xl` | 64px |

### Border Radii (Always Round!)
| Token | Size |
|-------|------|
| `--rq-radius-sm` | 12px |
| `--rq-radius-md` | 16px |
| `--rq-radius-lg` | 24px |
| `--rq-radius-xl` | 32px |
| `--rq-radius-full` | 9999px |

### Shadows (Purple-Tinted — Never Grey)
| Token | Value |
|-------|-------|
| `--rq-shadow-sm` | `0 4px 16px rgba(112,42,225,0.06)` |
| `--rq-shadow-md` | `0 8px 32px rgba(112,42,225,0.08)` |
| `--rq-shadow-lg` | `0 20px 40px rgba(112,42,225,0.10)` |
| `--rq-shadow-card` | `0 4px 24px rgba(50,44,61,0.06), 0 1px 4px rgba(50,44,61,0.04)` |
| `--rq-shadow-gold` | `0 4px 20px rgba(255,215,9,0.4)` |

### Gradients
| Token | Value |
|-------|-------|
| `--rq-gradient-primary` | `linear-gradient(135deg, #702AE1, #6411D5)` |
| `--rq-gradient-bg` | `linear-gradient(160deg, #FFFFFF 0%, #F3F0FA 100%)` |
| `--rq-gradient-gold` | `linear-gradient(135deg, #FFD709, #FFB623)` |

### Typography
| Token | Value |
|-------|-------|
| `--font-heading` | `'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif` |
| `--font-body` | Same as heading |

### Transitions
| Token | Duration | Easing |
|-------|----------|--------|
| `--rq-transition` | 0.2s | `cubic-bezier(0.34, 1.56, 0.64, 1)` (springy) |
| `--rq-transition-fast` | 0.15s | `ease` |
| `--rq-transition-slow` | 0.4s | `ease` |

### Z-Index Scale
| Token | Value |
|-------|-------|
| `--rq-z-overlay` | 900 |
| `--rq-z-modal` | 1000 |
| `--rq-z-toast` | 1100 |

---

## Design Principles

1. **Depth through tone** — Use the surface hierarchy instead of borders to create visual layers
2. **Purple-tinted shadows** — Never use plain grey shadows; always tint with purple
3. **Rounded everything** — Minimum 12px radius; buttons and pills use `--rq-radius-full`
4. **Gold for rewards** — Any XP, star, or achievement element uses gold tokens
5. **Coral for errors** — Never raw red; use the coral palette
6. **Green for success** — Correct answers, completion states

---

## Dark Mode ("Night-Bloom")

The Story Generator and some pages use a dark-mode immersive theme:
- Deep navy/purple gradients
- Glassmorphism cards (`backdrop-filter: blur()`, `rgba()` backgrounds)
- Glow effects on interactive elements
- Defined mostly in `generator.css` and `imm-steps.css`

---

## Theme Colors (Story Themes)

| Theme | Emoji | Color |
|-------|-------|-------|
| animals | 🦁 | `#4ADE80` |
| space | 🚀 | `#38BDF8` |
| adventure | 🗺️ | `#FBBF24` |
| fantasy | 🧙 | `#A78BFA` |
| sports | ⚽ | `#F87171` |
| science | 🔬 | `#2DD4BF` |
| ocean | 🐠 | `#0EA5E9` |
| dinosaurs | 🦕 | `#84CC16` |
