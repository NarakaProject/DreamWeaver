import { routeChatStream, AIProvider, ProviderKeys, DEFAULT_MODELS } from '@/lib/ai/provider-router';
import type { DreamXProfile, DreamXPost } from './types';

interface GenerationOptions {
  provider?: AIProvider;
  model?: string;
  keys: ProviderKeys;
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
Guidelines: ${profile.posting_guidelines || 'Usually posts observations, jokes, opinions, arguments, or reactions.'}

CRITICAL RULES:
- Generate ONLY the exact text of your post or reply.
- DO NOT use quotation marks around your post.
- DO NOT prefix the post with your name or handle.
- Do NOT act as an AI assistant.
- Never speak as another character.
- Keep posts short and engaging, fitting a social media platform (target roughly 280 characters, but you may use your judgement).`;
}

export async function generateDreamXPost(
  profile: DreamXProfile,
  context: string = '',
  options: GenerationOptions
): Promise<string> {
  const systemInstruction = buildDreamXSystemInstruction(profile);
  
  let userPrompt = 'Generate a new standalone social media post.';
  if (context) {
    userPrompt += `\nTopic or context for this post: ${context}`;
  }

  return executeDreamXStream(systemInstruction, userPrompt, options);
}

export async function generateDreamXReply(
  profile: DreamXProfile,
  targetPost: DreamXPost,
  targetProfile: DreamXProfile,
  options: GenerationOptions
): Promise<string> {
  const systemInstruction = buildDreamXSystemInstruction(profile);
  
  const userPrompt = `You are replying to a post by ${targetProfile.display_name} (${targetProfile.handle}).
  
Original Post:
"${targetPost.content}"

Generate your reply to this post based on your personality.`;

  return executeDreamXStream(systemInstruction, userPrompt, options);
}

async function executeDreamXStream(
  systemInstruction: string,
  userPrompt: string,
  options: GenerationOptions
): Promise<string> {
  const provider = options.provider || 'gemini';
  const model = options.model || DEFAULT_MODELS[provider];

  const messages = [{ role: 'user' as const, content: userPrompt }];
  
  // Isolated gemini payload construction, explicitly avoiding DreamWeaver's assembleGeminiPayload
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
      temperature: 0.8,
      maxOutputTokens: 256,
    }
  };

  const response = await routeChatStream(
    {
      provider,
      model,
      keys: options.keys,
      systemInstruction,
      messages,
      temperature: 0.8,
      maxOutputTokens: 256,
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
