# Phoenix V2 — Persistent Cognitive AI

The companion codebase for the book **[Building Persistent AI: Designing an Assistant That Remembers, Learns and Belongs to You](https://leanpub.com/phoenix-buildingpersistentAI)** by Cleverson Santos.

---

## Publications

| | |
|---|---|
| 📄 **Companion paper** | [Phoenix V2: A Cognitive Architecture for Persistent, Emotionally-Aware AI Assistants on Consumer Hardware](https://doi.org/10.5281/zenodo.22645361) — Zenodo, September 2026 |
| 📖 **Book** | [Building Persistent AI: Designing an Assistant That Remembers, Learns and Belongs to You](https://leanpub.com/phoenix-buildingpersistentAI) — Complete implementation guide, 26 chapters, 7 appendices |
| 💻 **Repository** | This repository — MIT License |

The paper formally characterizes the amnesia problem, describes the full architecture with equations and a system diagram, and positions Phoenix V2 against Mem0, MemGPT/Letta, Zep, and Generative Agents. The book explains every design decision in detail, chapter by chapter, alongside this codebase.

---

## What Is This?

Phoenix V2 is a local-first AI assistant with a persistent cognitive architecture. It does not rely on the LLM to maintain memory, identity, or emotional state — those live in a local SQLite database and survive any model swap, restart, or conversation reset.

This repository contains the complete, working source code described chapter by chapter in the book. Every file you see here is explained in detail in the text.

---

## Core Concepts

| Concept | What It Means in Phoenix |
|---|---|
| Persistent Memory | Conversations are stored in SQLite and retrieved by semantic similarity across sessions |
| Multi-Agent Pipeline | Five specialized agents (Memory → Planning → Action → Reflection → Personality) process each input in sequence |
| Blackboard Architecture | Agents communicate through a shared in-memory workspace — no direct coupling between them |
| Emotion Engine | PAD model (Pleasure-Arousal-Dominance) tracks emotional state continuously based on interaction history |
| Daydream Engine | Background process that generates reflective thoughts when Phoenix is idle |
| Subconscious Cycle | Runs during rest periods to consolidate memories and update beliefs |
| RLHF Feedback | User feedback (+/−) is captured and applied to an internal reinforcement scoring system |

---

## Architecture Overview

```
User Input
    │
    ▼
[ server.ts — Express API Gateway ]
    │
    ▼
[ brain.ts — Central Orchestrator ]
    │
    ├──▶ [ MemoryAgent ]     — retrieves relevant past context
    ├──▶ [ PlanningAgent ]   — generates a raw response draft
    ├──▶ [ ActionAgent ]     — decides if a real-world tool is needed
    ├──▶ [ ReflectionAgent ] — reviews the draft for coherence and safety
    └──▶ [ PersonalityAgent ]— applies Phoenix's voice to the final output
              │
              ▼
    [ Blackboard ] ←─── shared working memory (volatile, per-request)
              │
              ▼
    [ EmotionEngine ]   — updates PAD state after every interaction
              │
              ▼
    [ SQLite Database ] — persists memories, emotional state, self-model
              │
    ┌─────────┴──────────┐
    │                    │
[ DaydreamEngine ]  [ SubconsciousEngine ]
  (idle background)   (rest-cycle processing)
```

Full architecture diagram with all connections: [docs/architecture.md](docs/architecture.md)

---

## Project Structure

```
phoenix-v2/
│
├── server.ts                      ← Express server + API routes
├── src/
│   ├── App.tsx                    ← React frontend (chat UI)
│   ├── main.tsx
│   └── server/
│       ├── config/
│       │   └── settings.ts        ← Environment variables
│       ├── core/
│       │   ├── brain.ts           ← Central orchestrator (Ch. 5)
│       │   ├── blackboard.ts      ← Shared working memory (Ch. 4)
│       │   ├── consolidation.ts   ← Memory consolidation engine (Ch. 12)
│       │   ├── backup.ts          ← Data export
│       │   ├── agents/
│       │   │   ├── base_agent.ts       ← Abstract base class (Ch. 6)
│       │   │   ├── memory_agent.ts     ← Memory retrieval (Ch. 6)
│       │   │   ├── planning_agent.ts   ← Response drafting (Ch. 7)
│       │   │   ├── action_agent.ts     ← Tool routing (Ch. 8)
│       │   │   ├── reflection_agent.ts ← Draft validation (Ch. 9)
│       │   │   └── personality_agent.ts← Voice and persona (Ch. 10)
│       │   ├── dreams/
│       │   │   └── daydream_engine.ts  ← Idle background process (Ch. 15)
│       │   └── evolution/
│       │       ├── reinforcement.ts    ← RLHF scoring (Ch. 17)
│       │       └── incremental_learn.ts← Pattern learning (Ch. 18)
│       ├── memory/
│       │   ├── memory_manager.ts   ← Retrieval with semantic + priority scoring (Ch. 11)
│       │   ├── storage.ts          ← SQLite persistence layer (Ch. 11)
│       │   └── priority.ts         ← Recency × importance scoring (Ch. 11)
│       ├── psychology/
│       │   ├── self_model.ts       ← Identity, traits, beliefs, goals (Ch. 16)
│       │   ├── emotion.ts          ← PAD emotion engine (Ch. 14)
│       │   └── subconscious.ts     ← Rest-cycle processing (Ch. 15)
│       ├── scheduler/
│       │   ├── cron_tasks.ts       ← Timed tasks (Ch. 21)
│       │   └── background_jobs.ts  ← Batch processing (Ch. 21)
│       ├── tools/
│       │   └── tool_registry.ts    ← Tool definitions for ActionAgent (Ch. 8)
│       ├── users/
│       │   └── profile_manager.ts  ← Multi-user identity management (Ch. 23)
│       └── utils/
│           ├── llm_client.ts       ← Gemini API wrapper (Ch. 19)
│           ├── embeddings.ts       ← Vector embedding client (Ch. 11)
│           └── filters.ts          ← Output formatting helpers
│
├── docs/
│   ├── architecture.md            ← Full architecture diagram
│   ├── chapter-map.md             ← Which file = which chapter
│   └── SETUP.md                   ← Detailed setup guide (all OS)
│
├── .env.example                   ← Copy this to .env and add your API key
├── .gitignore
├── package.json
├── tsconfig.json
└── vite.config.ts
```

---

## Quick Start

**Prerequisites:** Node.js 18 or higher · A free Gemini API key

```bash
# 1. Clone the repository
git clone https://github.com/cleversonbrsantos-art/Phoenix.git
cd Phoenix

# 2. Install dependencies
npm install

# 3. Set your API key
cp .env.example .env
# Open .env and replace YOUR_GEMINI_API_KEY with your actual key

# 4. Run
npm run dev

# 5. Open in browser
# http://localhost:3000
```

For detailed setup instructions by operating system (Windows, Linux, macOS), see [docs/SETUP.md](docs/SETUP.md).

---

## Getting Your Free Gemini API Key

1. Go to https://aistudio.google.com/apikey
2. Sign in with a Google account
3. Click **Create API key**
4. Copy the key into your `.env` file:

```
GEMINI_API_KEY="paste-your-key-here"
```

The free tier is sufficient to run Phoenix V2 for personal use.

---

## What Happens When You Run It

The system starts four parallel processes:

- **Express server** on port 3000 — serves the React UI and handles API calls
- **Vite dev server** — compiles and hot-reloads the frontend
- **SubconsciousEngine** — starts a background loop that runs memory consolidation every 5 minutes
- **DaydreamEngine** — watches for idle periods and generates reflective thoughts after 2 minutes of inactivity

The SQLite database is created automatically at `.data/vault/phoenix_neural_db.sqlite` on first run. All memories, emotional state, and the self-model are persisted there across restarts.

---

## Book Reference

This codebase maps directly to the book's structure:

| Book Part | Chapters | Primary Files |
|---|---|---|
| Foundations | 1–4 | `blackboard.ts`, project setup |
| Cognitive Core | 5–10 | `brain.ts`, all agents |
| Persistence | 11–13 | `memory/`, `consolidation.ts` |
| Psychology | 14–16 | `emotion.ts`, `subconscious.ts`, `self_model.ts` |
| Learning | 17–18 | `reinforcement.ts`, `incremental_learn.ts` |
| Integration | 19–21 | `server.ts`, `App.tsx`, `scheduler/` |
| Advanced | 22–25 | `users/`, deployment, observability |

For the complete file-to-chapter mapping: [docs/chapter-map.md](docs/chapter-map.md)

---

## Limitations and Scope

This is the book version of Phoenix — the version described in the text, built on modest hardware (Intel Core i3, 8 GB RAM), without a GPU or cloud infrastructure.

It is intentionally designed to run on any modern laptop. It is not production-hardened, does not include authentication, and is not intended for multi-user deployment as-is.

The architecture, however, is built to evolve. Chapters 23 and 25 discuss how to extend it.

---

## License

MIT — see [LICENSE](LICENSE) for details.

---

## Author

**Cleverson Santos** — Commercial Manager, Sinop, Brazil.  
Architect of Phoenix. No formal programming background. Built this iteratively using Claude as a cognitive collaborator.

- 📄 **Paper:** [doi.org/10.5281/zenodo.22645361](https://doi.org/10.5281/zenodo.22645361)
- 📖 **Book:** [Building Persistent AI on Leanpub](https://leanpub.com/phoenix-buildingpersistentAI)
- 💼 **LinkedIn:** [linkedin.com/in/cleverson-santos](https://www.linkedin.com/in/cleversonsantos2)

---

> *"The LLM is an external consultant, never the cognitive engine. Identity, memory, and personality live locally — and survive any model swap."*
