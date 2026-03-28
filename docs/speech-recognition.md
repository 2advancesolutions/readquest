# Speech Recognition

## Overview

ReadQuest uses the **Web Speech API** (`SpeechRecognition` / `webkitSpeechRecognition`) for real-time speech-to-text during reading sessions. The transcript is sent to the backend fluency agent for analysis — **no audio files are recorded or stored**.

## Browser Support

| Browser | Platform | Works | Notes |
|---------|----------|:-----:|-------|
| Chrome | Desktop | ✅ | Best support, `continuous=true` works |
| Chrome | Android | ✅ | `continuous=true` works |
| Safari | iOS | ⚠️ | `continuous=true` breaks — see iOS workaround |
| Safari | macOS | ⚠️ | Similar to iOS |
| Firefox | All | ❌ | No SpeechRecognition support |
| Edge | All | ✅ | Uses Chromium engine |

## Implementation (`useSpeechRecognition.ts`)

### Key Design Decisions

1. **`startListening()` is synchronous** — MUST be called directly from a user gesture (button click). No `await` before it. This is critical for iOS Safari's permission chain.

2. **No `getUserMedia()` call** — The browser's built-in mic permission dialog is triggered by `recognition.start()` itself. Calling `getUserMedia()` first was causing race conditions on iOS.

3. **iOS auto-restart** — iOS fires `onend` after every pause in speech. The hook detects iOS and auto-restarts in `onend`:

```typescript
rec.onend = () => {
  if (shouldKeepRef.current && isIOS) {
    // iOS stopped — restart silently
    const next = new SRClass()
    next.continuous = false  // MUST be false on iOS
    next.interimResults = true
    attachAndStart(next)
  } else {
    setIsListening(false)
  }
}
```

4. **Transcript accumulation** — `transcriptRef.current` accumulates across iOS restarts so the final transcript is complete.

### Configuration

```typescript
const rec = new SRClass()
rec.continuous     = !isIOS    // true on Chrome, false on iOS
rec.interimResults = true      // show real-time partial results
rec.lang           = 'en-US'
rec.maxAlternatives = 1
```

### Error Handling

| Error | Behavior |
|-------|----------|
| `not-allowed` | Shows permanent error: "Microphone blocked" with instructions |
| `service-not-allowed` | Same as above |
| `network` | Shows: "Network error" |
| `no-speech` | Ignored (common, non-fatal) |
| `aborted` | Ignored (happens on stop/restart) |

### iOS Detection

```typescript
const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream
```

## Fluency Analysis Flow

```
Child reads aloud
      │
      ▼
Web Speech API → accumulates transcript (final + interim chunks)
      │
      ▼
User clicks "Stop" or finishes page
      │
      ▼
POST /api/fluency/analyze
  body: { transcript, source_text, duration_secs, story_id, page_number }
      │
      ▼
Backend fluency agent:
  1. compare_words_node: SequenceMatcher + fuzzy matching
  2. calculate_fluency_node: accuracy %, WPM
  3. generate_feedback_node: Gemini kid-friendly feedback
      │
      ▼
Response: { accuracy_pct, words_per_minute, word_errors[], feedback }
      │
      ▼
Frontend highlights error words in story text
```

## Fuzzy Matching (Backend — `fluency_agent.py`)

The `_words_match(a, b)` function prevents false positives from speech recognition artifacts:

### Match Hierarchy
```
1. Exact match (case-insensitive)        → ✅
2. Homophone match (would/wood)           → ✅
3. Stem match (wished/wish)               → ✅
4. Prefix match (≥3 chars, diff ≤3)       → ✅
5. Edit distance ≤1 (short) or ≤2 (long)  → ✅
6. Similarity ratio ≥80%                  → ✅
7. None of the above                      → ❌ (flagged as error)
```

### Homophone Dictionary (30+ pairs)
```python
_HOMOPHONES = {
    "would": "wood", "wood": "would",
    "their": "there", "there": "their", "they're": "their",
    "to": "too", "too": "to", "two": "to",
    "your": "you're", "you're": "your",
    "its": "it's", "it's": "its",
    "know": "no", "no": "know",
    "right": "write", "write": "right",
    "here": "hear", "hear": "here",
    "flower": "flour", "flour": "flower",
    "night": "knight", "knight": "night",
    "sun": "son", "son": "sun",
    "see": "sea", "sea": "see",
    "be": "bee", "bee": "be",
    "for": "four", "four": "for",
    "one": "won", "won": "one",
    "where": "wear", "wear": "where",
    "bare": "bear", "bear": "bare",
    "ate": "eight", "eight": "ate",
}
```

### Suffix Stripping
Strips these endings before comparing stems:
`-ed`, `-s`, `-ing`, `-ly`, `-er`, `-est`, `-ness`, `-ment`, `-tion`, `-sion`, `-ful`, `-less`, `-ous`, `-ive`, `-able`, `-ible`

## Known Issues

1. **iOS Safari stops after ~10 seconds of silence** — the auto-restart handles this, but there's a brief gap where interim text disappears
2. **Android Chrome** — sometimes reports `no-speech` errors even when speaking; these are silently ignored
3. **Background tabs** — most browsers stop speech recognition when the tab is backgrounded
4. **Noisy environments** — Web Speech API accuracy drops significantly in noisy environments; consider documenting this for parents
5. **Non-English accents** — `lang='en-US'` may not recognize children with strong accents well; consider offering `en-GB`, `en-AU` options
