import { NextRequest, NextResponse } from 'next/server';
import { getFeed, savePost, deletePost } from '@/lib/dreamx/db';

export async function GET() {
  try {
    const feed = await getFeed();
    return NextResponse.json({ feed });
  } catch (err: any) {
    console.error('Failed to get DreamX feed:', err);
    return NextResponse.json({ error: 'Failed to retrieve feed' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    if (!body.profile_id || !body.content) {
      return NextResponse.json({ error: 'profile_id and content are required' }, { status: 400 });
    }
    
    // Ensure content is not excessively long for a social network
    if (body.content.length > 5000) {
      return NextResponse.json({ error: 'Content exceeds maximum length' }, { status: 400 });
    }

    const post = await savePost(body);
    return NextResponse.json({ success: true, post });
  } catch (err: any) {
    console.error('Failed to save DreamX post:', err);
    return NextResponse.json({ error: 'Failed to save post' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    
    if (!id) {
      return NextResponse.json({ error: 'Missing id parameter' }, { status: 400 });
    }

    await deletePost(id);
    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error('Failed to delete DreamX post:', err);
    return NextResponse.json({ error: 'Failed to delete post' }, { status: 500 });
  }
}
