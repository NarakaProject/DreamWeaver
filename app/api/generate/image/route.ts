import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { enhanceImagePrompt, AssetType } from '@/lib/gemini/image-prompt';

export async function POST(req: NextRequest) {
  try {
    const apiKey =
      req.headers.get('x-huggingface-api-key') ||
      process.env.HUGGINGFACE_API_KEY ||
      process.env.HF_API_KEY;

    if (!apiKey) {
      return NextResponse.json(
        {
          error:
            'Hugging Face API Key is missing in .env.local. Please set HUGGINGFACE_API_KEY to generate images with FLUX.',
        },
        { status: 401 }
      );
    }

    const body = await req.json();
    const { prompt, type } = body;

    if (!prompt || typeof prompt !== 'string' || !prompt.trim()) {
      return NextResponse.json({ error: 'Image prompt description is required.' }, { status: 400 });
    }

    const enhancedPrompt = enhanceImagePrompt(prompt, (type as AssetType) || 'general');

    const hfUrl = 'https://api-inference.huggingface.co/models/black-forest-labs/FLUX.1-schnell';

    const hfRes = await fetch(hfUrl, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey.trim()}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ inputs: enhancedPrompt }),
    });

    if (!hfRes.ok) {
      const errText = await hfRes.text();
      console.error('Hugging Face FLUX API Error:', hfRes.status, errText);
      throw new Error(`FLUX Model API failed (${hfRes.status}). ${errText.slice(0, 150)}`);
    }

    const buffer = Buffer.from(await hfRes.arrayBuffer());

    // Ensure /public/uploads/ directory exists
    const uploadsDir = path.join(process.cwd(), 'public', 'uploads');
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }

    const filename = `gen-${Date.now()}-${Math.floor(Math.random() * 1000)}.png`;
    const filePath = path.join(uploadsDir, filename);

    fs.writeFileSync(filePath, buffer);

    const imageUrl = `/uploads/${filename}`;
    return NextResponse.json({ success: true, imageUrl, prompt: enhancedPrompt });
  } catch (err: any) {
    console.error('Image Generation Route Error:', err);
    return NextResponse.json(
      { error: err.message || 'An error occurred during image generation.' },
      { status: 500 }
    );
  }
}
