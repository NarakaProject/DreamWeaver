import { NextRequest, NextResponse } from 'next/server';
import { 
  getFeedTree, 
  savePost, 
  deletePost, 
  getUserProfile, 
  getPost, 
  getRepliesTree,
  getProfilePosts 
} from '@/lib/dreamx/db';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const threadId = searchParams.get('thread_id');
    const profileId = searchParams.get('profile_id');
    const profileType = (searchParams.get('profile_type') as 'human' | 'ai') || 'ai';

    if (threadId) {
      const root = await getPost(threadId);
      if (!root) {
        return NextResponse.json({ error: 'Thread post not found' }, { status: 404 });
      }
      const replies = await getRepliesTree(threadId);
      return NextResponse.json({ root, replies });
    }

    if (profileId) {
      const posts = await getProfilePosts(profileId, profileType);
      return NextResponse.json(posts);
    }

    // Default: Root Feed Tree (reply_to_post_id IS NULL)
    const feed = await getFeedTree();
    return NextResponse.json({ feed });
  } catch (err: any) {
    console.error('Failed to get DreamX feed:', err);
    return NextResponse.json({ error: 'Failed to retrieve feed' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    // SECURITY GUARDRAIL: Derive author strictly from human user profile
    const humanUser = await getUserProfile();
    if (!humanUser) {
      return NextResponse.json({ error: 'Human user profile not found. Please complete onboarding.' }, { status: 401 });
    }

    const body = await req.json();
    const { content, reply_to_post_id } = body;

    if (!content || !content.trim()) {
      return NextResponse.json({ error: 'Content is required' }, { status: 400 });
    }
    
    if (content.length > 5000) {
      return NextResponse.json({ error: 'Content exceeds maximum length' }, { status: 400 });
    }

    // Enforce human author identity
    const post = await savePost({
      author_id: humanUser.id,
      author_type: 'human',
      content: content.trim(),
      reply_to_post_id: reply_to_post_id || null,
    });

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
