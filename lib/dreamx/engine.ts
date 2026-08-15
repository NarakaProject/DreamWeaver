import { routeChatStream, AIProvider, ProviderKeys, DEFAULT_MODELS } from '@/lib/ai/provider-router';
import type { Actor, DreamXProfile, DreamXPost } from './types';
import { toActorFromProfile } from './actors';
import { renderPersonalityDescription } from './personality';
import { renderContentProfileDescription } from './contentProfile';
import { renderTaxonomyDescription } from './taxonomy';

interface GenerationOptions {
  provider?: AIProvider;
  model?: string;
  keys: ProviderKeys;
}

function isActor(obj: any): obj is Actor {
  return obj && typeof obj === 'object' && 'identity' in obj && typeof obj.identity === 'object';
}

function ensureActor(actorOrProfile: Actor | DreamXProfile): Actor {
  return isActor(actorOrProfile) ? actorOrProfile : toActorFromProfile(actorOrProfile);
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

export interface SocialOutputValidation {
  isValid: boolean;
  reason?: string;
  normalizedText: string;
}

export function validateSocialOutput(rawText: string, finishReason?: string): SocialOutputValidation {
  if (!rawText || !rawText.trim()) {
    return { isValid: false, reason: 'Empty response from provider', normalizedText: '' };
  }

  if (finishReason === 'length' || finishReason === 'MAX_TOKENS') {
    return { isValid: false, reason: 'Truncated by provider max_tokens limit', normalizedText: '' };
  }

  const normalized = normalizeSocialOutput(rawText);
  if (!normalized || normalized.length < 5) {
    return { isValid: false, reason: 'Output empty or too short after normalization', normalizedText: normalized };
  }

  // Dangling prepositions, conjunctions, articles, or incomplete words at sentence end
  const danglingEndingsRegex = /\b(and|or|but|the|a|an|in|of|to|with|for|on|at|by|from|about|into|through|during|before|after|above|below|between|under|again|further|then|once|here|there|when|where|why|how|all|any|both|each|few|more|most|other|some|such|no|nor|not|only|own|same|so|than|too|very|s|t|can|will|just|should|now|find|if|is|are|was|were|be|been|being|have|has|had|do|does|did|would|could)\s*$/i;

  if (danglingEndingsRegex.test(normalized)) {
    return { isValid: false, reason: 'Incomplete sentence ending in dangling word or preposition', normalizedText: normalized };
  }

  // Trailing incomplete punctuation
  if (/[,:\-;\(\[\{]\s*$/.test(normalized)) {
    return { isValid: false, reason: 'Incomplete sentence ending in dangling punctuation', normalizedText: normalized };
  }

  // Unclosed quotes or brackets
  const doubleQuotes = (normalized.match(/"/g) || []).length;
  if (doubleQuotes % 2 !== 0) {
    return { isValid: false, reason: 'Unclosed quotation mark in output', normalizedText: normalized };
  }

  const openParens = (normalized.match(/\(/g) || []).length;
  const closeParens = (normalized.match(/\)/g) || []).length;
  if (openParens !== closeParens) {
    return { isValid: false, reason: 'Unclosed parenthesis in output', normalizedText: normalized };
  }

  return { isValid: true, normalizedText: normalized };
}

export function buildDreamXSystemInstruction(actorOrProfile: Actor | DreamXProfile): string {
  const actor = ensureActor(actorOrProfile);

  const sections: string[] = [
    `You are ${actor.identity.handle}, an independent fictional social-media personality on DreamX.`,
    `Name: ${actor.identity.display_name}`,
    `Bio: ${actor.identity.bio || 'None'}`
  ];

  if (actor.taxonomy) {
    const taxDesc = renderTaxonomyDescription(actor.taxonomy);
    if (taxDesc) sections.push(taxDesc);
  }

  if (actor.personality) {
    const persDesc = renderPersonalityDescription(actor.personality);
    if (persDesc) sections.push(persDesc);
  }

  if (actor.contentProfile) {
    const contentDesc = renderContentProfileDescription(actor.contentProfile);
    if (contentDesc) sections.push(contentDesc);
  }

  sections.push(`CRITICAL RULES:
- Generate ONLY the exact text of your social media post or reply.
- DO NOT wrap the output in quotes.
- DO NOT prefix the post with your name, handle, or "Here is my post:".
- Do NOT act as an AI assistant or provide meta commentary.
- Stay in character with your defined personality (disagreeing, joking, or being supportive as fits your persona).
- Target a realistic social media length (~280 characters).`);

  return sections.join('\n\n');
}

export async function generateDreamXPost(
  actorOrProfile: Actor | DreamXProfile,
  context: string = '',
  options: GenerationOptions
): Promise<{ text: string; validation: SocialOutputValidation }> {
  const systemInstruction = buildDreamXSystemInstruction(actorOrProfile);
  
  let userPrompt = 'Generate a standalone social media post.';
  if (context) {
    userPrompt += `\nTopic or context for this post: ${context}`;
  }

  const { rawText, finishReason } = await executeDreamXStream(systemInstruction, userPrompt, options);
  const validation = validateSocialOutput(rawText, finishReason);
  return { text: validation.normalizedText, validation };
}

export async function generateDreamXReply(
  actorOrProfile: Actor | DreamXProfile,
  targetPost: DreamXPost,
  targetAuthorName: string,
  targetAuthorHandle: string,
  options: GenerationOptions,
  isMentioned: boolean = false
): Promise<{ text: string; validation: SocialOutputValidation }> {
  const actor = ensureActor(actorOrProfile);
  const systemInstruction = buildDreamXSystemInstruction(actor);
  
  let userPrompt = `You are replying to a post by ${targetAuthorName} (${targetAuthorHandle}).
  
Original Post:
"${targetPost.content}"`;

  if (isMentioned) {
    userPrompt += `\n\nNOTE: This post explicitly mentions your handle (${actor.identity.handle}). Treat this as a direct social interaction and respond naturally in character. Do not mechanically acknowledge the mention unless it fits your personality.`;
  }

  userPrompt += `\n\nGenerate your reply to this post in character. You may agree, disagree, ask a question, make a joke, or add a sarcastic observation as fits your persona.`;

  const { rawText, finishReason } = await executeDreamXStream(systemInstruction, userPrompt, options);
  const validation = validateSocialOutput(rawText, finishReason);
  return { text: validation.normalizedText, validation };
}

async function executeDreamXStream(
  systemInstruction: string,
  userPrompt: string,
  options: GenerationOptions
): Promise<{ rawText: string; finishReason?: string }> {
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
      maxOutputTokens: 500,
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
      maxOutputTokens: 500,
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

  let finishReason: string | undefined = undefined;
  const reasonMatch = fullText.match(/\n__FINISH_REASON__:(length|stop)/);
  if (reasonMatch) {
    finishReason = reasonMatch[1];
    fullText = fullText.replace(/\n__FINISH_REASON__:(length|stop)/g, '');
  }

  return { rawText: fullText.trim(), finishReason };
}
