# ✨ DreamWeaver Story Engine

> **100% Privacy-First, Local AI Web Novel & Interactive Roleplay Engine**

DreamWeaver is an open-source, local-first interactive storytelling engine inspired by DreamGen and classic text adventures. Built with **Next.js 16**, **TypeScript**, **Tailwind CSS**, and **SQLite/IndexedDB**, DreamWeaver transforms multi-provider AI models (Google Gemini, Groq, OpenRouter) into deterministic, structured Game Masters using a **12-Block Building Architecture**.

---

## 🌟 Key Features

### 🏰 1. The 12 Narrative Building Blocks
Unlike standard unstructured chat interfaces that quickly forget character traits and lore rules, DreamWeaver compiles **12 specialized building blocks** into a cohesive prompt context window before every turn:
1. **Scenario Meta**: Title, description, genre categories, cover artwork.
2. **Setting & Worldbuilding**: Lore, physical laws, magic limits, technological tier, factions.
3. **Plot & Scene Premise**: Immediate objectives, active conflicts, plot hooks.
4. **Style & Perspective**: Narrative voice, POV (e.g. 2nd-person present), prose rhythm.
5. **Narrator Directives**: Game Master system instructions and turn pacing rules.
6. **History & Backstory**: Chronological recap of past chapters and immediate pre-scene lore.
7. **Player Personas**: Protagonist traits, physical appearance, speech quirks, starting equipment.
8. **Scenario NPCs & Companions**: Secondary character profiles and opening dialogue lines.
9. **Grounding Locations**: Spatial architecture, lighting, environmental atmosphere, entry points.
10. **Custom Objects & Gameplay Rules**: Inventory items, status effects, and conditional trigger rules.
11. **Reference Examples (Few-Shot Learning)**: Multi-turn sample dialogues demonstrating formatting, voice depth, and pacing.
12. **Private Author Notes**: 100% local scratchpad strictly hidden from AI API requests.

---

### ⚡ 2. Multi-Provider AI Routing & Rate Limit Fallback
- **Supported Providers**:
  - **Google Gemini**: Default engine supporting `gemini-2.5-flash` and `gemini-2.5-pro`.
  - **Groq Cloud**: Ultra-fast inference running `Llama 3.3 70B` and `Mixtral 8x7b`.
  - **OpenRouter Hub**: Access hundreds of open-source models with live `[FREE]` tier tagging.
- **Searchable Combobox Selector**: Live API discovery catalog with real-time text search filter.
- **Automatic 429 Fallback**: Seamlessly falls back to secondary configured providers if rate limits are hit.

---

### 📥 3. Deep Schema World-Gen JSON Importer
- **Universal Importer Modal**: Drag-and-drop `.json` file upload or raw text paste.
- **Deep Schema Extraction**: Recursively parses 3rd-party nested JSON files (World-Gen and DreamGen schemas) into native 12-block scenarios, extracting player personas, NPC companions, and world lore.

---

### 🎭 4. Turn Dynamics & Speaker Identity Engine
- **Explicit Speaker Attribution**: Attributes turns to `Player Persona`, `Narrator`, or specific `NPC Companions`.
- **Automatic Turn Auto-Switching**: When an NPC stream finishes generating, the turn selector automatically resets back to your player persona.

---

### 💾 5. 100% Local Storage & Session Persistence
- **Zero Cloud Lock-in**: All scenario files, session logs, and message histories are saved to local SQLite/IndexedDB storage (`/data/scenarios/` & `/data/app.db`).
- **`F5` Refresh & Restart Safety**: Active session state is synchronized with `localStorage` (`dreamweaver_active_session_id`), automatically restoring your story upon browser refresh.

---

### 📖 6. Embedded GitBook Documentation Center
- Embedded 7-section user manual with real-time text search, interactive 12-block accordions, deep-dive Few-Shot guidelines, and system commands guide.

---

## 🛠️ System Requirements & Tech Stack

- **Framework**: [Next.js 16 (App Router, Turbopack)](https://nextjs.org/)
- **Language**: TypeScript
- **Styling**: Tailwind CSS & Lucide Icons
- **Database**: `better-sqlite3` / `@libsql/client` (Server) & `idb` (Browser IndexedDB)
- **Testing**: Vitest (`npm test`)
- **Runtime**: Node.js `v18.x` or `v20.x+`

---

## 🚀 Quick Start (Local Setup)

### 1. Clone & Install Dependencies
```bash
git clone https://github.com/your-username/dreamweaver.git
cd dreamweaver
npm install
```

### 2. Configure Environment Variables (Optional)
Create a `.env.local` file in the project root if you wish to pre-set API keys:
```env
GEMINI_API_KEY=your_google_gemini_api_key
GROQ_API_KEY=your_groq_api_key
OPENROUTER_API_KEY=your_openrouter_api_key
```
*(Note: API Keys can also be configured directly inside the UI via the **API Settings** modal).*

### 3. Run Development Server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 📦 Production & Self-Hosting

To build and run DreamWeaver for production:

```bash
# Build optimized production bundle
npm run build

# Start production server
npm start
```

DreamWeaver stores scenario files in `./data/scenarios/` and local session databases in `./data/app.db`. When self-hosting (via Docker, VPS, or local server), ensure the `./data` directory has persistent volume storage.

---

## 🧪 Running Tests

DreamWeaver includes a comprehensive Vitest unit test suite covering AI prompt compilation, multi-provider routing, JSON schema importing, and database persistence:

```bash
# Run Vitest unit tests once
npm test

# Run Vitest in watch mode
npx vitest
```

---

## 📜 License

This project is open-source software licensed under the [MIT License](LICENSE).
