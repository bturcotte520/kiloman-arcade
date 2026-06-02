import { NextRequest, NextResponse } from 'next/server';
import { addScore, getTopScores, isAdminSecret } from '@/app/lib/scores';

export async function GET() {
  return NextResponse.json({ scores: await getTopScores() });
}

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null) as { initials?: unknown; score?: unknown; distance?: unknown } | null;
  const initials = typeof body?.initials === 'string' ? body.initials.trim().toUpperCase() : '';
  const score = typeof body?.score === 'number' ? Math.floor(body.score) : NaN;
  const distance = typeof body?.distance === 'number' ? Math.floor(body.distance) : NaN;

  if (!/^[A-Z]{2,5}$/.test(initials) || !Number.isFinite(score) || score < 0 || !Number.isFinite(distance) || distance < 0) {
    return NextResponse.json({ error: 'Invalid score payload' }, { status: 400 });
  }

  await addScore({ initials, score, distance });
  return NextResponse.json({ scores: await getTopScores() }, { status: 201 });
}

export async function DELETE(request: NextRequest) {
  const secret = request.headers.get('x-admin-secret');
  if (!isAdminSecret(secret)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  return NextResponse.json({ error: 'Score id required' }, { status: 400 });
}
