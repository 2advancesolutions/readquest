# Story Generator Redesign — Implementation Plan
**Date:** 2026-04-05 | **Status:** Approved ✅

---

## Goal
3 taps → start reading in under 30 seconds. Consistent characters. Fun for kids.

---

## Design Summary

### 3-Step Wizard (was 5)
- **Step 1 HERO** → **Step 2 WORLD + SETTINGS** → **Step 3 GO!**
- Language, art style, visibility collapse into a ⚙️ Settings drawer on Step 2 (hidden by default)

### Hybrid Character Gallery
1. Pre-made ~30 transparent PNGs bundled in-app (instant, zero API)
2. "Your Heroes" shelf — saved AI-generated characters (AsyncStorage + DB cache)
3. "Create Your Own" input → Recraft → fal rembg → saved forever

### Progressive Delivery
- Phase 1 (~25s): text + cover → navigate to reader immediately
- Phase 2 (background): 6 page images generate in parallel → shimmer → fade in as ready
- Polling: app hits `/stories/{id}/status` every 3s until `all_ready: true`

---

## PHASE 1 — Backend: Async Generation

### Task 1.1 — DB: `character_portraits` table
```sql
CREATE TABLE character_portraits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT UNIQUE NOT NULL,
  portrait_url TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);
```
- Check before calling Recraft → cache hit = instant return

### Task 1.2 — Async `/stories/generate`
- **Sync (Phase 1):** story text → cover image → save Story+Pages (`media_url=null`) → return `{id, title, cover_media_url}`
- **Background (Phase 2):** FastAPI `BackgroundTasks` → `asyncio.gather` all 6 page images → update each row as it completes

### Task 1.3 — New `GET /stories/{id}/status`
```json
{ "cover_ready": true, "pages": [true,false,false,true,false,false], "all_ready": false }
```

### Task 1.4 — Portrait cache in `analyze-character`
```python
# Check character_portraits table first
if cached: return instantly
# else: generate → insert → return
```

---

## PHASE 2 — Frontend: 3-Step Wizard

### Task 2.1 — Step types
`Step = 'hero' | 'world' | 'preview'` (remove language/artStyle steps)

### Task 2.2 — Step 1: Hero Screen
```
[Pre-made gallery grid — filtered by category tabs: Heroes / Fantasy / Animals / Villains]
[Your Heroes — horizontal scroll of saved custom portraits]
[Text input]  [Art style ▼]  [✨ Create]
```
Pre-made characters (~30):
- Heroes: Spider-Man, Iron Man, Batman, Wonder Woman, Cap America, Black Panther, Thor
- Fantasy: Elsa, Harry Potter, Moana, Simba, Cinderella, Rapunzel, Merida
- Animals: Pikachu, Sonic, Stitch, Bluey, Nemo, Dumbo, Bambi
- Villains: Thanos, Joker, Maleficent, Ursula, Scar, Voldemort, Darth Vader

### Task 2.3 — Step 2: World + Settings
```
[Character portrait — 180x180 transparent, no background]
[Character name badge]
[World theme grid — big emoji cards]
⚙️ Settings ▼ (collapsed)
  • Art Style selector
  • Language picker
  • Public toggle
[✨ Make My Story!]
```

### Task 2.4 — Tap "Make My Story!" → immediate nav
- Call generate → Phase 1 returns story_id + cover
- Navigate to `/(app)/story/{id}` immediately (don't wait for page images)

### Task 2.5 — Story Reader: shimmer + polling
- Pages with `media_url = null` → show `ShimmerPlaceholder`
- Poll `/stories/{id}/status` every 3s
- Image arrives → fade shimmer to real image with smooth transition
- Stop polling when `all_ready: true`

---

## PHASE 3 — Assets: 30 Pre-made Characters

### Task 3.1 — Generate transparent PNGs
- Use Recraft V3 + fal rembg for each of the ~30 characters
- Save to `mobile/assets/characters/` (512×512 transparent PNG)
- Bundle with app (no network request)

### Task 3.2 — `ALL_CHARACTERS` constant
```typescript
export const ALL_CHARACTERS = [
  { id: 'spider-man', name: 'Spider-Man', category: 'heroes', 
    img: require('../assets/characters/spider-man.png') },
  // ...
]
```

---

## PHASE 4 — Polish

### Task 4.1 — 3-dot StepBar
Replace 5-step bar with 3 dots: Hero · World · Story

### Task 4.2 — Settings drawer animation
Animated expand/collapse, collapsed by default

### Task 4.3 — Character selection micro-animations
Scale pop (0.95→1.05→1.0), purple glow ring, check badge, haptic on tap

---

## File Change Map

| File | Change |
|------|--------|
| `mobile/app/(app)/generate.tsx` | Full refactor — 3 steps, gallery, settings drawer |
| `mobile/app/(app)/story/[id].tsx` | Shimmer placeholders + polling |
| `mobile/src/lib/api.ts` | Add `status` endpoint call |
| `mobile/assets/characters/` | 30 transparent PNGs |
| `mobile/src/data/characterAssets.ts` | ALL_CHARACTERS constant |
| `backend/app/routers/stories.py` | Async generate, status endpoint, portrait cache |
| `backend/app/models/character_portrait.py` | New model |
| `backend/app/agents/content_agent.py` | Phase 1/2 split |
| DB migration | `character_portraits` table |

---

## Success Criteria
- [ ] Pre-made hero selected → reading in under 30s
- [ ] Custom hero generated, cached, reused consistently
- [ ] Page images load progressively without blocking reading
- [ ] Character in story pages matches selected portrait
- [ ] No blank screens or loading screens over 3s
