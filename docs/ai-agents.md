# AI Agents

> All agents use **LangGraph** `StateGraph` with async nodes. Primary AI model: **Gemini 2.5 Flash** via `google-genai` SDK. No OpenRouter dependency at runtime.

## Agent Architecture Pattern

Every agent follows this pattern:

```python
# 1. Define typed state
class AgentState(TypedDict):
    input_field: str
    computed_field: list
    result: dict

# 2. Define async node functions
async def node_a(state: AgentState) -> AgentState:
    state["computed_field"] = do_something(state["input_field"])
    return state

# 3. Build and compile the graph
def build_graph():
    builder = StateGraph(AgentState)
    builder.add_node("node_a", node_a)
    builder.add_edge(START, "node_a")
    builder.add_edge("node_a", END)
    return builder.compile()

graph = build_graph()  # module-level singleton

# 4. Entry point function
async def run_agent(**kwargs) -> dict:
    initial_state = AgentState(...)
    final = await graph.ainvoke(initial_state)
    return final["result"]
```

---

## Content Agent (`content_agent.py`)

**Purpose:** Generate complete stories with pages, illustrations, and quiz questions.

### Graph Flow
```
START → grade_setup → story_writer → parse_story → image_prompt_gen → quiz_generator → assemble_result → END
```

### Nodes

| Node | Does |
|------|------|
| `grade_setup` | Maps grade (0-8) to vocabulary guidelines from `GRADE_VOCAB` dict |
| `story_writer` | Gemini generates 5-page story as JSON. Special enforcement for K-2 |
| `parse_story` | Parses JSON with 3 fallback strategies (raw, strip fences, extract `{...}`) |
| `image_prompt_gen` | Builds per-page illustration prompts, generates with `_generate_image_nano_banana2` |
| `quiz_generator` | Gemini generates 3 quiz questions per page |
| `assemble_result` | Combines everything into final result dict |

### Key Functions

| Function | Purpose |
|----------|---------|
| `_call_gemini_text(system, user, temperature)` | Direct Gemini text generation (used across agents) |
| `_generate_image_nano_banana2(prompt)` | Image generation via `gemini-2.5-flash-image` model |
| `_upload_to_supabase(img_bytes, filename)` | Upload to Supabase Storage `story-images` bucket |
| `remove_background_from_bytes(img_bytes)` | rembg U2Net background removal (runs in thread pool) |

### Image Generation Details
- Model: `gemini-2.5-flash-image`
- Safety: Blocks action/combat words (`fight`, `battle`, `gun`, etc.) via `_BLOCK_WORDS`
- Fallbacks: 3 safe scene prompts if primary prompt triggers safety filters
- Storage: Supabase Storage first → local `static/images/` fallback
- Rate limiting: 2-second delay between sequential image generations

### Art Style Templates
8 built-in art styles with full prompt templates:
`cartoon`, `pixar`, `real`, `watercolor`, `manga`, `sketch`, `storybook`, `neon`

### Grade Vocabulary Levels
Strict vocabulary enforcement per grade:
- **K:** Max 3-5 words/sentence, sight words only, 25-35 words/page
- **Grade 1:** Max 5-7 words/sentence, 1-2 syllable words, 40-55 words/page
- **Grade 2:** Max 8-12 words, compound sentences OK, 55-75 words/page
- **Grades 3-8:** Progressively more complex, up to 120-140 words/page

---

## Fluency Agent (`fluency_agent.py`)

**Purpose:** Analyze reading fluency from Web Speech API transcript (text only — no audio stored).

### Graph Flow
```
START → compare_words → calculate_fluency → generate_feedback → END
```

### Nodes

| Node | Does |
|------|------|
| `compare_words` | SequenceMatcher diff + **fuzzy word matching** |
| `calculate_fluency` | Accuracy % and words-per-minute |
| `generate_feedback` | Gemini generates kid-friendly encouragement |

### Fuzzy Word Matching (`_words_match`)
When the sequence matcher finds a "replace" (spoken word ≠ expected), the fuzzy matcher checks if it's actually correct:

1. **Homophones** — `would`/`wood`, `their`/`there`, `to`/`too`/`two` (30+ pairs)
2. **Stem matching** — `wished`/`wish`, `hoped`/`hope` (strips `-ed`, `-s`, `-ing`, `-ly`, etc.)
3. **Prefix match** — truncated words where shorter ≥3 chars and diff ≤3 chars
4. **Edit distance** — ≤1 for short words (≤4 chars), ≤2 for longer words
5. **Similarity ratio** — ≥80% character-level similarity for words ≥4 chars

> This was added to fix false positives where the Speech API would transcribe "wished" as "wish" and flag it as a mispronunciation.

### Error Types
- `mispronounced` — word was said but didn't match (even after fuzzy check)
- `skipped` — word was in source but missing from transcript
- `repeated` — extra words in transcript (not penalized)

---

## Vocabulary Agent (`vocabulary_agent.py`)

**Purpose:** Extract Tier 2 academic vocabulary words from story text.

### Graph Flow
```
START → extract_words → generate_definitions → END
```

Extracts grade-appropriate vocabulary, generates kid-friendly definitions and example sentences.

---

## Assignment Agent (`assignment_agent.py`)

**Purpose:** Auto-generate reading assignments based on student's fluency and vocabulary data.

### Graph Flow
```
START → gather_context → design_tasks → assemble_assignment → END
```

Uses fluency summary + vocab bank + reading history to create targeted practice.

---

## SEL Agent (`sel_agent.py`)

**Purpose:** Social-Emotional Learning analysis for SEL-tagged stories.

### Graph Flow
```
START → analyze_themes → generate_reflections → END
```

Produces:
- SEL tags (e.g. `bullying`, `empathy`, `kindness`)
- Reflection prompts with Socratic hints
- Character guide for discussion

---

## Learning Agent (`learning_agent.py`)

**Purpose:** General learning support and adaptive recommendations.

---

## Shared Patterns

### Gemini API Calls
All agents use `_call_gemini_text()` from `content_agent.py`:
```python
raw = await _call_gemini_text(
    system="You are a helpful assistant.",
    user="Generate something...",
    temperature=0.7,
)
```
This uses `asyncio.to_thread()` to call the synchronous `google-genai` SDK.

### JSON Parsing
Gemini often wraps JSON in markdown fences. Standard parsing strategy:
1. Try raw text
2. Strip ` ```json ... ``` ` fences
3. Extract first `{ ... }` block with regex

### Error Handling
All agents have fallback responses so the API never returns 500:
- Content agent: returns a generic story skeleton on parse failure
- Fluency agent: returns hardcoded feedback if Gemini fails
- All agents: catch exceptions and log, never crash
