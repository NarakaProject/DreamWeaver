import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { enhanceImagePrompt, AssetType } from '@/lib/gemini/image-prompt';

async function fetchImageBuffer(url: string, timeoutMs = 30000): Promise<Buffer> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch(url, {
      method: 'GET',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)',
      },
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    if (!res.ok) {
      const errText = await res.text();
      console.error(`[Pollinations API Error] ${res.status}:`, errText);
      throw new Error(`Pollinations API (${res.status}): ${errText.slice(0, 150)}`);
    }

    const arrayBuf = await res.arrayBuffer();
    const buf = Buffer.from(arrayBuf);
    if (!buf || buf.length < 100) {
      throw new Error('Received invalid or truncated image buffer from Pollinations.');
    }
    return buf;
  } catch (err: any) {
    clearTimeout(timeoutId);
    if (err.name === 'AbortError') {
      throw new Error(`Pollinations request timed out after ${timeoutMs / 1000}s.`);
    }
    throw err;
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { prompt, type, aspect_ratio } = body;

    if (!prompt || typeof prompt !== 'string' || !prompt.trim()) {
      return NextResponse.json({ error: 'Image prompt description is required.' }, { status: 400 });
    }

    const assetKind = (type as AssetType) || 'general';
    const rawEnhanced = enhanceImagePrompt(prompt, assetKind);

    // Sanitize prompt text (strip newlines, quotes, backslashes, extra spaces)
    const sanitizedPrompt = rawEnhanced
      .replace(/[\r\n]+/g, ' ')
      .replace(/["']/g, '')
      .replace(/[\\/]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();

    // Determine aspect ratio dimensions
    const isLandscape = aspect_ratio === 'landscape' || assetKind === 'cover' || assetKind === 'location';
    const width = isLandscape ? 1280 : 1024;
    const height = isLandscape ? 720 : 1024;
    const seed = Math.floor(Math.random() * 1000000);

    const primaryUrl = `https://image.pollinations.ai/prompt/${encodeURIComponent(
      sanitizedPrompt
    )}?width=${width}&height=${height}&nologo=true&seed=${seed}`;

    const fallbackUrl = `https://image.pollinations.ai/prompt/${encodeURIComponent(
      sanitizedPrompt
    )}?nologo=true`;

    console.log(`[Pollinations AI] Requesting image asset: "${sanitizedPrompt.slice(0, 80)}..."`);

    let buffer: Buffer;
    let modelUsed = 'pollinations-flux';

    try {
      buffer = await fetchImageBuffer(primaryUrl, 30000);
    } catch (primaryErr: any) {
      console.warn(
        `[Pollinations Primary URL Failed] ${primaryErr.message}. Retrying with simplified fallback URL...`
      );
      try {
        buffer = await fetchImageBuffer(fallbackUrl, 30000);
        modelUsed = 'pollinations-fallback';
      } catch (fallbackErr: any) {
        console.error('[Pollinations Fallback URL Failed]', fallbackErr.message);
        throw new Error(`Image generation failed: ${primaryErr.message}`);
      }
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
      prompt: sanitizedPrompt,
      model: modelUsed,
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
