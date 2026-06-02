import { NextRequest, NextResponse } from 'next/server';
import { deleteScore, getTopScores, isAdminSecret } from '@/app/lib/scores';

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function DELETE(request: NextRequest, context: RouteContext) {
  const secret = request.headers.get('x-admin-secret');
  if (!isAdminSecret(secret)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await context.params;
  const deleted = await deleteScore(id);
  if (!deleted) {
    return NextResponse.json({ error: 'Score not found' }, { status: 404 });
  }

  return NextResponse.json({ scores: await getTopScores() });
}
