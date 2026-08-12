import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { enhanceImagePrompt, AssetType } from '@/lib/gemini/image-prompt';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { prompt, type, aspect_ratio } = body;

    if (!prompt || typeof prompt !== 'string' || !prompt.trim()) {
      return NextResponse.json({ error: 'Image prompt description is required.' }, { status: 400 });
    }

    const assetKind = (type as AssetType) || 'general';
    const enhancedPrompt = enhanceImagePrompt(prompt, assetKind);

    // Determine aspect ratio dimensions
    const isLandscape = aspect_ratio === 'landscape' || assetKind === 'cover' || assetKind === 'location';
    const width = isLandscape ? 1280 : 1024;
    const height = isLandscape ? 720 : 1024;

    const seed = Date.now() + Math.floor(Math.random() * 10000);
    const pollinationsUrl = `https://image.pollinations.ai/prompt/${encodeURIComponent(
      enhancedPrompt
    )}?model=flux&width=${width}&height=${height}&nologo=true&seed=${seed}`;

    console.log(`[Pollinations FLUX API] Requesting image asset: "${enhancedPrompt.slice(0, 80)}..."`);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 35000);

    let res: Response;
    try {
      res = await fetch(pollinationsUrl, {
        method: 'GET',
        headers: {
          'User-Agent': 'DreamWeaver-Engine/1.0',
        },
        signal: controller.signal,
      });
      clearTimeout(timeoutId);
    } catch (fetchErr: any) {
      clearTimeout(timeoutId);
      if (fetchErr.name === 'AbortError') {
        throw new Error('Pollinations FLUX image generation request timed out after 35 seconds.');
      }
      throw new Error(`Failed to connect to Pollinations FLUX server: ${fetchErr.message}`);
    }

    if (!res.ok) {
      const errText = await res.text();
      console.error(`[Pollinations FLUX Error] Status ${res.status}:`, errText);
      throw new Error(`Pollinations FLUX API error (${res.status}): ${errText.slice(0, 150)}`);
    }

    const arrayBuf = await res.arrayBuffer();
    const buffer = Buffer.from(arrayBuf);

    if (!buffer || buffer.length < 100) {
      throw new Error('Received empty or corrupted binary image buffer from Pollinations FLUX API.');
    }

    // Ensure /public/uploads/ directory exists
    const uploadsDir = path.join(process.cwd(), 'public', 'uploads');
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }

    const filename = `gen-${Date.now()}-${Math.floor(Math.random() * 1000)}.png`;
    const filePath = path.join(uploadsDir, filename);

    fs.writeFileSync(filePath, buffer);

    const imageUrl = `/uploads/${filename}`;
    return NextResponse.json({
      success: true,
      imageUrl,
      prompt: enhancedPrompt,
      model: 'pollinations-flux',
      dimensions: `${width}x${height}`,
    });
  } catch (err: any) {
    console.error('Image Generation Route Error:', err);
    return NextResponse.json(
      { error: err.message || 'An error occurred during image generation.' },
      { status: 500 }
    );
  }
}
