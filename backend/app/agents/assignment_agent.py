"""
Assignment Agent — LangGraph agent for auto-generating personalized assignments.
Analyzes student's recent fluency sessions and quiz results to identify weak areas,
then generates targeted practice tasks calibrated to their level.
"""
import json
import asyncio
from typing import TypedDict, Optional, List
from langgraph.graph import StateGraph, START, END
from app.config import settings

GEMINI_TEXT_MODEL = "gemini-2.5-flash"


class AssignmentState(TypedDict):
    student_id: str
    grade_level: int
    # Performance data passed in from the router
    recent_word_errors: list      # [{word, error_type}] — top repeated errors
    avg_accuracy_pct: float       # recent sessions average
    avg_quiz_score: float
    weak_themes: List[str]        # themes student scored lowest in comprehension
    recommended_grade_delta: int  # from learning_agent: -1/0/+1
    # Computed
    assignment_type: str          # 'vocabulary' | 'fluency' | 'comprehension' | 'mixed'
    tasks: list                   # [{type, prompt, options?, correct_answer?, hint?}]
    title: str
    description: str
    difficulty_level: int


async def analyze_weak_areas_node(state: AssignmentState) -> AssignmentState:
    """Determine the best assignment type based on performance data."""
    accuracy = state["avg_accuracy_pct"]
    quiz = state["avg_quiz_score"]
    errors = state["recent_word_errors"]

    # Decide what to focus on
    if len(errors) >= 3 and accuracy < 70:
        assignment_type = "vocabulary"  # Lots of word errors → vocab practice
    elif quiz < 65:
        assignment_type = "comprehension"  # Low quiz scores → reading comprehension
    elif accuracy < 70:
        assignment_type = "fluency"  # Accuracy low but fewer word errors → fluency practice
    else:
        assignment_type = "mixed"  # Doing OK → balanced challenge

    # Calibrate difficulty
    base = state["grade_level"]
    delta = state["recommended_grade_delta"]
    effective_level = max(1, min(8, base + delta))

    state["assignment_type"] = assignment_type
    state["difficulty_level"] = effective_level
    return state


async def generate_tasks_node(state: AssignmentState) -> AssignmentState:
    """Use Gemini to generate 3-5 targeted practice tasks."""
    from google import genai as _genai
    from google.genai import types as _gtypes

    atype = state["assignment_type"]
    grade = state["difficulty_level"]
    errors = state["recent_word_errors"]
    error_words = list({e["word"] for e in errors[:8]})  # unique, capped at 8
    themes = state["weak_themes"] or ["reading"]

    # Build context-specific instructions
    if atype == "vocabulary":
        task_instructions = f"""Create 4 vocabulary tasks using these specific words the student struggles with: {', '.join(error_words) or 'common sight words'}.
Task types to use (mix of these):
- fill_in_blank: A sentence with one missing word to fill in
- word_match: Match word to its definition
- sentence_build: Choose the word that best completes the sentence"""
    elif atype == "comprehension":
        task_instructions = f"""Create 4 reading comprehension tasks for Grade {grade} level.
Focus on these themes where the student struggled: {', '.join(themes)}.
Task types to use:
- short_answer: An open-ended thinking question
- multiple_choice: A comprehension question with 4 choices
- sequence: Put 3-4 story events in the correct order"""
    elif atype == "fluency":
        task_instructions = f"""Create 4 fluency practice tasks for Grade {grade} level.
Focus on these tricky words: {', '.join(error_words) or 'common sight words'}.
Task types to use:
- tongue_twister: A fun alliterative sentence to read aloud
- repeat_after: A short passage to practice reading smoothly
- word_family: Fill in related words (e.g., run, runs, running, ran)"""
    else:
        task_instructions = f"""Create 5 mixed practice tasks for a Grade {grade} student.
Include 2 vocabulary, 2 comprehension, and 1 fluency task.
Vocabulary words to focus on: {', '.join(error_words[:4]) or 'grade-level sight words'}"""

    prompt = f"""You are a Grade {grade} reading teacher creating a personalized assignment for a student.

{task_instructions}

For EACH task, output this exact JSON structure:
{{
  "type": "fill_in_blank" | "word_match" | "sentence_build" | "short_answer" | "multiple_choice" | "sequence" | "word_family" | "tongue_twister",
  "prompt": "The task instruction/question shown to the student",
  "options": ["A", "B", "C", "D"],  (include ONLY for multiple_choice, word_match, sentence_build)
  "correct_answer": "The correct answer text",  (omit for short_answer, sequence)
  "hint": "A gentle Socratic hint if they get stuck (1 sentence)"
}}

Output ONLY a valid JSON array of task objects. Make all content age-appropriate and encouraging."""

    try:
        client = _genai.Client(api_key=settings.GEMINI_API_KEY)
        response = await asyncio.to_thread(
            client.models.generate_content,
            model=GEMINI_TEXT_MODEL,
            contents=prompt,
            config=_gtypes.GenerateContentConfig(temperature=0.6, response_modalities=["TEXT"]),
        )
        raw = response.candidates[0].content.parts[0].text.strip()
        import re
        fence = re.search(r'```(?:json)?\s*([\s\S]+?)\s*```', raw)
        if fence:
            raw = fence.group(1)
        state["tasks"] = json.loads(raw.strip())
    except Exception as e:
        print(f"[AssignmentAgent] Task generation failed: {e}")
        state["tasks"] = [
            {
                "type": "short_answer",
                "prompt": "Tell me about your favorite part of the story you just read.",
                "correct_answer": None,
                "hint": "Think about a moment that surprised you or made you feel something.",
            }
        ]
    return state


async def build_assignment_node(state: AssignmentState) -> AssignmentState:
    """Assemble final title and description for the assignment."""
    atype = state["assignment_type"]
    grade = state["difficulty_level"]

    titles = {
        "vocabulary": f"Word Power Practice — Grade {grade}",
        "comprehension": f"Reading Detectives Challenge",
        "fluency": f"Smooth Reader Practice",
        "mixed": f"Reading Quest Challenge — Grade {grade}",
    }
    descriptions = {
        "vocabulary": "Practice the words you've been working on. You've got this! 📚",
        "comprehension": "Show how well you understand what you've been reading! 🔍",
        "fluency": "Practice reading smoothly — just like your favorite storybook reader! 🎤",
        "mixed": "A fun mix of reading skills to help you level up! ⭐",
    }
    state["title"] = titles.get(atype, "Reading Practice")
    state["description"] = descriptions.get(atype, "Keep up the great reading!")
    return state


def build_assignment_graph():
    builder = StateGraph(AssignmentState)
    builder.add_node("analyze", analyze_weak_areas_node)
    builder.add_node("generate_tasks", generate_tasks_node)
    builder.add_node("build_assignment", build_assignment_node)

    builder.add_edge(START, "analyze")
    builder.add_edge("analyze", "generate_tasks")
    builder.add_edge("generate_tasks", "build_assignment")
    builder.add_edge("build_assignment", END)

    return builder.compile()


assignment_graph = build_assignment_graph()


async def run_assignment_agent(
    student_id: str,
    grade_level: int,
    recent_word_errors: list,
    avg_accuracy_pct: float,
    avg_quiz_score: float,
    weak_themes: Optional[List[str]] = None,
    recommended_grade_delta: int = 0,
) -> dict:
    """Entry point — generate a personalized assignment for a student."""
    initial: AssignmentState = {
        "student_id": student_id,
        "grade_level": grade_level,
        "recent_word_errors": recent_word_errors,
        "avg_accuracy_pct": avg_accuracy_pct,
        "avg_quiz_score": avg_quiz_score,
        "weak_themes": weak_themes or [],
        "recommended_grade_delta": recommended_grade_delta,
        "assignment_type": "mixed",
        "tasks": [],
        "title": "",
        "description": "",
        "difficulty_level": grade_level,
    }
    final = await assignment_graph.ainvoke(initial)
    return {
        "title": final["title"],
        "description": final["description"],
        "assignment_type": final["assignment_type"],
        "difficulty_level": final["difficulty_level"],
        "content": final["tasks"],
    }
