# Phoenix V2 — Chapter Map

This file maps every source file in the repository to the chapter(s) of  
*Building Persistent Artificial Intelligence* where it is explained.

Use this as a navigation guide while reading the book.

---

## Part 1 — Foundations (Chapters 1–4)

| Chapter | Topic | Primary Files |
|---|---|---|
| Ch. 1 | The Amnesia Problem in LLMs | Conceptual — no source file |
| Ch. 2 | Phoenix V2 Architecture Overview | [`docs/architecture.md`](architecture.md) |
| Ch. 3 | TypeScript Setup and Project Structure | `package.json`, `tsconfig.json`, `vite.config.ts`, `.env.example` |
| Ch. 4 | The Blackboard Pattern | `src/server/core/blackboard.ts` |

---

## Part 2 — Cognitive Core (Chapters 5–10)

| Chapter | Topic | Primary Files |
|---|---|---|
| Ch. 5 | Brain Orchestrator | `src/server/core/brain.ts` |
| Ch. 6 | Memory Agent | `src/server/core/agents/base_agent.ts`, `src/server/core/agents/memory_agent.ts` |
| Ch. 7 | Planning Agent | `src/server/core/agents/planning_agent.ts` |
| Ch. 8 | Action Agent — Tools and Real World | `src/server/core/agents/action_agent.ts`, `src/server/tools/tool_registry.ts` |
| Ch. 9 | Reflection Agent — Validation and Safety | `src/server/core/agents/reflection_agent.ts` |
| Ch. 10 | Personality Agent — The Voice of Phoenix | `src/server/core/agents/personality_agent.ts` |

---

## Part 3 — Persistence (Chapters 11–13)

| Chapter | Topic | Primary Files |
|---|---|---|
| Ch. 11 | Memory System Architecture | `src/server/memory/memory_manager.ts`, `src/server/memory/storage.ts`, `src/server/memory/priority.ts`, `src/server/utils/embeddings.ts` |
| Ch. 12 | Consolidation Engine — Neural Night | `src/server/core/consolidation.ts` |
| Ch. 13 | Backup and Export Systems | `src/server/core/backup.ts`, `src/server/core/zip_export.ts` |

---

## Part 4 — Psychology (Chapters 14–16)

| Chapter | Topic | Primary Files |
|---|---|---|
| Ch. 14 | Emotion Engine — PAD State Model | `src/server/psychology/emotion.ts` |
| Ch. 15 | Subconscious Engine — Dreams and Reflections | `src/server/psychology/subconscious.ts`, `src/server/core/dreams/daydream_engine.ts` |
| Ch. 16 | Self-Model — Identity, Traits, and Beliefs | `src/server/psychology/self_model.ts` |

---

## Part 5 — Learning (Chapters 17–18)

| Chapter | Topic | Primary Files |
|---|---|---|
| Ch. 17 | Reinforcement Learning — Implicit Feedback | `src/server/core/evolution/reinforcement.ts` |
| Ch. 18 | Incremental Learning — Emergent Patterns | `src/server/core/evolution/incremental_learn.ts` |

---

## Part 6 — Integration (Chapters 19–21)

| Chapter | Topic | Primary Files |
|---|---|---|
| Ch. 19 | API Gateway — Express.js Server | `server.ts`, `src/server/config/settings.ts`, `src/server/utils/llm_client.ts`, `src/server/utils/filters.ts` |
| Ch. 20 | Frontend — React Interactive Terminal | `src/App.tsx`, `src/main.tsx`, `src/index.css` |
| Ch. 21 | Scheduler and Background Jobs | `src/server/scheduler/cron_tasks.ts`, `src/server/scheduler/background_jobs.ts` |

---

## Part 7 — Advanced (Chapters 22–25)

| Chapter | Topic | Primary Files |
|---|---|---|
| Ch. 22 | Debugging and Observability | Terminal logs across all files — especially `brain.ts`, `subconscious.ts`, `emotion.ts` |
| Ch. 23 | Multi-User Systems | `src/server/users/profile_manager.ts` |
| Ch. 24 | Production Deployment | `package.json` (`build` and `start` scripts) |
| Ch. 25 | Beyond Phoenix — Extensibility | Architecture discussion — no single file |

---

## Appendices

| Appendix | Topic | Reference |
|---|---|---|
| Appendix A | TypeScript Best Practices | `tsconfig.json`, all `.ts` files |
| Appendix B | Complete Reference Architecture | [`docs/architecture.md`](architecture.md) |
| Appendix C | Concepts Glossary | — |
| Appendix D | Troubleshooting Guide | [`docs/SETUP.md`](SETUP.md) |
| Appendix E | Complete Code Repository | This repository |

---

## File Quick Reference

If you know the filename and want to find the chapter:

| File | Chapter(s) |
|---|---|
| `server.ts` | Ch. 19 |
| `src/App.tsx` | Ch. 20 |
| `src/server/core/brain.ts` | Ch. 5 |
| `src/server/core/blackboard.ts` | Ch. 4 |
| `src/server/core/consolidation.ts` | Ch. 12 |
| `src/server/core/backup.ts` | Ch. 13 |
| `src/server/core/zip_export.ts` | Ch. 13 |
| `src/server/core/agents/base_agent.ts` | Ch. 6 |
| `src/server/core/agents/memory_agent.ts` | Ch. 6 |
| `src/server/core/agents/planning_agent.ts` | Ch. 7 |
| `src/server/core/agents/action_agent.ts` | Ch. 8 |
| `src/server/core/agents/reflection_agent.ts` | Ch. 9 |
| `src/server/core/agents/personality_agent.ts` | Ch. 10 |
| `src/server/core/dreams/daydream_engine.ts` | Ch. 15 |
| `src/server/core/evolution/reinforcement.ts` | Ch. 17 |
| `src/server/core/evolution/incremental_learn.ts` | Ch. 18 |
| `src/server/memory/memory_manager.ts` | Ch. 11 |
| `src/server/memory/storage.ts` | Ch. 11 |
| `src/server/memory/priority.ts` | Ch. 11 |
| `src/server/psychology/emotion.ts` | Ch. 14 |
| `src/server/psychology/subconscious.ts` | Ch. 15 |
| `src/server/psychology/self_model.ts` | Ch. 16 |
| `src/server/scheduler/cron_tasks.ts` | Ch. 21 |
| `src/server/scheduler/background_jobs.ts` | Ch. 21 |
| `src/server/tools/tool_registry.ts` | Ch. 8 |
| `src/server/users/profile_manager.ts` | Ch. 23 |
| `src/server/utils/llm_client.ts` | Ch. 19 |
| `src/server/utils/embeddings.ts` | Ch. 11 |
| `src/server/utils/filters.ts` | Ch. 19 |
| `src/server/config/settings.ts` | Ch. 3 |
