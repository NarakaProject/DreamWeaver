import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { HfInference } from '@huggingface/inference';
import { enhanceImagePrompt, AssetType } from '@/lib/gemini/image-prompt';

const PRIMARY_MODEL = 'black-forest-labs/FLUX.1-schnell';
const FALLBACK_MODEL = 'stabilityai/stable-diffusion-xl-base-1.0';

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

    const hf = new HfInference(apiKey.trim());

    let imageBlob: Blob;
    let modelUsed = PRIMARY_MODEL;

    // Attempt Primary Model (FLUX.1-schnell) via HfInference SDK with Fallback to SDXL
    try {
      imageBlob = (await hf.textToImage({
        model: PRIMARY_MODEL,
        inputs: enhancedPrompt,
      })) as unknown as Blob;
    } catch (primaryErr: any) {
      console.warn(`[HF SDK Primary Model Failed] ${primaryErr.message}. Retrying with SDXL fallback...`);
      try {
        imageBlob = (await hf.textToImage({
          model: FALLBACK_MODEL,
          inputs: enhancedPrompt,
        })) as unknown as Blob;
        modelUsed = FALLBACK_MODEL;
      } catch (fallbackErr: any) {
        console.error('[HF SDK Fallback Model Failed]', fallbackErr.message);
        throw new Error(
          `Image generation failed on both FLUX and SDXL models via SDK. Error: ${primaryErr.message}`
        );
      }
    }

    const arrayBuf = await imageBlob.arrayBuffer();
    const buffer = Buffer.from(arrayBuf);

    if (!buffer || buffer.length < 100) {
      throw new Error('Received empty or invalid binary image buffer from Hugging Face SDK.');
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
