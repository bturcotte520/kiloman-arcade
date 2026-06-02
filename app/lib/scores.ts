import { mkdir, readFile, writeFile } from 'fs/promises';
import path from 'path';
import { randomUUID } from 'crypto';

export interface StoredScore {
  id: string;
  initials: string;
  score: number;
  distance: number;
  date: string;
}

const SCORES_FILE = path.join(process.cwd(), 'data', 'scores.json');

async function readScores(): Promise<StoredScore[]> {
  try {
    const contents = await readFile(SCORES_FILE, 'utf8');
    const parsed = JSON.parse(contents) as StoredScore[];
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    if (error instanceof Error && 'code' in error && error.code === 'ENOENT') {
      return [];
    }
    throw error;
  }
}

async function writeScores(scores: StoredScore[]) {
  await mkdir(path.dirname(SCORES_FILE), { recursive: true });
  await writeFile(SCORES_FILE, JSON.stringify(scores, null, 2));
}

export async function getTopScores() {
  const scores = await readScores();
  return scores.sort((a, b) => b.score - a.score).slice(0, 10);
}

export async function addScore(input: { initials: string; score: number; distance: number }) {
  const scores = await readScores();
  const entry: StoredScore = {
    id: randomUUID(),
    initials: input.initials.slice(0, 5).toUpperCase(),
    score: input.score,
    distance: input.distance,
    date: new Date().toISOString(),
  };
  const nextScores = [...scores, entry].sort((a, b) => b.score - a.score).slice(0, 100);
  await writeScores(nextScores);
  return entry;
}

export async function deleteScore(id: string) {
  const scores = await readScores();
  const nextScores = scores.filter((score) => score.id !== id);
  await writeScores(nextScores);
  return nextScores.length !== scores.length;
}

export function isAdminSecret(secret: string | null) {
  return Boolean(process.env.ADMIN_SECRET) && secret === process.env.ADMIN_SECRET;
}
