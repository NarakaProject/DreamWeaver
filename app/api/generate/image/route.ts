import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { enhanceImagePrompt, AssetType } from '@/lib/gemini/image-prompt';

const PRIMARY_MODEL = 'https://api-inference.huggingface.co/models/black-forest-labs/FLUX.1-schnell';
const FALLBACK_MODEL = 'https://api-inference.huggingface.co/models/stabilityai/stable-diffusion-xl-base-1.0';

async function fetchHuggingFaceImage(
  url: string,
  apiKey: string,
  prompt: string,
  timeoutMs = 30000
): Promise<Buffer> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey.trim()}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ inputs: prompt }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!res.ok) {
      const errText = await res.text();
      console.error(`[HuggingFace API Error] ${url} (${res.status}):`, errText);
      throw new Error(`HF Model (${res.status}): ${errText.slice(0, 180)}`);
    }

    const arrayBuf = await res.arrayBuffer();
    return Buffer.from(arrayBuf);
  } catch (err: any) {
    clearTimeout(timeoutId);
    if (err.name === 'AbortError') {
      throw new Error(`Hugging Face API request timed out after ${timeoutMs / 1000}s.`);
    }
    throw err;
  }
}

export async function POST(req: NextRequest) {
  try {
    const apiKey =
      req.headers.get('x-huggingface-api-key') ||
      process.env.HUGGINGFACE_API_KEY ||
      process.env.HF_API_KEY;

    if (!apiKey || !apiKey.trim()) {
      return NextResponse.json(
        {
          error:
            'Hugging Face API key is not configured in .env.local. Please add HUGGINGFACE_API_KEY=hf_xxx to your .env.local file.',
        },
        { status: 400 }
      );
    }

    const body = await req.json();
    const { prompt, type } = body;

    if (!prompt || typeof prompt !== 'string' || !prompt.trim()) {
      return NextResponse.json({ error: 'Image prompt description is required.' }, { status: 400 });
    }

    const enhancedPrompt = enhanceImagePrompt(prompt, (type as AssetType) || 'general');

    let buffer: Buffer;
    let modelUsed = 'FLUX.1-schnell';

    // Attempt Primary Model (FLUX.1-schnell) with Fallback to SDXL
    try {
      buffer = await fetchHuggingFaceImage(PRIMARY_MODEL, apiKey, enhancedPrompt, 30000);
    } catch (primaryErr: any) {
      console.warn(`[HF Primary Model Failed] ${primaryErr.message}. Retrying with SDXL fallback...`);
      try {
        buffer = await fetchHuggingFaceImage(FALLBACK_MODEL, apiKey, enhancedPrompt, 30000);
        modelUsed = 'stable-diffusion-xl-base-1.0';
      } catch (fallbackErr: any) {
        console.error('[HF Fallback Model Failed]', fallbackErr.message);
        throw new Error(
          `Image generation failed on both FLUX and SDXL models. Error: ${primaryErr.message}`
        );
      }
    }

    if (!buffer || buffer.length < 100) {
      throw new Error('Received empty or invalid binary image buffer from Hugging Face.');
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
    return NextResponse.json({ success: true, imageUrl, prompt: enhancedPrompt, model: modelUsed });
  } catch (err: any) {
    console.error('Image Generation Route Error:', err);
    return NextResponse.json(
      { error: err.message || 'An error occurred during image generation.' },
      { status: 500 }
    );
  }
}
