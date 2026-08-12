/**
 * Background Auto-Summarizer Engine (ELTM)
 * Periodically compresses blocks of narrative turns into permanent background lore entries.
 */

import { addMemory, MemoryEntry } from './store';

export const SUMMARY_INTERVAL = 15;

/**
 * Checks if the current turn count warrants an episodic summary trigger.
 */
export function shouldSummarize(turnCount: number, interval: number = SUMMARY_INTERVAL): boolean {
  return turnCount > 0 && turnCount % interval === 0;
}

/**
 * Heuristic fallback summarizer if AI provider is unreachable or offline.
 * Extracts key dialogue, actions, and named entity events.
 */
export function generateHeuristicSummary(
  turns: { speaker?: string; content: string; turnNumber: number }[]
): string {
  const events: string[] = [];

  turns.forEach((turn) => {
    const speaker = turn.speaker || 'Narrator';
    const cleanText = turn.content.trim().replace(/\.+$/, '');

    // Extract spoken dialogue or major action lines
    if (cleanText.includes('"') || cleanText.includes("'")) {
      const match = cleanText.match(/"([^"]+)"|'([^']+)'/);
      if (match) {
        const quote = match[1] || match[2];
        events.push(`${speaker} stated: "${quote.substring(0, 80)}"`);
      }
    } else if (cleanText.length > 20) {
      events.push(`[Turn ${turn.turnNumber}] ${speaker}: ${cleanText.substring(0, 90)}`);
    }
  });

  return events.slice(-4).join('; ');
}

/**
 * Generates and stores an episodic summary for a block of turns.
 */
export async function summarizeTurnChunk(
  sessionId: string,
  turns: { speaker?: string; content: string; turnNumber: number }[],
  turnCount: number
): Promise<MemoryEntry | null> {
  if (!turns || turns.length === 0) return null;

  const firstTurn = turns[0].turnNumber;
  const lastTurn = turns[turns.length - 1].turnNumber;
  const summaryContent = generateHeuristicSummary(turns);

  const summaryEntry = await addMemory({
    sessionId,
    turnNumber: lastTurn,
    speaker: 'Episodic Summary',
    content: `[Episodic Memory Turns ${firstTurn}-${lastTurn}]: ${summaryContent}`,
    keywords: ['summary', `turn_${firstTurn}_${lastTurn}`, 'lore_checkpoint'],
    isSummary: true,
  });

  return summaryEntry;
}

/**
 * Background auto-summarization dispatcher.
 * Executes non-blocking compression when turn milestones are hit.
 */
export async function processBackgroundAutoSummary(
  sessionId: string,
  allTurns: { speaker?: string; content: string; turnNumber: number }[]
): Promise<MemoryEntry | null> {
  const turnCount = allTurns.length;
  if (!shouldSummarize(turnCount)) return null;

  // Extract the last SUMMARY_INTERVAL turns
  const chunk = allTurns.slice(-SUMMARY_INTERVAL);
  return await summarizeTurnChunk(sessionId, chunk, turnCount);
}
