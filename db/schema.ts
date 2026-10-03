// Intentionally empty by default.
// Add Drizzle tables here when the site actually needs a database.
// See examples/d1/db/schema.ts for an opt-in example.
import { sqliteTable, text, integer, real, primaryKey, index } from 'drizzle-orm/sqlite-core';
export const progress = sqliteTable('reading_progress', {
  userId: text('user_id').notNull(), slug: text('slug').notNull(), title: text('title').notNull(),
  chapter: text('chapter').notNull(), image: integer('image').notNull(), offset: real('offset').notNull(),
  start: real('range_start').notNull(), end: real('range_end').notNull(), updated: integer('updated').notNull(),
}, t => [primaryKey({columns:[t.userId,t.slug]}), index('progress_user_updated').on(t.userId,t.updated)]);
