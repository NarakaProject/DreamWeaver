import { NextRequest, NextResponse } from 'next/server';
import { generateDreamXPost, generateDreamXReply } from '@/lib/dreamx/engine';
import { getProfile, getPost, savePost } from '@/lib/dreamx/db';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { action, profile_id, target_post_id, context, provider, model, keys } = body;

    if (!profile_id) {
      return NextResponse.json({ error: 'profile_id is required' }, { status: 400 });
    }
    
    if (!keys || Object.keys(keys).length === 0) {
      return NextResponse.json({ error: 'API keys are required for generation' }, { status: 400 });
    }

    const profile = await getProfile(profile_id);
    if (!profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    }

    const options = { provider, model, keys };
    let generatedContent = '';
    let replyToId = null;

    if (action === 'post') {
      generatedContent = await generateDreamXPost(profile, context, options);
    } else if (action === 'reply') {
      if (!target_post_id) {
        return NextResponse.json({ error: 'target_post_id is required for replies' }, { status: 400 });
      }
      
      const targetPost = await getPost(target_post_id);
      if (!targetPost) {
        return NextResponse.json({ error: 'Target post not found' }, { status: 404 });
      }
      
      const targetProfile = await getProfile(targetPost.profile_id);
      if (!targetProfile) {
        return NextResponse.json({ error: 'Target profile not found' }, { status: 404 });
      }

      generatedContent = await generateDreamXReply(profile, targetPost, targetProfile, options);
      replyToId = target_post_id;
    } else {
      return NextResponse.json({ error: 'Invalid action, must be "post" or "reply"' }, { status: 400 });
    }

    // Save the generated post to the isolated database
    const post = await savePost({
      profile_id: profile.id,
      content: generatedContent,
      reply_to_post_id: replyToId,
    });

    return NextResponse.json({ success: true, post });
  } catch (err: any) {
    console.error('Failed to generate DreamX content:', err);
    return NextResponse.json({ error: err.message || 'Failed to generate content' }, { status: 500 });
  }
}
