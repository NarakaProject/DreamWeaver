import { NextRequest, NextResponse } from 'next/server';
import { getProfiles, saveProfile, deleteProfile } from '@/lib/dreamx/db';

export async function GET() {
  try {
    const profiles = await getProfiles();
    return NextResponse.json({ profiles });
  } catch (err: any) {
    console.error('Failed to get DreamX profiles:', err);
    return NextResponse.json({ error: 'Failed to retrieve profiles' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    if (!body.display_name || !body.handle) {
      return NextResponse.json({ error: 'display_name and handle are required' }, { status: 400 });
    }
    
    // Ensure handle starts with @ and has no spaces
    if (!body.handle.startsWith('@')) {
      body.handle = '@' + body.handle;
    }
    body.handle = body.handle.replace(/\s+/g, '');

    const profile = await saveProfile(body);
    return NextResponse.json({ success: true, profile });
  } catch (err: any) {
    console.error('Failed to save DreamX profile:', err);
    return NextResponse.json({ error: 'Failed to save profile' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    
    if (!id) {
      return NextResponse.json({ error: 'Missing id parameter' }, { status: 400 });
    }

    await deleteProfile(id);
    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error('Failed to delete DreamX profile:', err);
    return NextResponse.json({ error: 'Failed to delete profile' }, { status: 500 });
  }
}
