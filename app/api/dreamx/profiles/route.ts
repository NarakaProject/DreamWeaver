import { NextRequest, NextResponse } from 'next/server';
import { getProfiles, getProfile, getProfileByHandle, saveProfile, deleteProfile } from '@/lib/dreamx/db';
import { validateProfileImportPayload, executeProfileImport } from '@/lib/dreamx/import_export';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    const handle = searchParams.get('handle');

    if (handle) {
      const profile = await getProfileByHandle(handle);
      if (!profile) {
        return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
      }
      return NextResponse.json({ profile });
    }

    if (id) {
      const profile = await getProfile(id);
      if (!profile) {
        return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
      }
      return NextResponse.json({ profile });
    }

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

    // Bulk Validation Endpoint
    if (body.action === 'validate_import') {
      const existing = await getProfiles();
      const report = validateProfileImportPayload(body.payload, existing);
      return NextResponse.json({ report });
    }

    // Bulk Execution Endpoint
    if (body.action === 'execute_import') {
      const existing = await getProfiles();
      const report = validateProfileImportPayload(body.payload, existing);
      const result = await executeProfileImport(
        report,
        saveProfile,
        body.duplicate_mode || 'update',
        Boolean(body.allow_skip_invalid)
      );

      return NextResponse.json(result);
    }

    // Single Profile Creation/Edit Endpoint (preserved!)
    if (!body.display_name || !body.handle) {
      return NextResponse.json({ error: 'display_name and handle are required' }, { status: 400 });
    }

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
