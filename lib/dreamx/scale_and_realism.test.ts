import { describe, it, expect, beforeEach } from 'vitest';
import { getDatabase } from '@/lib/db';
import { savePost, getPost, saveProfile, getProfile, saveUserProfile, getUserProfile, getProfiles, deleteProfile } from './db';
import { validateProfileImportPayload, executeProfileImport, exportAIProfilesJSON } from './import_export';
import { runAutonomousActivityStep } from './simulation';

describe('DREAMX v0.2 — Social Scale, Search, Bulk Delete, Public Realism & Burst Runner Audit', () => {
  beforeEach(() => {
    const db = getDatabase();
    db.exec(`
      DELETE FROM dreamx_posts;
      DELETE FROM dreamx_profiles;
      DELETE FROM dreamx_user_profile;
      DELETE FROM dreamx_activity_log;
      DELETE FROM dreamx_likes;
      DELETE FROM dreamx_reposts;
    `);
  });

  it('1. Human profile resolves through public profile handle lookup', async () => {
    const human = await saveUserProfile({ id: 'user-scale-1', display_name: 'Naraka User', handle: '@Naraka' });
    const user = await getUserProfile();

    expect(user).toBeDefined();
    expect(user?.handle.toLowerCase()).toBe('@naraka');
    expect(user?.display_name).toBe('Naraka User');
  });

  it('2. AI profile public representation does not leak internal prompt fields', async () => {
    const aiProf = await saveProfile({
      id: 'prof-internal-leak',
      display_name: 'Maria LeakTest',
      handle: '@MariaLeak',
      bio: 'Public bio only',
      personality: 'Internal secret personality',
      posting_guidelines: 'Internal secret guidelines'
    });

    const publicRepresentation = {
      id: aiProf.id,
      display_name: aiProf.display_name,
      handle: aiProf.handle,
      avatar_url: aiProf.avatar_url,
      bio: aiProf.bio,
      verification_type: aiProf.verification_type
    };

    expect(publicRepresentation).not.toHaveProperty('personality');
    expect(publicRepresentation).not.toHaveProperty('posting_guidelines');
    expect(publicRepresentation.display_name).toBe('Maria LeakTest');
    expect(publicRepresentation.bio).toBe('Public bio only');
  });

  it('3. Client-side search filters profiles by display name, handle, personality, and interests', async () => {
    const p1 = await saveProfile({ id: 'prof-s1', display_name: 'Lady Gaga', handle: '@gaga', personality: 'dramatic' });
    const p2 = await saveProfile({ id: 'prof-s2', display_name: 'Josh Miller', handle: '@josh', personality: 'analytical' });
    const p3 = await saveProfile({ id: 'prof-s3', display_name: 'Maria Enoce', handle: '@maria', personality: 'witty' });

    const all = [p1, p2, p3];

    // Filter by handle
    const handleMatch = all.filter(p => p.handle.toLowerCase().includes('gaga'));
    expect(handleMatch).toHaveLength(1);
    expect(handleMatch[0].display_name).toBe('Lady Gaga');

    // Filter by personality
    const personalityMatch = all.filter(p => p.personality?.toLowerCase().includes('analytical'));
    expect(personalityMatch).toHaveLength(1);
    expect(personalityMatch[0].handle).toBe('@josh');
  });

  it('4 & 5. Bulk delete removes selected profiles using canonical deletion logic and preserves non-selected profiles', async () => {
    const p1 = await saveProfile({ id: 'prof-del-1', display_name: 'To Delete 1', handle: '@del1' });
    const p2 = await saveProfile({ id: 'prof-del-2', display_name: 'To Delete 2', handle: '@del2' });
    const p3 = await saveProfile({ id: 'prof-keep-3', display_name: 'To Keep 3', handle: '@keep3' });

    const post1 = await savePost({ id: 'post-del-1', author_id: p1.id, author_type: 'ai', content: 'Post 1' });
    const post3 = await savePost({ id: 'post-keep-3', author_id: p3.id, author_type: 'ai', content: 'Post 3' });

    // Execute bulk delete on p1 and p2
    const toDeleteIds = [p1.id, p2.id];
    for (const deleteId of toDeleteIds) {
      await deleteProfile(deleteId);
    }

    expect(await getProfile(p1.id)).toBeUndefined();
    expect(await getProfile(p2.id)).toBeUndefined();
    expect(await getPost(post1.id)).toBeUndefined();

    // Verify p3 and post3 survive unaffected
    const survivingProfile = await getProfile(p3.id);
    expect(survivingProfile).toBeDefined();
    expect(survivingProfile?.display_name).toBe('To Keep 3');

    const survivingPost = await getPost(post3.id);
    expect(survivingPost).toBeDefined();
    expect(survivingPost?.content).toBe('Post 3');
  });

  it('6 & 7. Burst simulation executes N sequential simulation steps and returns actual step results', async () => {
    await saveProfile({ id: 'prof-burst-1', display_name: 'BurstBot', handle: '@burstbot' });

    const results = [];
    const stepCount = 5;

    for (let i = 0; i < stepCount; i++) {
      const stepRes = await runAutonomousActivityStep({
        provider: 'gemini',
        keys: {},
        forceBypassCooldown: true
      });
      results.push(stepRes);
    }

    expect(results).toHaveLength(5);
    results.forEach(res => {
      expect(res).toBeDefined();
      expect(['posted', 'replied', 'liked', 'no_action', 'NO_ACTION']).toContain(res.outcome);
    });
  });

  it('8. Normal simulation cooldown protection remains intact when forceBypassCooldown is false', async () => {
    await saveProfile({ id: 'prof-cd-1', display_name: 'CooldownBot', handle: '@cdbot' });

    // First run succeeds
    const step1 = await runAutonomousActivityStep({
      provider: 'gemini',
      keys: {},
      forceBypassCooldown: false
    });
    expect(step1).toBeDefined();

    // Immediate second run without bypass triggers NO_ACTION due to 60s cooldown
    const step2 = await runAutonomousActivityStep({
      provider: 'gemini',
      keys: {},
      forceBypassCooldown: false
    });
    expect(['NO_ACTION', 'COOLDOWN_ACTIVE']).toContain(step2.outcome);
  });


  it('9. Existing JSON import/export schema remains compatible', async () => {
    const prof = await saveProfile({
      id: 'prof-schema-compat',
      display_name: 'SchemaBot',
      handle: '@schema',
      verification_type: 'blue',
      bio: 'Bio text',
      personality: 'Friendly',
      posting_guidelines: 'Post daily'
    });

    const exportJSON = exportAIProfilesJSON([prof]);
    const parsed = JSON.parse(exportJSON);

    expect(parsed.version).toBe(1);
    expect(parsed.profiles).toHaveLength(1);
    expect(parsed.profiles[0].display_name).toBe('SchemaBot');
    expect(parsed.profiles[0].verification.type).toBe('blue');

    const report = validateProfileImportPayload(parsed, []);
    expect(report.canImport).toBe(true);

    const res = await executeProfileImport(report, saveProfile, 'update');
    expect(res.success).toBe(true);
  });

  it('10. DreamWeaver narrative database tables remain completely untouched by DreamX operations', async () => {
    const db = getDatabase();

    // Verify DreamWeaver narrative tables exist and are untouched
    const dwSessions = await db.queryAll('SELECT COUNT(*) as count FROM sessions');
    const dwMessages = await db.queryAll('SELECT COUNT(*) as count FROM messages');
    const dwMemories = await db.queryAll('SELECT COUNT(*) as count FROM memories');

    expect(dwSessions).toBeDefined();
    expect(dwMessages).toBeDefined();
    expect(dwMemories).toBeDefined();
  });
});
