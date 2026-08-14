import { NextResponse } from 'next/server';
import { getAnalyticsData } from '@/lib/dreamx/analytics';

export async function GET() {
  try {
    const data = await getAnalyticsData();
    return NextResponse.json({ success: true, data });
  } catch (err: any) {
    console.error('Analytics fetch failed:', err);
    return NextResponse.json(
      { success: false, error: err.message || 'Failed to fetch analytics' },
      { status: 500 }
    );
  }
}
