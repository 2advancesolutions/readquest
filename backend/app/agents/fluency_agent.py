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


async def compare_words_node(state: FluencyState) -> FluencyState:
    """
    Diff transcript against source text using SequenceMatcher.
    Produces word_errors list with error type per missed/changed word.
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
            # Words that were said differently than expected
            for idx, (expected, spoken) in enumerate(
                zip(source_words[i1:i2], transcript_words[j1:j2])
            ):
                errors.append({
                    "word": expected,
                    "spoken_word": spoken,
                    "error_type": "mispronounced",
                    "word_index": i1 + idx,
                })
            # If source has more words than transcript chunk, mark as skipped
            for idx in range(len(transcript_words[j1:j2]), i2 - i1):
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
