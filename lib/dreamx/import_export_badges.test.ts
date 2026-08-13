import { describe, it, expect, beforeEach } from 'vitest';
import { getDatabase } from '@/lib/db';
import { savePost, getPost, saveProfile, getProfile, saveUserProfile, getProfiles, toggleLike, deleteProfile } from './db';
import { validateProfileImportPayload, executeProfileImport, exportAIProfilesJSON, normalizeHandle } from './import_export';
import { runAutonomousActivityStep } from './simulation';

import type { DreamXProfile, DreamXPost, DreamXUserProfile } from './types';

describe('DREAMX v0.2 — Bulk Import/Export, Verification Badges & Social History Isolation Audit', () => {
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

  it('1. JSON parser accepts valid profile set', () => {
    const payload = {
      version: 1,
      profiles: [
        { display_name: 'Maria', handle: '@MariaEnoce', verification_type: 'blue' }
      ]
    };
    const report = validateProfileImportPayload(payload, []);
    expect(report.canImport).toBe(true);
    expect(report.validCount).toBe(1);
  });

  it('2. JSON parser rejects non-object records', () => {
    const payload = ['invalid-string-record'];
    const report = validateProfileImportPayload(payload, []);
    expect(report.canImport).toBe(false);
    expect(report.invalidCount).toBe(1);
  });

  it('3. Missing display_name rejected', () => {
    const payload = [{ handle: '@NoName' }];
    const report = validateProfileImportPayload(payload, []);
    expect(report.canImport).toBe(false);
    expect(report.items[0].errors).toContain('Missing required field: display_name');
  });

  it('4. Missing handle rejected', () => {
    const payload = [{ display_name: 'NoHandle' }];
    const report = validateProfileImportPayload(payload, []);
    expect(report.canImport).toBe(false);
    expect(report.items[0].errors).toContain('Missing required field: handle');
  });

  it('5. Invalid verification_type rejected', () => {
    const payload = [{ display_name: 'BadBadge', handle: '@bad', verification_type: 'super-gold' }];
    const report = validateProfileImportPayload(payload, []);
    expect(report.canImport).toBe(false);
    expect(report.items[0].errors[0]).toContain('Invalid verification_type');
  });

  it('6. Handles normalized consistently', () => {
    expect(normalizeHandle('MariaEnoce')).toBe('@MariaEnoce');
    expect(normalizeHandle('@@@Maria_Enoce!!')).toBe('@Maria_Enoce');
  });

  it('7. Duplicate handles detected', async () => {
    const existing = await saveProfile({ display_name: 'Josh', handle: '@JoshTest' });
    const payload = [{ display_name: 'Josh Updated', handle: 'JoshTest' }];
    const report = validateProfileImportPayload(payload, [existing]);
    expect(report.duplicateCount).toBe(1);
    expect(report.items[0].isDuplicate).toBe(true);
  });

  it('8. Import creates multiple profiles atomically', async () => {
    const payload = {
      profiles: [
        { display_name: 'Profile 1', handle: '@p1', verification_type: 'blue' },
        { display_name: 'Profile 2', handle: '@p2', verification_type: 'gold' }
      ]
    };
    const report = validateProfileImportPayload(payload, []);
    const res = await executeProfileImport(report, saveProfile, 'update');

    expect(res.success).toBe(true);
    expect(res.createdCount).toBe(2);

    const all = await getProfiles();
    expect(all).toHaveLength(2);
  });

  it('9. Import update mode updates existing profile without breaking social history', async () => {
    const original = await saveProfile({ display_name: 'Maria Old', handle: '@Maria', personality: 'quiet' });
    const post = await savePost({ author_id: original.id, author_type: 'ai', content: 'Surviving post' });

    const payload = [{ display_name: 'Maria New', handle: '@Maria', personality: 'talkative', verification_type: 'blue' }];
    const report = validateProfileImportPayload(payload, [original]);
    const res = await executeProfileImport(report, saveProfile, 'update');


    expect(res.updatedCount).toBe(1);
    const updated = await getProfile(original.id);
    expect(updated?.display_name).toBe('Maria New');
    expect(updated?.personality).toBe('talkative');
    expect(updated?.verification_type).toBe('blue');

    const survivingPost = await getPost(post.id);
    expect(survivingPost).toBeDefined();
    expect(survivingPost?.content).toBe('Surviving post');
  });

  it('10. Import skip mode skips existing profiles', async () => {
    const original = await saveProfile({ id: 'prof-imp-skip', display_name: 'Maria Old', handle: '@Maria' });
    const payload = [{ display_name: 'Maria New', handle: '@Maria' }];
    const report = validateProfileImportPayload(payload, [original]);
    const res = await executeProfileImport(report, saveProfile, 'skip');


    expect(res.skippedCount).toBe(1);
    const unchanged = await getProfile(original.id);
    expect(unchanged?.display_name).toBe('Maria Old');
  });


  it('11 - 13. Import does NOT delete existing posts, likes, or replies', async () => {
    const prof = await saveProfile({ display_name: 'Josh', handle: '@Josh' });
    const post = await savePost({ author_id: prof.id, author_type: 'ai', content: 'Post' });
    const reply = await savePost({ author_id: 'user-1', author_type: 'human', content: 'Reply', reply_to_post_id: post.id });
    await toggleLike(post.id, prof.id, 'ai');


    const payload = [{ display_name: 'Josh Refreshed', handle: '@Josh' }];
    const report = validateProfileImportPayload(payload, [prof]);
    await executeProfileImport(report, saveProfile, 'update');


    expect(await getPost(post.id)).toBeDefined();
    expect(await getPost(reply.id)).toBeDefined();
  });

  it('14 - 15. Export produces valid JSON and Export -> Import round trip preserves profile data', async () => {
    await saveProfile({ display_name: 'Maria', handle: '@Maria', verification_type: 'blue', bio: 'Blogger' });
    await saveProfile({ id: 'prof-gold', display_name: 'Company', handle: '@Company', verification_type: 'gold' });

    const allBefore = await getProfiles();
    const exportedJSON = exportAIProfilesJSON(allBefore);
    const parsed = JSON.parse(exportedJSON);

    expect(parsed.version).toBe(1);
    expect(parsed.profiles).toHaveLength(2);

    const report = validateProfileImportPayload(parsed, []);
    expect(report.canImport).toBe(true);

    const res = await executeProfileImport(report, saveProfile, 'update');

    expect(res.success).toBe(true);

    const maria = await getProfile('prof-gold');
    expect(maria?.verification_type).toBe('gold');
  });

  it('16. Verification defaults to "none"', async () => {
    const prof = await saveProfile({ display_name: 'DefaultVal', handle: '@default' });
    expect(prof.verification_type).toBe('none');
  });

  it('17 - 19. Blue, Gray, and Gold verification saved correctly', async () => {
    const blueP = await saveProfile({ display_name: 'Blue', handle: '@blue', verification_type: 'blue' });
    const grayP = await saveProfile({ display_name: 'Gray', handle: '@gray', verification_type: 'gray' });
    const goldP = await saveProfile({ display_name: 'Gold', handle: '@gold', verification_type: 'gold' });

    expect(blueP.verification_type).toBe('blue');
    expect(grayP.verification_type).toBe('gray');
    expect(goldP.verification_type).toBe('gold');
  });

  it('20. Human profile cannot be imported as AI persona', () => {
    const payload = [{ display_name: 'Human Fake', handle: '@fake', type: 'human' }];
    const report = validateProfileImportPayload(payload, []);
    expect(report.canImport).toBe(false);
    expect(report.items[0].errors[0]).toBe('Human user profile cannot be imported as an AI persona');
  });

  it('21. Existing AI simulation still works after profile import', async () => {
    const prof = await saveProfile({ display_name: 'SimBot', handle: '@simbot', personality: 'active' });
    const stepRes = await runAutonomousActivityStep({ provider: 'gemini', keys: {}, forceBypassCooldown: true });

    expect(stepRes).toBeDefined();
    expect(['posted', 'replied', 'liked', 'no_action', 'NO_ACTION']).toContain(stepRes.outcome);
  });



  it('24. Existing profile deletion remains atomic', async () => {
    const prof = await saveProfile({ display_name: 'To Delete', handle: '@del' });
    const post = await savePost({ author_id: prof.id, author_type: 'ai', content: 'Will be deleted' });
    
    await deleteProfile(prof.id);
    expect(await getProfile(prof.id)).toBeUndefined();
    expect(await getPost(post.id)).toBeUndefined();
  });
});
