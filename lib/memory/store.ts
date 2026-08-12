/**
 * Episodic Long-Term Memory (ELTM) Engine Store
 * Provides fast local keyword search, in-memory cache, and browser-safe API-based persistence.
 * 
 * IMPORTANT: This file must remain browser-safe (no server-only imports like fs, better-sqlite3, etc.).
 * All persistence to the database is handled by the /api/memory API route.
 */

export interface MemoryEntry {
  id: string;
  sessionId: string;
  turnNumber: number;
  speaker: string;
  content: string;
  keywords: string[];
  isSummary?: boolean;
  timestamp: number;
}

// In-memory cache for rapid client-side access
const memoryCache: Map<string, MemoryEntry[]> = new Map();

// Common English stop words to filter out during query tokenization
const STOP_WORDS = new Set([
  'a', 'about', 'above', 'after', 'again', 'against', 'all', 'am', 'an', 'and', 'any', 'are', "aren't", 'as', 'at',
  'be', 'because', 'been', 'before', 'being', 'below', 'between', 'both', 'but', 'by',
  "can", "can't", 'cannot', 'could', "couldn't", 'did', "didn't", 'do', 'does', "doesn't", 'doing', "don't", 'down', 'during',
  'each', 'few', 'for', 'from', 'further', 'had', "hadn't", 'has', "hasn't", 'have', "haven't", 'having', 'he', "he'd", "he'll", "he's", 'her', 'here', "here's", 'hers', 'herself', 'him', 'himself', 'his', 'how', "how's",
  'i', "i'd", "i'll", "i'm", "i've", 'if', 'in', 'into', 'is', "isn't", 'it', "it's", 'its', 'itself',
  "let's", 'me', 'more', 'most', "mustn't", 'my', 'myself',
  'no', 'nor', 'not', 'of', 'off', 'on', 'once', 'only', 'or', 'other', 'ought', 'our', 'ours', 'ourselves', 'out', 'over', 'own',
  'same', "shan't", 'she', "she'd", "she'll", "she's", 'should', "shouldn't", 'so', 'some', 'such',
  'than', 'that', "that's", 'the', 'their', 'theirs', 'them', 'themselves', 'then', 'there', "there's", 'these', 'they', "they'd", "they'll", "they're", "they've", 'this', 'those', 'through', 'to', 'too', 'under', 'until', 'up',
  'very', 'was', "wasn't", 'we', "we'd", "we'll", "we're", "we've", 'were', "weren't", 'what', "what's", 'when', "when's", 'where', "where's", 'which', 'while', 'who', "who's", 'whom', 'why', "why's", 'with', "won't", 'would', "wouldn't",
  'you', "you'd", "you'll", "you're", "you've", 'your', 'yours', 'yourself', 'yourselves',
  'remember', 'tell', 'show', 'said', 'say'
]);

/**
 * Tokenizes a string query into normalized keywords.
 */
export function tokenizeQuery(query: string): string[] {
  if (!query) return [];
  const words = query
    .toLowerCase()
    .replace(/[^\w\s]/g, ' ')
    .split(/\s+/)
    .filter((w) => w.length > 1 && !STOP_WORDS.has(w));
  return Array.from(new Set(words));
}

/**
 * Generates an array of keywords from text content.
 */
export function extractKeywords(text: string): string[] {
  return tokenizeQuery(text);
}

/**
 * Saves a new memory entry into the local in-memory cache and syncs to the API.
 * All server-side DB persistence is handled by the /api/memory route.
 */
export async function addMemory(
  entry: Omit<MemoryEntry, 'id' | 'timestamp' | 'keywords'> & {
    id?: string;
    timestamp?: number;
    keywords?: string[];
  }
): Promise<MemoryEntry> {
  const newEntry: MemoryEntry = {
    id: entry.id || `mem_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    sessionId: entry.sessionId,
    turnNumber: entry.turnNumber,
    speaker: entry.speaker || 'Narrator',
    content: entry.content,
    keywords: entry.keywords && entry.keywords.length > 0 ? entry.keywords : extractKeywords(entry.content),
    isSummary: !!entry.isSummary,
    timestamp: entry.timestamp || Date.now(),
  };

  const sessionMemories = memoryCache.get(entry.sessionId) || [];
  
  // Avoid duplicate exact content
  const existingIdx = sessionMemories.findIndex(m => m.id === newEntry.id || (m.turnNumber === newEntry.turnNumber && m.content === newEntry.content));
  if (existingIdx >= 0) {
    sessionMemories[existingIdx] = newEntry;
  } else {
    sessionMemories.push(newEntry);
  }

  memoryCache.set(entry.sessionId, sessionMemories);

  // Sync to /api/memory in browser context only
  if (typeof window !== 'undefined' && !process.env.VITEST) {
    try {
      await fetch('/api/memory', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newEntry),
      });
    } catch (err) {
      console.error('Failed to sync memory to API:', err);
    }
  }

  return newEntry;
}

/**
 * Retrieves all stored memories for a specific session.
 * In the browser, fetches from /api/memory. In test environments, uses the cache.
 */
export async function getMemoriesForSession(sessionId: string): Promise<MemoryEntry[]> {
  if (memoryCache.has(sessionId) && memoryCache.get(sessionId)!.length > 0) {
    return memoryCache.get(sessionId) || [];
  }

  let memories: MemoryEntry[] = [];

  if (typeof window !== 'undefined' && !process.env.VITEST) {
    try {
      const res = await fetch(`/api/memory?sessionId=${sessionId}`);
      const data = await res.json();
      if (data.memories) {
        memories = data.memories;
      }
    } catch (err) {
      console.error('Failed to fetch memories from API:', err);
    }
  }

  memoryCache.set(sessionId, memories);
  return memories;
}

/**
 * Searches stored memories using local keyword relevance scoring (TF-IDF inspired).
 * Returns the top-K most relevant memory entries.
 */
export async function searchMemories(
  sessionId: string,
  query: string,
  topK: number = 5
): Promise<MemoryEntry[]> {
  const allMemories = await getMemoriesForSession(sessionId);
  if (!allMemories || allMemories.length === 0) return [];

  const queryTokens = tokenizeQuery(query);
  if (queryTokens.length === 0) {
    // Return latest 5 memories if no specific keywords provided
    return allMemories.slice(-topK);
  }

  const queryLower = query.toLowerCase();

  const scoredEntries = allMemories.map((entry) => {
    let score = 0;
    const contentLower = entry.content.toLowerCase();
    const entryKeywords = new Set(entry.keywords.map((k) => k.toLowerCase()));

    // Exact phrase match bonus
    if (contentLower.includes(queryLower)) {
      score += 10;
    }

    queryTokens.forEach((token) => {
      // Keyword array match
      if (entryKeywords.has(token)) {
        score += 3;
      }
      // Content word match
      if (contentLower.includes(token)) {
        score += 2;
      }
      // Speaker match
      if (entry.speaker.toLowerCase().includes(token)) {
        score += 2;
      }
    });

    // Slight boost for compressed episodic summaries
    if (entry.isSummary) {
      score += 1.5;
    }

    return { entry, score };
  });

  return scoredEntries
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, topK)
    .map((item) => item.entry);
}

/**
 * Deletes a specific memory entry from cache and API.
 */
export async function deleteMemory(sessionId: string, memoryId: string): Promise<void> {
  const sessionMemories = (memoryCache.get(sessionId) || []).filter((m) => m.id !== memoryId);
  memoryCache.set(sessionId, sessionMemories);

  if (typeof window !== 'undefined' && !process.env.VITEST) {
    try {
      await fetch(`/api/memory?id=${memoryId}&sessionId=${sessionId}`, { method: 'DELETE' });
    } catch {
      // Ignore
    }
  }
}

/**
 * Clears all memory entries for a session from cache and API.
 */
export async function clearMemories(sessionId: string): Promise<void> {
  memoryCache.delete(sessionId);

  if (typeof window !== 'undefined' && !process.env.VITEST) {
    try {
      await fetch(`/api/memory?clearAll=true&sessionId=${sessionId}`, { method: 'DELETE' });
    } catch {
      // Ignore
    }
  }
}
