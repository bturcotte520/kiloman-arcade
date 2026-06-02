import postgres from 'postgres';

export interface StoredScore {
  id: string;
  initials: string;
  score: number;
  distance: number;
  date: string;
}

let client: postgres.Sql | null = null;

function sql() {
  if (!process.env.POSTGRES_URL) {
    throw new Error('POSTGRES_URL is required for persistent score storage');
  }

  client ??= postgres(process.env.POSTGRES_URL, { ssl: 'require' });
  return client;
}

function normalizeScore(row: {
  id: string;
  initials: string;
  score: number;
  distance: number;
  date: Date | string;
}): StoredScore {
  return {
    id: row.id,
    initials: row.initials,
    score: row.score,
    distance: row.distance,
    date: row.date instanceof Date ? row.date.toISOString() : row.date,
  };
}

export async function getTopScores() {
  const rows = await sql()<StoredScore[]>`
    select id, initials, score, distance, date
    from scores
    order by score desc, date asc
    limit 10
  `;
  return rows.map(normalizeScore);
}

export async function addScore(input: { initials: string; score: number; distance: number }) {
  const rows = await sql()<StoredScore[]>`
    insert into scores (initials, score, distance)
    values (${input.initials.slice(0, 5).toUpperCase()}, ${input.score}, ${input.distance})
    returning id, initials, score, distance, date
  `;
  return normalizeScore(rows[0]);
}

export async function deleteScore(id: string) {
  const rows = await sql()<Array<{ id: string }>>`
    delete from scores
    where id = ${id}
    returning id
  `;
  return rows.length > 0;
}

export function isAdminSecret(secret: string | null) {
  return Boolean(process.env.ADMIN_SECRET) && secret === process.env.ADMIN_SECRET;
}
