import { 
  users, userSettings, campaigns, generatedAds, apiUsage,
  type User, type InsertUser,
  type UserSettings, type InsertUserSettings,
  type Campaign, type InsertCampaign,
  type GeneratedAd, type InsertGeneratedAd,
  type ApiUsage, type InsertApiUsage
} from "@shared/schema";
import { db } from "./db";
import { eq, and } from "drizzle-orm";

export interface IStorage {
  // User management
  getUser(id: number): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  getUserByGoogleId(googleId: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: number, user: Partial<InsertUser>): Promise<User | undefined>;

  // User settings
  getUserSettings(userId: number): Promise<UserSettings | undefined>;
  upsertUserSettings(settings: InsertUserSettings): Promise<UserSettings>;

  // Campaigns
  getCampaigns(userId: number): Promise<Campaign[]>;
  getCampaign(id: number): Promise<Campaign | undefined>;
  createCampaign(campaign: InsertCampaign): Promise<Campaign>;
  updateCampaign(id: number, campaign: Partial<InsertCampaign>): Promise<Campaign | undefined>;

  // Generated ads
  getGeneratedAds(userId: number, campaignId?: number): Promise<GeneratedAd[]>;
  createGeneratedAd(ad: InsertGeneratedAd): Promise<GeneratedAd>;
  updateGeneratedAd(id: number, ad: Partial<InsertGeneratedAd>): Promise<GeneratedAd | undefined>;
  deleteGeneratedAd(id: number): Promise<boolean>;

  // API usage tracking
  getApiUsage(userId: number, startDate?: Date, endDate?: Date): Promise<ApiUsage[]>;
  createApiUsage(usage: InsertApiUsage): Promise<ApiUsage>;
  getApiUsageSummary(userId: number): Promise<{ today: string; month: string }>;
}

export class DatabaseStorage implements IStorage {
  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user || undefined;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user || undefined;
  }

  async getUserByGoogleId(googleId: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.googleId, googleId));
    return user || undefined;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(insertUser)
      .returning();
    return user;
  }

  async updateUser(id: number, updateData: Partial<InsertUser>): Promise<User | undefined> {
    const [user] = await db
      .update(users)
      .set(updateData)
      .where(eq(users.id, id))
      .returning();
    return user || undefined;
  }

  // User settings
  async getUserSettings(userId: number): Promise<UserSettings | undefined> {
    const [settings] = await db.select().from(userSettings).where(eq(userSettings.userId, userId));
    return settings || undefined;
  }

  async upsertUserSettings(settings: InsertUserSettings): Promise<UserSettings> {
    const existing = await this.getUserSettings(settings.userId);
    if (existing) {
      const [updated] = await db
        .update(userSettings)
        .set({ ...settings, updatedAt: new Date() })
        .where(eq(userSettings.id, existing.id))
        .returning();
      return updated;
    } else {
      const [newSettings] = await db
        .insert(userSettings)
        .values({ ...settings, updatedAt: new Date() })
        .returning();
      return newSettings;
    }
  }

  // Campaigns
  async getCampaigns(userId: number): Promise<Campaign[]> {
    return await db.select().from(campaigns).where(eq(campaigns.userId, userId));
  }

  async getCampaign(id: number): Promise<Campaign | undefined> {
    const [campaign] = await db.select().from(campaigns).where(eq(campaigns.id, id));
    return campaign || undefined;
  }

  async createCampaign(insertCampaign: InsertCampaign): Promise<Campaign> {
    const [campaign] = await db
      .insert(campaigns)
      .values({ ...insertCampaign, createdAt: new Date() })
      .returning();
    return campaign;
  }

  async updateCampaign(id: number, updateData: Partial<InsertCampaign>): Promise<Campaign | undefined> {
    const [campaign] = await db
      .update(campaigns)
      .set(updateData)
      .where(eq(campaigns.id, id))
      .returning();
    return campaign || undefined;
  }

  // Generated ads
  async getGeneratedAds(userId: number, campaignId?: number): Promise<GeneratedAd[]> {
    if (campaignId) {
      return await db.select().from(generatedAds)
        .where(and(eq(generatedAds.userId, userId), eq(generatedAds.campaignId, campaignId)));
    } else {
      return await db.select().from(generatedAds).where(eq(generatedAds.userId, userId));
    }
  }

  async createGeneratedAd(insertAd: InsertGeneratedAd): Promise<GeneratedAd> {
    const [ad] = await db
      .insert(generatedAds)
      .values({ ...insertAd, createdAt: new Date() })
      .returning();
    return ad;
  }

  async updateGeneratedAd(id: number, updateData: Partial<InsertGeneratedAd>): Promise<GeneratedAd | undefined> {
    const [ad] = await db
      .update(generatedAds)
      .set(updateData)
      .where(eq(generatedAds.id, id))
      .returning();
    return ad || undefined;
  }

  async deleteGeneratedAd(id: number): Promise<boolean> {
    const result = await db.delete(generatedAds).where(eq(generatedAds.id, id));
    return result.rowCount > 0;
  }

  // API usage tracking
  async getApiUsage(userId: number, startDate?: Date, endDate?: Date): Promise<ApiUsage[]> {
    const allUsage = await db.select().from(apiUsage).where(eq(apiUsage.userId, userId));
    
    let filteredUsage = allUsage;
    if (startDate) {
      filteredUsage = filteredUsage.filter(u => u.timestamp >= startDate);
    }
    if (endDate) {
      filteredUsage = filteredUsage.filter(u => u.timestamp <= endDate);
    }
    
    return filteredUsage;
  }

  async createApiUsage(insertUsage: InsertApiUsage): Promise<ApiUsage> {
    const [usage] = await db
      .insert(apiUsage)
      .values({ ...insertUsage, timestamp: new Date() })
      .returning();
    return usage;
  }

  async getApiUsageSummary(userId: number): Promise<{ today: string; month: string }> {
    const now = new Date();
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    
    const todayUsage = await this.getApiUsage(userId, startOfDay);
    const monthUsage = await this.getApiUsage(userId, startOfMonth);
    
    const todayTotal = todayUsage.reduce((sum, u) => sum + parseFloat(u.cost), 0);
    const monthTotal = monthUsage.reduce((sum, u) => sum + parseFloat(u.cost), 0);
    
    return {
      today: `$${todayTotal.toFixed(2)}`,
      month: `$${monthTotal.toFixed(2)}`,
    };
  }
}

export const storage = new DatabaseStorage();