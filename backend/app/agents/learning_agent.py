"""
m3 — LangGraph Adaptive Learning Agent
Analyzes student performance and adjusts difficulty over time
"""
from typing import TypedDict
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_core.messages import HumanMessage
from langgraph.graph import StateGraph, START, END
from app.config import settings


class LearningState(TypedDict):
    student_id: str
    grade_level: int
    quiz_accuracy: float          # 0-1, avg over last 10 questions
    avg_pages_per_session: float
    theme_preferences: list[str]  # most completed themes
    weak_areas: list[str]         # topics with low accuracy
    strong_areas: list[str]
    recommended_grade_delta: int  # -1, 0, or +1
    recommendations: list[dict]
    learning_profile: dict


async def analyze_performance_node(state: LearningState) -> LearningState:
    """Analyze quiz accuracy and reading patterns."""
    accuracy = state["quiz_accuracy"]
    if accuracy >= 0.85:
        state["recommended_grade_delta"] = 1   # ready for harder content
    elif accuracy <= 0.50:
        state["recommended_grade_delta"] = -1  # needs easier content
    else:
        state["recommended_grade_delta"] = 0   # stay at current level
    return state


async def generate_recommendations_node(state: LearningState) -> LearningState:
    """Use LLM to generate personalized recommendations."""
    llm = ChatGoogleGenerativeAI(
        model="gemini-2.0-flash",
        google_api_key=settings.GEMINI_API_KEY,
        temperature=0.5,
    )

    delta_desc = {1: "slightly advanced", -1: "slightly easier", 0: "same level"}
    prompt = f"""A student in grade {state['grade_level']} has these reading stats:
- Quiz accuracy: {state['quiz_accuracy'] * 100:.1f}%
- Favorite themes: {', '.join(state['theme_preferences']) or 'unknown'}
- Weak areas: {', '.join(state['weak_areas']) or 'none identified yet'}

Recommend 3 personalized next reading activities. Be encouraging and kid-friendly.
Output JSON: [{{"title": "...", "reason": "...", "theme": "...", "difficulty": "{delta_desc[state['recommended_grade_delta']]}"}}]
"""
    try:
        response = await llm.ainvoke([HumanMessage(content=prompt)])
        import json
        raw = response.content.strip()
        if "```" in raw:
            raw = raw.split("```")[1]
            if raw.startswith("json"):
                raw = raw[4:]
        state["recommendations"] = json.loads(raw.strip())
    except Exception:
        state["recommendations"] = [
            {"title": "Keep Reading!", "reason": "Every book makes you smarter!", "theme": "animals", "difficulty": "same level"}
        ]
    return state


async def build_profile_node(state: LearningState) -> LearningState:
    """Build a learning profile for persistence."""
    state["learning_profile"] = {
        "student_id": state["student_id"],
        "effective_grade": state["grade_level"] + state["recommended_grade_delta"],
        "quiz_accuracy": state["quiz_accuracy"],
        "theme_preferences": state["theme_preferences"],
        "weak_areas": state["weak_areas"],
        "strong_areas": state["strong_areas"],
        "recommendations": state["recommendations"],
    }
    return state


def build_learning_graph():
    builder = StateGraph(LearningState)
    builder.add_node("analyze", analyze_performance_node)
    builder.add_node("recommend", generate_recommendations_node)
    builder.add_node("profile", build_profile_node)

    builder.add_edge(START, "analyze")
    builder.add_edge("analyze", "recommend")
    builder.add_edge("recommend", "profile")
    builder.add_edge("profile", END)

    return builder.compile()


learning_graph = build_learning_graph()


async def run_learning_agent(
    student_id: str,
    grade_level: int,
    quiz_accuracy: float,
    theme_preferences: list[str] = None,
    weak_areas: list[str] = None,
    strong_areas: list[str] = None,
) -> dict:
    """Entry point — analyze and adapt for a student."""
    initial_state: LearningState = {
        "student_id": student_id,
        "grade_level": grade_level,
        "quiz_accuracy": quiz_accuracy,
        "avg_pages_per_session": 5.0,
        "theme_preferences": theme_preferences or [],
        "weak_areas": weak_areas or [],
        "strong_areas": strong_areas or [],
        "recommended_grade_delta": 0,
        "recommendations": [],
        "learning_profile": {},
    }
    final_state = await learning_graph.ainvoke(initial_state)
    return final_state["learning_profile"]
