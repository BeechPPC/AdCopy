import { pgTable, text, serial, integer, boolean, timestamp, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  email: text("email").notNull().unique(),
  googleId: text("google_id").unique(),
  googleAccessToken: text("google_access_token"),
  googleRefreshToken: text("google_refresh_token"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const userSettings = pgTable("user_settings", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  businessName: text("business_name").default("AdWriter"),
  businessLogo: text("business_logo"),
  openaiApiKey: text("openai_api_key"),
  openaiModel: text("openai_model").default("gpt-4o"),
  autoSaveAds: boolean("auto_save_ads").default(true),
  emailNotifications: boolean("email_notifications").default(false),
  defaultVariations: integer("default_variations").default(3),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const campaigns = pgTable("campaigns", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  googleCampaignId: text("google_campaign_id").notNull(),
  name: text("name").notNull(),
  status: text("status").notNull(),
  targetKeywords: text("target_keywords").array(),
  businessDescription: text("business_description"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const generatedAds = pgTable("generated_ads", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  campaignId: integer("campaign_id").references(() => campaigns.id),
  headline: text("headline").notNull(),
  description: text("description").notNull(),
  displayUrl: text("display_url"),
  tone: text("tone"),
  focus: text("focus"),
  status: text("status").default("draft"), // draft, approved, rejected
  performance: jsonb("performance"), // CTR, impressions, etc.
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const apiUsage = pgTable("api_usage", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  service: text("service").notNull(), // openai, google-ads
  operation: text("operation").notNull(), // completion, keyword-research, etc.
  cost: text("cost").notNull(), // stored as string to avoid floating point issues
  tokens: integer("tokens"),
  model: text("model"),
  timestamp: timestamp("timestamp").defaultNow().notNull(),
});

// Insert schemas
export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true,
});

export const insertUserSettingsSchema = createInsertSchema(userSettings).omit({
  id: true,
  updatedAt: true,
});

export const insertCampaignSchema = createInsertSchema(campaigns).omit({
  id: true,
  createdAt: true,
});

export const insertGeneratedAdSchema = createInsertSchema(generatedAds).omit({
  id: true,
  createdAt: true,
});

export const insertApiUsageSchema = createInsertSchema(apiUsage).omit({
  id: true,
  timestamp: true,
});

// Types
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;

export type UserSettings = typeof userSettings.$inferSelect;
export type InsertUserSettings = z.infer<typeof insertUserSettingsSchema>;

export type Campaign = typeof campaigns.$inferSelect;
export type InsertCampaign = z.infer<typeof insertCampaignSchema>;

export type GeneratedAd = typeof generatedAds.$inferSelect;
export type InsertGeneratedAd = z.infer<typeof insertGeneratedAdSchema>;

export type ApiUsage = typeof apiUsage.$inferSelect;
export type InsertApiUsage = z.infer<typeof insertApiUsageSchema>;
