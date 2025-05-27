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
  createUser(data: InsertUser): Promise<User>;
  updateUser(id: number, data: Partial<InsertUser>): Promise<User | undefined>;

  // User settings
  getUserSettings(userId: number): Promise<UserSettings | undefined>;
  upsertUserSettings(data: InsertUserSettings): Promise<UserSettings>;

  // Campaigns
  getCampaigns(userId: number): Promise<Campaign[]>;
  getCampaign(id: number): Promise<Campaign | undefined>;
  createCampaign(data: InsertCampaign): Promise<Campaign>;
  updateCampaign(id: number, data: Partial<InsertCampaign>): Promise<Campaign | undefined>;

  // Generated ads
  getGeneratedAds(userId: number, campaignId?: number): Promise<GeneratedAd[]>;
  createGeneratedAd(data: InsertGeneratedAd): Promise<GeneratedAd>;
  updateGeneratedAd(id: number, data: Partial<InsertGeneratedAd>): Promise<GeneratedAd | undefined>;
  deleteGeneratedAd(id: number): Promise<boolean>;

  // API usage tracking
  getApiUsage(userId: number, startDate?: Date, endDate?: Date): Promise<ApiUsage[]>;
  createApiUsage(data: InsertApiUsage): Promise<ApiUsage>;
  getApiUsageSummary(userId: number): Promise<ApiUsageSummary>;
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

  async createUser(data: InsertUser): Promise<User> {
    const [user] = await db.insert(users).values(data).returning();
    if (!user) {
      throw new Error('Failed to create user');
    }
    return user;
  }

  async updateUser(id: number, data: Partial<InsertUser>): Promise<User | undefined> {
    const [user] = await db
      .update(users)
      .set(data)
      .where(eq(users.id, id))
      .returning();
    return user || undefined;
  }

  // User settings
  async getUserSettings(userId: number): Promise<UserSettings | undefined> {
    const [settings] = await db
      .select()
      .from(userSettings)
      .where(eq(userSettings.userId, userId));
    return settings || undefined;
  }

  async upsertUserSettings(data: InsertUserSettings): Promise<UserSettings> {
    const [settings] = await db
      .insert(userSettings)
      .values(data)
      .onConflictDoUpdate({
        target: userSettings.userId,
        set: {
          businessName: data.businessName,
          businessLogo: data.businessLogo,
          openaiApiKey: data.openaiApiKey,
          openaiModel: data.openaiModel,
          autoSaveAds: data.autoSaveAds,
          emailNotifications: data.emailNotifications,
          defaultVariations: data.defaultVariations,
          updatedAt: new Date()
        }
      })
      .returning();

    if (!settings) {
      throw new Error('Failed to upsert user settings');
    }

    return settings;
  }

  // Campaigns
  async getCampaigns(userId: number): Promise<Campaign[]> {
    return await db.select().from(campaigns).where(eq(campaigns.userId, userId));
  }

  async getCampaign(id: number): Promise<Campaign | undefined> {
    const [campaign] = await db.select().from(campaigns).where(eq(campaigns.id, id));
    return campaign || undefined;
  }

  async createCampaign(data: InsertCampaign): Promise<Campaign> {
    const [campaign] = await db
      .insert(campaigns)
      .values({ ...data, createdAt: new Date() })
      .returning();
    return campaign;
  }

  async updateCampaign(id: number, data: Partial<InsertCampaign>): Promise<Campaign | undefined> {
    const [campaign] = await db
      .update(campaigns)
      .set(data)
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

  async createGeneratedAd(data: InsertGeneratedAd): Promise<GeneratedAd> {
    const [ad] = await db
      .insert(generatedAds)
      .values({ ...data, createdAt: new Date() })
      .returning();
    return ad;
  }

  async updateGeneratedAd(id: number, data: Partial<InsertGeneratedAd>): Promise<GeneratedAd | undefined> {
    const [ad] = await db
      .update(generatedAds)
      .set(data)
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

  async createApiUsage(data: InsertApiUsage): Promise<ApiUsage> {
    const [usage] = await db
      .insert(apiUsage)
      .values({ ...data, timestamp: new Date() })
      .returning();
    return usage;
  }

  async getApiUsageSummary(userId: number): Promise<ApiUsageSummary> {
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