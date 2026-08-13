import { NextRequest, NextResponse } from 'next/server';
import { getUserProfile, toggleLike, toggleRepost, toggleFollow } from '@/lib/dreamx/db';

export async function POST(req: NextRequest) {
  try {
    const user = await getUserProfile();
    if (!user) {
      return NextResponse.json({ error: 'Human user profile not found. Please complete onboarding.' }, { status: 401 });
    }

    const body = await req.json();
    const { action, post_id, followed_profile_id } = body;

    if (action === 'like') {
      if (!post_id) return NextResponse.json({ error: 'post_id is required' }, { status: 400 });
      const res = await toggleLike(post_id, user.id, 'human');
      return NextResponse.json({ success: true, ...res });
    }

    if (action === 'repost') {
      if (!post_id) return NextResponse.json({ error: 'post_id is required' }, { status: 400 });
      const res = await toggleRepost(post_id, user.id, 'human');
      return NextResponse.json({ success: true, ...res });
    }

    if (action === 'follow') {
      if (!followed_profile_id) return NextResponse.json({ error: 'followed_profile_id is required' }, { status: 400 });
      const res = await toggleFollow(user.id, 'human', followed_profile_id);
      return NextResponse.json({ success: true, ...res });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (err: any) {
    console.error('Failed to process interaction:', err);
    return NextResponse.json({ error: 'Failed to process interaction' }, { status: 500 });
  }
}
