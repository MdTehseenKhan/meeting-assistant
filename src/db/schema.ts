import { sql } from "drizzle-orm";
import { text, integer, sqliteTable } from "drizzle-orm/sqlite-core";

export const scheduledTasksTable = sqliteTable("scheduled_tasks", {
  id: integer().primaryKey({ autoIncrement: true }),
  name: text().notNull(),
  type: text().notNull(), // 'follow-up'
  status: text().notNull().default("pending"), // 'pending' | 'running' | 'completed' | 'failed'
  scheduledFor: text().notNull(), // ISO datetime
  payload: text().notNull(), // JSON: { threadId, message }
  createdAt: text().default(sql`(datetime('now'))`),
  updatedAt: text().default(sql`(datetime('now'))`),
});