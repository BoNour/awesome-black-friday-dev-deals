// Reads and writes the deal files: deals/<id>.yml, one deal each.
import { readdirSync, readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { parseDealFile, dealFromFile, serializeDeal } from './lib.mjs';

const dir = new URL('../deals/', import.meta.url);
const NAME = /^([a-z0-9][a-z0-9-]{0,80})\.yml$/;

/** Every listed deal, in file-name order. */
export function readDeals() {
  let names = [];
  try { names = readdirSync(dir); } catch { return []; }
  return names
    .filter((f) => NAME.test(f))
    .sort()
    .map((f) => dealFromFile(f.match(NAME)[1], parseDealFile(readFileSync(new URL(f, dir), 'utf8'))));
}

/** Write one deal to its file, in the canonical shape. */
export function writeDeal(deal) {
  if (!NAME.test(`${deal.id}.yml`)) throw new Error(`Not a valid deal id: ${deal.id}`);
  mkdirSync(dir, { recursive: true });
  writeFileSync(new URL(`${deal.id}.yml`, dir), serializeDeal(deal));
}
