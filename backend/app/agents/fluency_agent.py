"""
Fluency Agent — LangGraph agent for reading fluency analysis.
Privacy-first: receives text transcript from Web Speech API (no audio stored).
Diffs transcript vs source text, computes WPM + accuracy, generates kid-friendly feedback.
"""
import re
import json
import asyncio
from typing import TypedDict, Optional
from difflib import SequenceMatcher
from langgraph.graph import StateGraph, START, END
from app.config import settings

GEMINI_TEXT_MODEL = "gemini-2.5-flash"


class FluencyState(TypedDict):
    student_id: str
    story_id: str
    page_number: int
    transcript: str          # raw text from Web Speech API
    source_text: str         # expected story page text
    duration_secs: float     # how long the child took to read
    # Computed
    clean_transcript_words: list
    clean_source_words: list
    word_errors: list         # [{word, spoken_word, error_type, word_index}]
    correct_words: int
    total_words: int
    accuracy_pct: float
    words_per_minute: Optional[float]
    feedback: str


def _normalize(text: str) -> list[str]:
    """Lowercase, strip punctuation, split into word tokens."""
    return re.findall(r"[a-z']+", text.lower())


def _edit_distance(a: str, b: str) -> int:
    """Levenshtein edit distance between two strings."""
    if len(a) < len(b):
        return _edit_distance(b, a)
    if len(b) == 0:
        return len(a)
    prev = list(range(len(b) + 1))
    for i, ca in enumerate(a):
        curr = [i + 1]
        for j, cb in enumerate(b):
            curr.append(min(
                prev[j + 1] + 1,      # deletion
                curr[j] + 1,           # insertion
                prev[j] + (ca != cb),  # substitution
            ))
        prev = curr
    return prev[-1]


# Common homophones / speech-recognition substitutions
_HOMOPHONES: set[frozenset[str]] = {
    frozenset({"would", "wood"}),
    frozenset({"their", "there", "they're"}),
    frozenset({"your", "you're"}),
    frozenset({"its", "it's"}),
    frozenset({"to", "too", "two"}),
    frozenset({"no", "know"}),
    frozenset({"new", "knew"}),
    frozenset({"right", "write"}),
    frozenset({"read", "red"}),
    frozenset({"sea", "see"}),
    frozenset({"hear", "here"}),
    frozenset({"one", "won"}),
    frozenset({"for", "four"}),
    frozenset({"be", "bee"}),
    frozenset({"by", "buy", "bye"}),
    frozenset({"sun", "son"}),
    frozenset({"some", "sum"}),
    frozenset({"I", "eye"}),
    frozenset({"night", "knight"}),
    frozenset({"flower", "flour"}),
    frozenset({"not", "knot"}),
    frozenset({"ate", "eight"}),
    frozenset({"wait", "weight"}),
    frozenset({"wear", "where"}),
    frozenset({"tail", "tale"}),
    frozenset({"knows", "nose"}),
    frozenset({"made", "maid"}),
    frozenset({"pair", "pear", "pare"}),
    frozenset({"blue", "blew"}),
    frozenset({"road", "rode"}),
    frozenset({"way", "weigh"}),
    frozenset({"whole", "hole"}),
}


def _are_homophones(a: str, b: str) -> bool:
    """Check if two words are known homophones."""
    for group in _HOMOPHONES:
        if a in group and b in group:
            return True
    return False


# Common English suffixes the Speech API tends to drop or add
_SUFFIXES = ("ed", "s", "es", "ing", "ly", "er", "est", "d", "'s", "n't", "'t")


def _strip_suffix(word: str) -> str:
    """Return the stem after stripping the longest matching common suffix."""
    for sfx in sorted(_SUFFIXES, key=len, reverse=True):
        if word.endswith(sfx) and len(word) > len(sfx) + 1:
            return word[:-len(sfx)]
    return word


def _words_match(expected: str, spoken: str) -> bool:
    """
    Strict word comparison for reading fluency accuracy.
    Only accepts words that are genuinely the same — compensates for minor
    STT artifacts but is NOT a spelling checker. Similar-sounding but different
    words (cat/bat, big/bag, form/from) will be marked as errors.
    """
    if expected == spoken:
        return True

    # Never accept very short words unless exact (too error-prone)
    if len(expected) <= 3 or len(spoken) <= 3:
        return expected == spoken

    # 1. Homophones — words that genuinely sound identical (would/wood, their/there)
    if _are_homophones(expected, spoken):
        return True

    # 2. Stem / suffix match — catches "-ed", "-ing", "-s" STT artifacts
    #    Only when both stems are identical (not just close)
    stem_e = _strip_suffix(expected)
    stem_s = _strip_suffix(spoken)
    if stem_e == stem_s and len(stem_e) >= 3:
        return True
    # One direction: spoken stem matches expected exactly (e.g. "wish"/"wished")
    if expected == stem_s and len(stem_s) >= 4:
        return True
    if spoken == stem_e and len(stem_e) >= 4:
        return True

    # 3. Prefix rule — only for longer words (≥5 chars), max 1-char difference
    #    Catches genuine truncations like "walk"/"walking" → NOT "cat"/"catch"
    min_len = min(len(expected), len(spoken))
    if min_len >= 5:
        shorter = expected if len(expected) <= len(spoken) else spoken
        longer = spoken if len(expected) <= len(spoken) else expected
        if longer.startswith(shorter) and (len(longer) - len(shorter)) <= 2:
            return True

    # 4. Edit distance — STRICT
    #    Words 5–7 chars: allow only 1 edit
    #    Words 8+ chars: allow up to 2 edits
    #    Words ≤4 chars: no fuzzy (already handled above — exact only)
    dist = _edit_distance(expected, spoken)
    max_len = max(len(expected), len(spoken))
    if 5 <= max_len <= 7 and dist <= 1:
        return True
    if max_len >= 8 and dist <= 2:
        return True

    # 5. High character similarity — only for longer words (≥6 chars), very tight threshold
    #    0.92 means only 1 character difference allowed in practice
    if min_len >= 6:
        ratio = SequenceMatcher(None, expected, spoken).ratio()
        if ratio >= 0.92:
            return True

    return False


async def compare_words_node(state: FluencyState) -> FluencyState:
    """
    Diff transcript against source text using SequenceMatcher.
    Uses fuzzy word matching to avoid false positives from speech recognition
    artifacts (dropped suffixes, homophones, minor transcription drift).
    """
    source_words = _normalize(state["source_text"])
    transcript_words = _normalize(state["transcript"])

    state["clean_source_words"] = source_words
    state["clean_transcript_words"] = transcript_words

    matcher = SequenceMatcher(None, source_words, transcript_words, autojunk=False)
    errors = []
    correct = 0

    for tag, i1, i2, j1, j2 in matcher.get_opcodes():
        if tag == "equal":
            correct += (i2 - i1)
        elif tag == "replace":
            # Check each replaced pair with fuzzy matching — speech
            # recognition often produces close-but-not-exact transcriptions
            paired = list(zip(source_words[i1:i2], transcript_words[j1:j2]))
            for idx, (expected, spoken) in enumerate(paired):
                if _words_match(expected, spoken):
                    # Close enough — count as correct
                    correct += 1
                else:
                    errors.append({
                        "word": expected,
                        "spoken_word": spoken,
                        "error_type": "mispronounced",
                        "word_index": i1 + idx,
                    })
            # If source has more words than transcript chunk, mark as skipped
            for idx in range(len(paired), i2 - i1):
                errors.append({
                    "word": source_words[i1 + idx],
                    "spoken_word": None,
                    "error_type": "skipped",
                    "word_index": i1 + idx,
                })
        elif tag == "delete":
            # Words in source but missing from transcript
            for idx, w in enumerate(source_words[i1:i2]):
                errors.append({
                    "word": w,
                    "spoken_word": None,
                    "error_type": "skipped",
                    "word_index": i1 + idx,
                })
        # "insert" = extra words said — we treat as repeated, don't penalize hard

    state["word_errors"] = errors
    state["correct_words"] = correct
    state["total_words"] = len(source_words)
    return state


async def calculate_fluency_node(state: FluencyState) -> FluencyState:
    """Compute accuracy % and words per minute."""
    total = state["total_words"]
    correct = state["correct_words"]
    duration = state["duration_secs"]

    state["accuracy_pct"] = round((correct / total * 100) if total > 0 else 0.0, 1)
    state["words_per_minute"] = (
        round(total / (duration / 60), 1) if duration > 0 else None
    )
    return state


async def generate_feedback_node(state: FluencyState) -> FluencyState:
    """Use Gemini to generate a short, encouraging, kid-friendly feedback message."""
    from google import genai as _genai
    from google.genai import types as _gtypes

    accuracy = state["accuracy_pct"]
    wpm = state["words_per_minute"]
    error_count = len(state["word_errors"])
    error_words = [e["word"] for e in state["word_errors"][:5]]  # top 5 errors

    prompt = f"""A child just finished reading a story page aloud. Here are their results:
- Reading accuracy: {accuracy}%
- Words per minute: {wpm if wpm else 'not measured'}
- Words to practice: {', '.join(error_words) if error_words else 'none — perfect!'}

Write a SHORT (2-3 sentences) encouraging feedback message FOR THE CHILD. 
Be warm, enthusiastic, and specific. If they did well (≥80%), celebrate! 
If they struggled (<60%), be extra gentle and focus on one positive thing.
Do NOT use the word "accuracy" or mention percentages — keep it kid-friendly.
Output ONLY the feedback message text, nothing else."""

    try:
        client = _genai.Client(api_key=settings.GEMINI_API_KEY)
        response = await asyncio.to_thread(
            client.models.generate_content,
            model=GEMINI_TEXT_MODEL,
            contents=prompt,
            config=_gtypes.GenerateContentConfig(temperature=0.7, response_modalities=["TEXT"]),
        )
        state["feedback"] = response.candidates[0].content.parts[0].text.strip()
    except Exception as e:
        print(f"[FluencyAgent] Feedback generation failed: {e}")
        if accuracy >= 80:
            state["feedback"] = "Amazing reading! You did a fantastic job today! 🌟"
        elif accuracy >= 60:
            state["feedback"] = "Great effort! Keep practicing and you'll get even better! 📚"
        else:
            state["feedback"] = "Nice try! Every time you read, you get stronger. Keep going! 💪"
    return state


def build_fluency_graph():
    builder = StateGraph(FluencyState)
    builder.add_node("compare_words", compare_words_node)
    builder.add_node("calculate_fluency", calculate_fluency_node)
    builder.add_node("generate_feedback", generate_feedback_node)

    builder.add_edge(START, "compare_words")
    builder.add_edge("compare_words", "calculate_fluency")
    builder.add_edge("calculate_fluency", "generate_feedback")
    builder.add_edge("generate_feedback", END)

    return builder.compile()


fluency_graph = build_fluency_graph()


async def run_fluency_agent(
    student_id: str,
    story_id: str,
    page_number: int,
    transcript: str,
    source_text: str,
    duration_secs: float,
) -> dict:
    """Entry point — analyze reading fluency from Web Speech API transcript."""
    initial: FluencyState = {
        "student_id": student_id,
        "story_id": story_id,
        "page_number": page_number,
        "transcript": transcript,
        "source_text": source_text,
        "duration_secs": duration_secs,
        "clean_transcript_words": [],
        "clean_source_words": [],
        "word_errors": [],
        "correct_words": 0,
        "total_words": 0,
        "accuracy_pct": 0.0,
        "words_per_minute": None,
        "feedback": "",
    }
    final = await fluency_graph.ainvoke(initial)
    return {
        "accuracy_pct": final["accuracy_pct"],
        "words_per_minute": final["words_per_minute"],
        "correct_words": final["correct_words"],
        "total_words": final["total_words"],
        "word_errors": final["word_errors"],
        "feedback": final["feedback"],
    }
