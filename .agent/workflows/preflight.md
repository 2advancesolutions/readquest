---
description: Pre-flight context review — run before starting any coding task
---

# Pre-Flight Context Review

Before writing ANY code, follow these steps to load project context and avoid mistakes.

## Step 1: Review Project Documentation

Read the relevant docs from `/Users/reginaldbellas/bible/readquest/docs/` based on what the task involves:

- **Always read**: `docs/gotchas-and-pitfalls.md` — 23 known issues that break silently
- **Always read**: `docs/architecture.md` — system overview, tech stack, data flows

Then read the docs relevant to the task:

| If the task involves... | Read these docs |
|------------------------|----------------|
| Database / models / migrations | `docs/database-schema.md` |
| API routes / endpoints | `docs/api-reference.md` |
| Frontend pages / components | `docs/frontend-structure.md` |
| AI agents / Gemini / LangGraph | `docs/ai-agents.md` |
| CSS / styling / design | `docs/design-system.md` |
| Auth / login / student ID | `docs/auth-and-identity.md` |
| XP / badges / streaks / rewards | `docs/gamification.md` |
| TTS / voice | `docs/tts-system.md` |
| Speech / microphone / fluency | `docs/speech-recognition.md` |
| Environment variables / config | `docs/environment-variables.md` |
| Deployment / AWS / Docker | `docs/deployment.md` |

## Step 2: Check Agent Skills & Rules

Scan for relevant skills and rules in the `.agent` directory:

// turbo
1. List available skills: `ls /Users/reginaldbellas/bible/readquest/.agent/skills/`
// turbo
2. List active rules: `ls /Users/reginaldbellas/bible/readquest/.agent/rules/`
// turbo
3. List workflows: `ls /Users/reginaldbellas/bible/readquest/.agent/workflows/`

Read any skill or rule that is relevant to the current task before proceeding.

## Step 3: Check Existing Code Patterns

Before adding new code, look at how similar things are already done:

- **New model?** → Check an existing model in `backend/app/models/` for the UUID pattern, column style, and imports
- **New router?** → Check an existing router in `backend/app/routers/` for the Depends pattern, error handling, and XP awarding
- **New agent?** → Check `backend/app/agents/content_agent.py` for the StateGraph pattern
- **New page?** → Check an existing page in `frontend/src/pages/` for the design token usage and component patterns
- **New CSS?** → Use tokens from `frontend/src/styles/design-tokens.css` — never hardcode colors

## Step 4: Confirm Understanding

Before writing code, briefly state:
1. What files will be created or modified
2. Which gotchas from `gotchas-and-pitfalls.md` are relevant
3. What pattern from existing code will be followed

Then proceed with the task.
