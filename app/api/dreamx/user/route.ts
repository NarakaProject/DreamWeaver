import { NextRequest, NextResponse } from 'next/server';
import { getUserProfile, saveUserProfile } from '@/lib/dreamx/db';

export async function GET() {
  try {
    const user = await getUserProfile();
    return NextResponse.json({ user: user || null });
  } catch (err: any) {
    console.error('Failed to get DreamX user profile:', err);
    return NextResponse.json({ error: 'Failed to retrieve user profile' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    if (!body.display_name || !body.handle) {
      return NextResponse.json({ error: 'display_name and handle are required' }, { status: 400 });
    }

    const user = await saveUserProfile(body);
    return NextResponse.json({ success: true, user });
  } catch (err: any) {
    console.error('Failed to save DreamX user profile:', err);
    return NextResponse.json({ error: 'Failed to save user profile' }, { status: 500 });
  }
}
