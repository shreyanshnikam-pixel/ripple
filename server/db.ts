/** One SQLite database (Node's built-in node:sqlite) for surveys, projects and classes. */
import fs from 'node:fs';
import path from 'node:path';
import { DatabaseSync } from 'node:sqlite';

const DB_PATH = process.env.DB_PATH ?? path.resolve('data/ripple.db');
fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });
export const db = new DatabaseSync(DB_PATH);

db.exec(`
  CREATE TABLE IF NOT EXISTS surveys (id TEXT PRIMARY KEY, key TEXT NOT NULL, def TEXT NOT NULL, created INTEGER NOT NULL);
  CREATE TABLE IF NOT EXISTS responses (
    id INTEGER PRIMARY KEY, survey TEXT NOT NULL, stance TEXT NOT NULL, grp TEXT, reason TEXT,
    voter TEXT NOT NULL, created INTEGER NOT NULL, UNIQUE (survey, voter)
  );
  CREATE INDEX IF NOT EXISTS responses_by_survey ON responses (survey);

  CREATE TABLE IF NOT EXISTS projects (
    id TEXT PRIMARY KEY, key TEXT NOT NULL, name TEXT NOT NULL, kind TEXT NOT NULL,
    join_code TEXT UNIQUE, created INTEGER NOT NULL
  );
  CREATE TABLE IF NOT EXISTS members (
    id INTEGER PRIMARY KEY, project TEXT NOT NULL, token TEXT NOT NULL UNIQUE, nickname TEXT NOT NULL,
    created INTEGER NOT NULL, UNIQUE (project, nickname)
  );
  CREATE TABLE IF NOT EXISTS items (
    id TEXT PRIMARY KEY, project TEXT NOT NULL, data TEXT NOT NULL, author TEXT, member INTEGER, created INTEGER NOT NULL
  );
  CREATE INDEX IF NOT EXISTS items_by_project ON items (project);
`);
