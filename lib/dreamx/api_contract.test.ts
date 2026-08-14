import { describe, it, expect, beforeEach } from 'vitest';
import { savePost, resetSimulationState, getPost } from './db';
import { GET } from '@/app/api/dreamx/posts/route';
import { NextRequest } from 'next/server';

describe('DreamX API Contract Integration Test', () => {
  beforeEach(async () => {
    await resetSimulationState();
  });

  it('delivers exact target-scoped payloads and asserts replacement semantics during sequential matrix navigation', async () => {
    // Build canonical tree
    // ROOT
    // ├── A
    // │   └── A.A
    // └── B
    //     └── B.A
    //         └── B.A.A
    const root = await savePost({ author_id: 'u1', author_type: 'human', content: 'ROOT', reply_to_post_id: null });
    const postA = await savePost({ author_id: 'u1', author_type: 'human', content: 'A', reply_to_post_id: root.id });
    const postAA = await savePost({ author_id: 'u1', author_type: 'human', content: 'A.A', reply_to_post_id: postA.id });
    const postB = await savePost({ author_id: 'u1', author_type: 'human', content: 'B', reply_to_post_id: root.id });
    const postBA = await savePost({ author_id: 'u1', author_type: 'human', content: 'B.A', reply_to_post_id: postB.id });
    const postBAA = await savePost({ author_id: 'u1', author_type: 'human', content: 'B.A.A', reply_to_post_id: postBA.id });

    // Step 1: Navigate to ROOT
    let req = new NextRequest(`http://localhost:3000/api/dreamx/posts?thread_id=${root.id}`);
    let res = await GET(req);
    let data = await res.json();
    
    expect(data.target.id).toBe(root.id);
    expect(data.ancestors.map((p: any) => p.id)).toEqual([]);
    expect(data.replies.map((p: any) => p.id)).toEqual([postA.id, postB.id]);
    
    // Ensure 'conversation' alias is fully removed from API response
    expect(data.conversation).toBeUndefined();

    // Verify unique post IDs across the entire rendered payload
    let allIds = [...data.ancestors, data.target, ...data.replies].map((p: any) => p.id);
    expect(new Set(allIds).size).toBe(allIds.length);

    // Step 2: Navigate to A
    req = new NextRequest(`http://localhost:3000/api/dreamx/posts?thread_id=${postA.id}`);
    res = await GET(req);
    data = await res.json();
    
    expect(data.target.id).toBe(postA.id);
    expect(data.ancestors.map((p: any) => p.id)).toEqual([root.id]);
    // Assert replacement semantics: replies from ROOT (B) are absent, and only A.A remains
    expect(data.replies.map((p: any) => p.id)).toEqual([postAA.id]);
    expect(data.replies.map((p: any) => p.id)).not.toContain(postB.id);

    allIds = [...data.ancestors, data.target, ...data.replies].map((p: any) => p.id);
    expect(new Set(allIds).size).toBe(allIds.length);

    // Step 3: Navigate to B
    req = new NextRequest(`http://localhost:3000/api/dreamx/posts?thread_id=${postB.id}`);
    res = await GET(req);
    data = await res.json();
    
    expect(data.target.id).toBe(postB.id);
    expect(data.ancestors.map((p: any) => p.id)).toEqual([root.id]);
    // Assert replacement semantics: replies from A (A.A) are absent
    expect(data.replies.map((p: any) => p.id)).toEqual([postBA.id]);
    expect(data.replies.map((p: any) => p.id)).not.toContain(postAA.id);

    // Step 4: Navigate to B.A
    req = new NextRequest(`http://localhost:3000/api/dreamx/posts?thread_id=${postBA.id}`);
    res = await GET(req);
    data = await res.json();
    
    expect(data.target.id).toBe(postBA.id);
    expect(data.ancestors.map((p: any) => p.id)).toEqual([root.id, postB.id]);
    expect(data.replies.map((p: any) => p.id)).toEqual([postBAA.id]);

    // Step 5: Navigate to B.A.A
    req = new NextRequest(`http://localhost:3000/api/dreamx/posts?thread_id=${postBAA.id}`);
    res = await GET(req);
    data = await res.json();
    
    expect(data.target.id).toBe(postBAA.id);
    expect(data.ancestors.map((p: any) => p.id)).toEqual([root.id, postB.id, postBA.id]);
    expect(data.replies.map((p: any) => p.id)).toEqual([]);
  });

  it('maintains strict 1:1 mapping between reply_count and direct children count', async () => {
    const root = await savePost({ author_id: 'u1', author_type: 'human', content: 'ROOT', reply_to_post_id: null });
    const postA = await savePost({ author_id: 'u1', author_type: 'human', content: 'A', reply_to_post_id: root.id });
    const postAA = await savePost({ author_id: 'u1', author_type: 'human', content: 'A.A', reply_to_post_id: postA.id });
    await savePost({ author_id: 'u1', author_type: 'human', content: 'A.A.A', reply_to_post_id: postAA.id }); // Deep descendant

    // Validate ROOT's reply count via standard DB getter
    const populatedRoot = await getPost(root.id);
    // Root has 1 direct child (A), but 3 total descendants (A, A.A, A.A.A).
    // Invariant: reply_count MUST equal exactly 1 (direct children).
    expect(populatedRoot?.reply_count).toBe(1);

    // Verify the UI contract over the API
    const req = new NextRequest(`http://localhost:3000/api/dreamx/posts?thread_id=${root.id}`);
    const res = await GET(req);
    const data = await res.json();

    // The displayed reply_count must exactly match the length of the replies array
    expect(data.target.reply_count).toBe(data.replies.length);
    expect(data.target.reply_count).toBe(1);
  });
});
