#!/usr/bin/env node

import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const query = process.argv.slice(2).join(' ').trim();
if (!query) throw new Error('Usage: node scripts/search-knowledge-vectors.mjs <query>');

const artifactPath = resolve(import.meta.dirname, '..', 'data/pleasure-pizza-knowledge-vectors.json');
const artifact = JSON.parse(await readFile(artifactPath, 'utf8'));
const vocabularyIndex = new Map(artifact.vocabulary.map((token, index) => [token, index]));

const tokens = query
  .normalize('NFKD')
  .replace(/[\u0300-\u036f]/g, '')
  .toLowerCase()
  .match(/[a-z0-9]+/g)
  ?.filter(token => token.length > 1) ?? [];

const counts = new Map();
for (const token of tokens) {
  if (vocabularyIndex.has(token)) counts.set(token, (counts.get(token) ?? 0) + 1);
}

const rawQuery = [...counts].map(([token, count]) => {
  const index = vocabularyIndex.get(token);
  return [index, (1 + Math.log(count)) * artifact.idf[index]];
});
const magnitude = Math.sqrt(rawQuery.reduce((sum, [, value]) => sum + value * value, 0)) || 1;
const queryVector = new Map(rawQuery.map(([index, value]) => [index, value / magnitude]));

const matches = artifact.chunks
  .map(chunk => ({
    ...chunk,
    score: chunk.vector.reduce((sum, [index, value]) => sum + (queryVector.get(index) ?? 0) * value, 0),
  }))
  .filter(match => match.score > 0)
  .sort((left, right) => right.score - left.score || left.page - right.page)
  .slice(0, 5)
  .map(({ page, title, score, text }) => ({
    page,
    title,
    score: Number(score.toFixed(6)),
    snippet: text.replace(/\s+/g, ' ').slice(0, 240),
  }));

console.log(JSON.stringify({ query, matches }, null, 2));
