import { int, mysqlEnum, mysqlTable, text, timestamp, varchar, longtext } from "drizzle-orm/mysql-core";

export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

export const codeSubmissions = mysqlTable("code_submissions", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId"),
  problemTitle: varchar("problemTitle", { length: 255 }).notNull(),
  language: varchar("language", { length: 32 }).notNull(),
  code: longtext("code").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type CodeSubmission = typeof codeSubmissions.$inferSelect;
export type InsertCodeSubmission = typeof codeSubmissions.$inferInsert;
