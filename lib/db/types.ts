/**
 * Shared DB type definitions that can be safely imported by client components.
 * This file has NO server-only imports (no fs, better-sqlite3, @libsql/client, etc.).
 */

export interface DbSession {
  id: string;
  title: string;
  world_id: string;
  character_id: string;
  system_instruction?: string;
  created_at: number;
  updated_at: number;
}

export interface DbMessage {
  id: string;
  session_id: string;
  role: 'user' | 'model' | 'system';
  content: string;
  type?: 'do' | 'say' | 'story_note' | 'continue' | 'narration';
  speaker?: string;
  timestamp: number;
}

export interface DbMemory {
  id: string;
  session_id: string;
  turn_number: number;
  speaker?: string;
  content: string;
  keywords?: string;
  is_summary?: number;
  timestamp: number;
}
