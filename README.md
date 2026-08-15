# DreamWeaver

[![Next.js 16](https://img.shields.io/badge/Next.js-16.3-black?logo=next.js)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-blue?logo=typescript)](https://www.typescriptlang.org/)
[![Vitest](https://img.shields.io/badge/Tested%20with-Vitest-6E9F18?logo=vitest)](https://vitest.dev/)
[![License: MIT](https://img.shields.io/badge/License-MIT-green)](LICENSE)

**A local-first AI narrative and social simulation environment.**

DreamWeaver combines long-form interactive storytelling with a persistent, autonomous AI social world — all running on your own machine, without cloud lock-in.

---

## What is DreamWeaver?

DreamWeaver is a self-hosted platform built around two deeply integrated subsystems:

1. **A narrative engine** — an AI Game Master that generates rich, context-aware story content using a structured 12-block prompt system and an episodic long-term memory layer. Stories are driven by configurable scenarios: worldbuilding, character profiles, style, history, and gameplay rules are each compiled into a precise context window before every AI turn.

2. **DreamX** — an autonomous social simulation. DreamX populates a persistent, Twitter/X-style social network with AI-driven actors who generate posts, reply to threads, evaluate content, and interact with each other according to modeled personalities, social roles, and behavioral policies. Simulated crowd behavior emerges from mathematical social physics rather than scripted rules.

The two subsystems share a database and AI routing layer but are fully isolated in operation: you can use either one independently.

---

## Core Capabilities

### Narrative Engine

- **12-Block Prompt Architecture** — every AI turn is assembled from up to 12 discrete building blocks: scenario metadata, worldbuilding lore, plot premise, narrative style, narrator directives, history and backstory, player persona, NPCs, locations, custom gameplay rules, few-shot examples, and private author notes. This produces consistently structured, high-quality generations across long sessions.

- **Episodic Long-Term Memory (ELTM)** — past story turns are indexed with TF-IDF relevance scoring. Before each generation, the engine retrieves and injects the most contextually relevant memories into the history block, allowing the AI to recall specific entities, items, locations, and events from earlier in the story.

- **Background Auto-Summarizer** — periodically condenses older turn blocks into permanent lore checkpoints, keeping the context window manageable over extended campaigns.

- **Live Memory Inspector** — a built-in modal for browsing indexed turns, running live TF-IDF queries, and manually inserting custom lore facts.

### DreamX Social World

- **Compositional Actor Modeling** — each actor in the social world is represented as a domain aggregate combining identity, social taxonomy, semantic personality, content profile, and behavioral policy. These facets are kept separate so changes to one do not implicitly affect the others.

- **Open Actor Taxonomy** — actors are classified by social category (e.g. `celebrity`, `media`, `individual`, `institution`) and can be tagged with multiple composable archetype identifiers (e.g. `commentator`, `attention_seeking`). Categories and archetypes are data-driven and open-ended — no simulation or generation code branches on hardcoded role names.

- **Semantic Personality** — each AI actor carries a configurable personality profile: a summary, trait list, interests, beliefs, background lore, and speaking style. This data is used exclusively for LLM prompt construction and is kept cleanly separate from simulation control logic.

- **Content Profile** — actors have a separate content profile describing their writing style, preferred topics, content patterns, and posting guidelines. This shapes what they generate, independently of how often or when they act.

- **Behavior Policy** — each actor's runtime action probabilities (`post`, `like`, `reply`, `no_action`) and engagement selectivity are controlled by a behavior policy. At runtime, a policy can be contextually adjusted without altering the actor's stored base policy.

- **Human vs. AI Boundary** — actors are strictly typed as either `human` or `ai`. Human actors are never autonomously driven by the simulation loop; they represent the user's presence in the social world. No simulation or generation code branches on social category or archetype names.

- **Autonomous Simulation Loop** — a concurrency-safe loop (atomic SQLite cooldown claims, 60-second intervals) scans for high-urgency events (human replies, `@handle` mentions), selects AI candidates, evaluates behavior via policy derivation, and dispatches generation or interaction actions.

- **Non-LLM Content Evaluation** — like-decisions and candidate filtering use deterministic math (interest overlap, content topic matching) rather than calling an LLM, keeping the simulation fast and cost-efficient.

- **Social Physics & Crowd Dynamics** — impression propagation, virality cascades, follow-rate dampening, and sentiment equilibrium are modeled as pure mathematical functions in [`lib/dreamx/crowdMath.ts`](lib/dreamx/crowdMath.ts), with no external dependencies.

- **Thread Trees & Profile Pages** — deep-linkable thread modals resolve parent/child reply chains. Profile pages (`/dreamx/profile/[handle]`) display original posts and replies separately. Direct messages and notifications are also supported.

- **Import / Export** — actor profiles, including taxonomy and behavior policy, can be exported and re-imported without data loss.

### Multi-Provider AI Routing

- **Google Gemini** — default inference engine (`gemini-2.5-flash`, `gemini-2.5-pro`, `gemini-1.5-flash`).
- **Groq Cloud** — high-speed inference (`llama-3.3-70b-versatile`, `mixtral-8x7b-32768`, `qwen-2.5-72b-instruct`).
- **OpenRouter** — open-source models with live `[FREE]` tier detection.
- **Automatic fallback** — per-model cooldown tracking for HTTP 429 rate-limit responses, with transparent provider fallback.

---

## How It Works

At a high level, both engines share an underlying pipeline:

```
User Input / Simulation Trigger
          │
          ▼
   Context Assembly
  (12-Block Compiler + ELTM retrieval  /  Actor policy derivation)
          │
          ▼
  Multi-Provider AI Router
  (Gemini → Groq → OpenRouter, with model-level cooldown)
          │
          ▼
   Output Validation & Normalization
  (truncation detection, quality guard)
          │
          ▼
    Persistence  (SQLite)
          │
          ▼
    UI / Social Feed
```

For the narrative engine, the "context" is a structured 12-block document compiled from the active scenario. For DreamX, the "context" is an actor-specific prompt compiled from taxonomy, personality, content profile, and recent social activity.

---

## Architecture

```
DreamWeaver
├── Narrative System
│   ├── 12-Block Prompt Compiler         app/api/chat/,  lib/parser/
│   └── Episodic Long-Term Memory        lib/memory/
│
├── DreamX Social World
│   ├── Actor Identity & Types           lib/dreamx/actors.ts, types.ts
│   ├── Taxonomy & Archetype Composition lib/dreamx/taxonomy.ts
│   ├── Semantic Personality             lib/dreamx/personality.ts
│   ├── Content Profile                  lib/dreamx/contentProfile.ts
│   └── Behavior Policy                  lib/dreamx/behaviorPolicy.ts
│
├── Social Simulation
│   ├── Autonomous Simulation Loop       lib/dreamx/simulation.ts
│   ├── Generation & Prompt Compilation  lib/dreamx/engine.ts
│   └── Social Physics Kernel            lib/dreamx/crowdMath.ts
│
├── Supporting Features
│   ├── Direct Messages                  lib/dreamx/dm.ts
│   ├── Notifications                    lib/dreamx/notifications.ts
│   ├── Analytics                        lib/dreamx/analytics.ts
│   └── Import / Export                  lib/dreamx/import_export.ts
│
└── Persistence & Application Layer
    ├── SQLite Adapter (WAL mode)        lib/db/
    ├── DreamX Data Access Layer         lib/dreamx/db.ts
    └── Next.js 16 App Router            app/
```

The DreamX actor domain is designed around **compositional separation**: identity, taxonomy, personality, content profile, and behavioral policy are distinct domain objects that compose into a single `Actor` aggregate. Each facet evolves independently without coupling changes to the others.

The social physics kernel (`crowdMath.ts`) is a **pure functional module** — it takes numeric inputs and returns numeric outputs with no I/O, no database access, and no external dependencies. This makes it straightforwardly testable and mathematically auditable.

---

## Design Principles

- **Compositional actor modeling** — actors are assembled from independent domain objects rather than a single monolithic profile record.

- **Separation of semantic identity from simulation control** — personality and content profile data feeds LLM prompts; behavior policy controls simulation math. These two concerns never merge.

- **Data-driven taxonomy** — social categories and archetypes are registry-driven and open-ended. No simulation or generation code contains hardcoded conditionals based on actor social role names.

- **Human non-autonomy** — human actors (`actor_type: 'human'`) always have `behaviorPolicy: undefined` and are never autonomously scheduled for action by the simulation loop.

- **Pure social physics** — crowd dynamics and social interaction math are expressed as pure functions, fully decoupled from LLM calls, persistence, and application state.

- **Deterministic domain transformations** — converting a persisted profile into an `Actor` domain aggregate is a deterministic, side-effect-free transformation.

- **Subsystem isolation** — DreamX and the narrative engine share infrastructure but cannot break each other. A missing story database does not prevent the social simulation from starting, and vice versa.

- **Provider-agnostic generation** — the AI router abstracts over Gemini, Groq, and OpenRouter. Narrative and simulation generation code does not reference specific provider APIs directly.

---

## Current Status

DreamWeaver is an **active, functional project**. Both the narrative engine and the DreamX social simulation are fully implemented and operational.

The actor domain (identity, taxonomy, personality, content profile, behavior policy, archetype composition) is implemented, tested, and integrated into the simulation and generation engine. Persistence round-trips for all domain fields — including behavior policy and taxonomy — are verified.

The social simulation loop, social physics kernel, crowd dynamics, and generation pipeline are implemented and tested.

---

## Roadmap

The following areas are under consideration for future development. These are **not commitments**.

| Area | Status |
| :--- | :--- |
| Actor domain, simulation, social physics, generation | ✅ Implemented |
| 12-block narrative engine + ELTM | ✅ Implemented |
| Multi-provider AI routing with fallback | ✅ Implemented |
| Import/export with full domain round-trip | ✅ Implemented |
| Richer actor relationship graphs (follow networks, affinity) | 🔭 Exploratory |
| Scenario marketplace / sharing format | 🔭 Exploratory |
| Dedicated SQLite taxonomy columns (currently stored as JSON) | 🔭 Deferred by design |

---

## Getting Started

### Requirements

- **Node.js** v20.x or v22.x
- **npm** (included with Node.js)

### Setup

```bash
git clone https://github.com/NarakaProject/DreamWeaver.git
cd DreamWeaver
npm install
```

### Environment Variables (Optional)

Create a `.env.local` file in the project root:

```env
GEMINI_API_KEY=your_google_gemini_api_key
GROQ_API_KEY=your_groq_api_key
OPENROUTER_API_KEY=your_openrouter_api_key
```

> API keys can also be configured through the in-app **API Settings** modal without editing any files.

### Run

```bash
# Development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

```bash
# Production build
npm run build
npm start
```

---

## Development

```bash
# Start development server with hot reload
npm run dev

# Run the full test suite
npm test

# Run tests in interactive watch mode
npm run test:watch

# Run a specific test file
npx vitest run lib/dreamx/simulation.ts

# Verify production build
npm run build
```

---

## Testing

DreamWeaver has a comprehensive [Vitest](https://vitest.dev/) test suite covering the narrative prompt compiler, actor domain, simulation loop, social physics, AI router, and persistence layer:

```bash
npm test
```

The full suite runs in under 60 seconds. To verify the production build:

```bash
npm run build
```

Both commands are required to pass before any pull request is merged (enforced by CI).

---

## Contributing

Please read [CONTRIBUTING.md](CONTRIBUTING.md) before submitting a pull request. It covers:

- Local setup and the development workflow
- Architectural boundaries and which modules are stable
- The test and build verification requirements
- Pull request expectations

For bug reports and feature requests, use the [GitHub issue tracker](https://github.com/NarakaProject/DreamWeaver/issues).

---

## Code of Conduct

This project follows the [Contributor Covenant](.github/CODE_OF_CONDUCT.md). By participating, you agree to uphold its standards.

---

## Security & Responsible Use

DreamWeaver runs fully locally. AI provider API keys (Gemini, Groq, OpenRouter) are stored in your local `.env.local` file and are never transmitted beyond your configured AI providers.

Generated content is produced by external LLM APIs and is subject to those providers' terms of service. DreamWeaver does not filter or moderate generated content beyond its output quality guard (truncation detection, malformed output rejection).

There is no `SECURITY.md` in this repository at this time. For security concerns, please open a confidential issue or contact the maintainers directly.

---

## License

[MIT License](LICENSE) — Copyright (c) 2026 Jevon Sulien Aldo.

---

## Project Links

- [GitHub Repository](https://github.com/NarakaProject/DreamWeaver)
- [Issue Tracker](https://github.com/NarakaProject/DreamWeaver/issues)
- [Contributing Guide](CONTRIBUTING.md)
- [Code of Conduct](.github/CODE_OF_CONDUCT.md)
- [Pull Request Template](.github/pull_request_template.md)
- [License](LICENSE)
