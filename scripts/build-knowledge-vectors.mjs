#!/usr/bin/env node

import { createHash } from 'node:crypto';
import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const corpusPath = resolve(root, 'data/pleasure-pizza-knowledge.txt');
const outputPath = resolve(root, 'data/pleasure-pizza-knowledge-vectors.json');
const sourcePdfPath = process.argv[2];

if (!sourcePdfPath) {
  throw new Error('Usage: node scripts/build-knowledge-vectors.mjs /path/to/knowledge-base.pdf');
}

function tokenize(text) {
  return text
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .match(/[a-z0-9]+/g)
    ?.filter(token => token.length > 1) ?? [];
}

function round(value) {
  return Number(value.toFixed(8));
}

const corpus = await readFile(corpusPath, 'utf8');
const pages = corpus
  .split('\f')
  .map(text => text.trim())
  .filter(Boolean)
  .map((text, index) => ({
    id: `page-${String(index + 1).padStart(3, '0')}`,
    page: index + 1,
    title: text.split('\n').map(line => line.trim()).find(Boolean) ?? `Knowledge Base page ${index + 1}`,
    text,
  }));

const tokenCounts = pages.map(page => {
  const counts = new Map();
  for (const token of tokenize(page.text)) counts.set(token, (counts.get(token) ?? 0) + 1);
  return counts;
});

const documentFrequency = new Map();
for (const counts of tokenCounts) {
  for (const token of counts.keys()) documentFrequency.set(token, (documentFrequency.get(token) ?? 0) + 1);
}

const vocabulary = [...documentFrequency.keys()].sort();
const vocabularyIndex = new Map(vocabulary.map((token, index) => [token, index]));
const idf = vocabulary.map(token => Math.log((1 + pages.length) / (1 + documentFrequency.get(token))) + 1);

const chunks = pages.map((page, pageIndex) => {
  const unnormalized = [...tokenCounts[pageIndex]].map(([token, count]) => {
    const index = vocabularyIndex.get(token);
    return [index, (1 + Math.log(count)) * idf[index]];
  });
  const magnitude = Math.sqrt(unnormalized.reduce((sum, [, value]) => sum + value * value, 0)) || 1;
  return {
    ...page,
    vector: unnormalized
      .sort(([left], [right]) => left - right)
      .map(([index, value]) => [index, round(value / magnitude)]),
  };
});

const artifact = {
  schemaVersion: 1,
  algorithm: 'sparse-tfidf-cosine',
  source: sourcePdfPath.split('/').at(-1),
  sourceSha256: createHash('sha256')
    .update(await readFile(sourcePdfPath))
    .digest('hex'),
  corpusSha256: createHash('sha256').update(corpus).digest('hex'),
  pageCount: pages.length,
  chunkCount: chunks.length,
  chunking: 'one text-layer chunk per PDF page',
  tokenizer: 'Unicode NFKD, lowercase, ASCII alphanumeric tokens, minimum length 2',
  weighting: 'sublinear term frequency times smoothed inverse document frequency, L2 normalized',
  vocabulary,
  idf: idf.map(round),
  chunks,
};

await writeFile(outputPath, `${JSON.stringify(artifact)}\n`, 'utf8');
console.log(`Wrote ${chunks.length} page vectors across ${vocabulary.length} terms to ${outputPath}`);
