export type AssetType = 'avatar' | 'cover' | 'location' | 'object' | 'general';

/**
 * Synthesizes descriptive text prompts with art style anchors based on asset type.
 */
export function enhanceImagePrompt(description: string, type: AssetType = 'general'): string {
  const clean = (description || '').trim();

  switch (type) {
    case 'avatar':
      return `close-up character portrait, high detail, masterpiece, dark cinematic lighting, fantasy digital art style, ${
        clean || 'heroic roleplay adventurer'
      }`;
    case 'cover':
      return `wide view cover art, epic concept art, immersive atmosphere, masterpiece, cinematic lighting, 8k resolution, ${
        clean || 'dark fantasy world setting'
      }`;
    case 'location':
      return `wide environmental concept art, detailed architectural setting, atmospheric lighting, masterpiece, ${
        clean || 'ancient fortified citadel'
      }`;
    case 'object':
      return `centered item artifact, high detail RPG icon, dark background studio lighting, masterpiece digital art, ${
        clean || 'glowing magic relic'
      }`;
    default:
      return `high quality digital art, masterpiece, cinematic lighting, ${clean || 'fantasy RPG scene'}`;
  }
}
