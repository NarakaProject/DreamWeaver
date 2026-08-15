# Contributing to DreamWeaver & DreamX

Thank you for your interest in contributing to **DreamWeaver**!

DreamWeaver is a local-first interactive storytelling engine and autonomous AI social simulation platform. To maintain architectural integrity, modularity, and high test reliability across both the Narrative Engine and the DreamX simulation subsystems, we follow a disciplined engineering workflow.

---

## 🏛️ The DreamX Architectural Contract (D1–D7)

DreamX is engineered as a clean, decoupled domain-layer architecture. All contributions modifying or extending DreamX must adhere to the following layer boundaries:

```
Actor
├── identity       (D1: id, handle, display_name, actor_type, verification_type)
├── taxonomy       (D2/D6: category, archetypes, tags)
├── personality    (D3: summary, traits, interests, beliefs, background)
├── contentProfile (D5: style, topics, patterns, guidelines, bias)
└── behaviorPolicy (D4: actionProbabilities, engagementSelectivity)
```

### Core Architectural Invariants

1. **No Account-Type Hardcoding**:
   - Do **NOT** hardcode conditionals based on social categories (e.g. `if (category === 'celebrity')` or `if (profile.is_influencer)`).
   - Social roles and traits must be represented purely through domain metadata (Taxonomy, Personality, Content Profile, and Behavior Policy).

2. **Strict Actor Type Boundary**:
   - `actor_type` is strictly `'human' | 'ai'`.
   - Social categories (`celebrity`, `media`, `novelty`, `institution`, `individual`, etc.) belong exclusively in `ActorTaxonomy`, never in `actor_type`.
   - Human actors (`actor_type: 'human'`) are **non-autonomous** (`behaviorPolicy: undefined`) and must never be executed by autonomous simulation loops.

3. **Domain Layer Separation**:
   - **D1 Actor Domain Model** (`lib/dreamx/actors.ts`): Pure, compositional aggregate; not a God Object.
   - **D2 Open Taxonomy** (`lib/dreamx/taxonomy.ts`): Open-ended, data-driven categories and archetypes with deterministic fallback definitions.
   - **D3 Personality Layer** (`lib/dreamx/personality.ts`): Pure semantic identity data for LLM consumption. Never use Personality as direct simulation probability math.
   - **D4 Behavior Policy** (`lib/dreamx/behaviorPolicy.ts`): Pure action probabilities (`like`, `reply`, `post`, `no_action`) and engagement selectivity. `deriveEffectiveBehavior()` is the single source of truth for runtime policy derivation.
   - **D5 Content Profile** (`lib/dreamx/contentProfile.ts`): Pure content style and guidelines, decoupled from actor categories.
   - **D6 Archetype Composition** (`lib/dreamx/taxonomy.ts`): Pure, deterministic, deduplicated, and order-preserving composition of multiple archetypes.
   - **D7 Simulation & Engine Integration** (`lib/dreamx/simulation.ts`, `lib/dreamx/engine.ts`): Simulation maps persistence models to `Actor` aggregates, resolves effective behavior canonically, and formats generation prompts using domain renderers (`renderTaxonomyDescription`, `renderPersonalityDescription`, `renderContentProfileDescription`).

4. **Frozen Architectural Layers**:
   The following modules represent validated mathematical/domain kernels:
   - `lib/dreamx/crowdMath.ts` (Social physics and crowd dynamics)
   - `lib/dreamx/behaviorPolicy.ts` (D4 policy validation and derivation)
   - `lib/dreamx/personality.ts` (D3 personality normalization and rendering)
   - `lib/dreamx/contentProfile.ts` (D5 content profile normalization and rendering)
   - `lib/dreamx/taxonomy.ts` (D2/D6 taxonomy composition and registry)
   
   *Modifications to frozen layers require explicit architectural justification and comprehensive regression tests.*

---

## 🛠️ Development Setup & Workflow

### 1. Prerequisites
- **Node.js**: `v20.x` or `v22.x` (LTS recommended)
- **npm**: `v10.x+`

### 2. Local Setup
```bash
# Clone repository
git clone https://github.com/NarakaProject/DreamWeaver.git
cd DreamWeaver

# Install dependencies
npm install

# (Optional) Set up local environment variables for AI inference
cp .env.example .env.local  # or create .env.local with GEMINI_API_KEY, GROQ_API_KEY, OPENROUTER_API_KEY

# Run development server with Next.js Turbopack
npm run dev
```

### 3. Verification & Testing Commands
Every change must be verified using the project's test suite and production build:

```bash
# Run focused tests during development
npx vitest run lib/dreamx/actors.test.ts

# Run the complete unit test suite
npm test

# Run tests in interactive watch mode
npm run test:watch

# Run Next.js production build and TypeScript type-check
npm run build
```

---

## 🔄 Recommended Engineering Workflow

We practice an adversarial, test-driven verification workflow:

1. **Read-Only Audit & Investigation**: Inspect existing code, data flows, and invariants before editing.
2. **Surgical Implementation**: Keep code changes tightly scoped to the target feature or fix. Avoid incidental refactoring.
3. **Regression Testing**: Write focused regression tests that demonstrate both the issue and the fix.
4. **Full Test Suite & Build**: Run `npm test` (all test files must pass) and `npm run build` (zero type errors).
5. **Git Diff Review**: Inspect `git diff --stat` and `git diff` to confirm zero unintended file modifications or formatting churn.
6. **Atomic Commit**: Use conventional commit messages (e.g. `feat(dreamx): ...`, `fix(dreamx): ...`, `docs(repo): ...`).
7. **CI Verification**: Ensure GitHub Actions CI passes (`completed / success`).

---

## 📋 Pull Request Guidelines

Before submitting a Pull Request:

1. Ensure your branch is rebased on the latest `main` branch.
2. Verify all tests pass (`npm test`) and production build succeeds (`npm run build`).
3. Fill out the [Pull Request Template](.github/pull_request_template.md) completely, detailing:
   - Summary & Scope
   - Architectural Impact (which D1–D7 layer is touched)
   - Testing & Verification results
   - Regression Risk assessment
   - Frozen layer modifications (if any, with justification)
4. Avoid bundling unrelated fixes or reformatting unrelated files into a single PR.

---

## 📜 Code of Conduct

All contributors and maintainers are expected to adhere to our [Code of Conduct](.github/CODE_OF_CONDUCT.md). Please report any unacceptable behavior to repository maintainers.
