import { routeChatStream, AIProvider, ProviderKeys, DEFAULT_MODELS } from '@/lib/ai/provider-router';
import type { DreamXProfile, DreamXPost } from './types';

interface GenerationOptions {
  provider?: AIProvider;
  model?: string;
  keys: ProviderKeys;
}

/**
 * Output Normalization
 * Removes reasoning tags (<think>...</think>), markdown code fences, prefixed labels,
 * quotes around entire posts, and raw provider artifacts.
 */
export function normalizeSocialOutput(rawText: string): string {
  if (!rawText) return '';

  let cleaned = rawText;

  // 1. Remove reasoning / thinking blocks
  cleaned = cleaned.replace(/<think>[\s\S]*?<\/think>/gi, '');

  // 2. Remove markdown code blocks
  cleaned = cleaned.replace(/```[a-z]*\s*([\s\S]*?)```/gi, '$1');

  // 3. Remove common text labels (e.g., "Here is a post:", "Josh:", "@handle:")
  cleaned = cleaned.replace(/^(here is (a|the) (post|reply|tweet):?\s*)/i, '');
  cleaned = cleaned.replace(/^([a-z0-9_]+:\s*)/i, '');

  // 4. Strip surrounding quotation marks if the whole post is wrapped in quotes
  cleaned = cleaned.trim();
  if ((cleaned.startsWith('"') && cleaned.endsWith('"')) || (cleaned.startsWith("'") && cleaned.endsWith("'"))) {
    cleaned = cleaned.slice(1, -1).trim();
  }

  return cleaned;
}

function buildDreamXSystemInstruction(profile: DreamXProfile): string {
  return `You are ${profile.handle}, an independent fictional social-media personality on DreamX.
  
Name: ${profile.display_name}
Bio: ${profile.bio || 'None'}
Personality: ${profile.personality || 'Neutral'}
Traits: ${profile.traits || 'None'}
Interests: ${profile.interests || 'None'}
Speaking Style: ${profile.speaking_style || 'Casual'}
Beliefs: ${profile.beliefs || 'None'}
Background: ${profile.background || 'None'}
Guidelines: ${profile.posting_guidelines || 'Posts observations, jokes, opinions, arguments, or reactions.'}

CRITICAL RULES:
- Generate ONLY the exact text of your social media post or reply.
- DO NOT wrap the output in quotes.
- DO NOT prefix the post with your name, handle, or "Here is my post:".
- Do NOT act as an AI assistant or provide meta commentary.
- Stay in character with your defined personality (disagreeing, joking, or being supportive as fits your persona).
- Target a realistic social media length (~280 characters).`;
}

export async function generateDreamXPost(
  profile: DreamXProfile,
  context: string = '',
  options: GenerationOptions
): Promise<string> {
  const systemInstruction = buildDreamXSystemInstruction(profile);
  
  let userPrompt = 'Generate a standalone social media post.';
  if (context) {
    userPrompt += `\nTopic or context for this post: ${context}`;
  }

  const raw = await executeDreamXStream(systemInstruction, userPrompt, options);
  return normalizeSocialOutput(raw);
}

export async function generateDreamXReply(
  profile: DreamXProfile,
  targetPost: DreamXPost,
  targetAuthorName: string,
  targetAuthorHandle: string,
  options: GenerationOptions
): Promise<string> {
  const systemInstruction = buildDreamXSystemInstruction(profile);
  
  const userPrompt = `You are replying to a post by ${targetAuthorName} (${targetAuthorHandle}).
  
Original Post:
"${targetPost.content}"

Generate your reply to this post in character. You may agree, disagree, ask a question, make a joke, or add a sarcastic observation as fits your persona.`;

  const raw = await executeDreamXStream(systemInstruction, userPrompt, options);
  return normalizeSocialOutput(raw);
}

async function executeDreamXStream(
  systemInstruction: string,
  userPrompt: string,
  options: GenerationOptions
): Promise<string> {
  const provider = options.provider || 'gemini';
  const model = options.model || DEFAULT_MODELS[provider];

  const messages = [{ role: 'user' as const, content: userPrompt }];
  
  const geminiPayload = {
    contents: [
      {
        role: 'user',
        parts: [{ text: userPrompt }],
      }
    ],
    systemInstruction: {
      parts: [{ text: systemInstruction }],
    },
    generationConfig: {
      temperature: 0.85,
      maxOutputTokens: 300,
    }
  };

  const response = await routeChatStream(
    {
      provider,
      model,
      keys: options.keys,
      systemInstruction,
      messages,
      temperature: 0.85,
      maxOutputTokens: 300,
    },
    geminiPayload
  );

  const reader = response.body?.getReader();
  if (!reader) {
    throw new Error('Failed to get stream reader from provider router.');
  }

  const decoder = new TextDecoder();
  let fullText = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    fullText += decoder.decode(value, { stream: true });
  }

  return fullText.trim();
}
