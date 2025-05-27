import { 
  users, userSettings, campaigns, generatedAds, apiUsage,
  type User, type InsertUser,
  type UserSettings, type InsertUserSettings,
  type Campaign, type InsertCampaign,
  type GeneratedAd, type InsertGeneratedAd,
  type ApiUsage, type InsertApiUsage
} from "@shared/schema";

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

export class MemStorage implements IStorage {
  private users: Map<number, User> = new Map();
  private userSettings: Map<number, UserSettings> = new Map();
  private campaigns: Map<number, Campaign> = new Map();
  private generatedAds: Map<number, GeneratedAd> = new Map();
  private apiUsage: Map<number, ApiUsage> = new Map();
  
  private currentUserId = 2;
  private currentUserSettingsId = 2;
  private currentCampaignId = 1;
  private currentGeneratedAdId = 1;
  private currentApiUsageId = 1;

  constructor() {
    // Create demo user
    const demoUser: User = {
      id: 1,
      email: "demo@example.com",
      googleId: null,
      googleAccessToken: null,
      googleRefreshToken: null,
      createdAt: new Date(),
    };
    this.users.set(1, demoUser);

    // Create demo settings
    const demoSettings: UserSettings = {
      id: 1,
      userId: 1,
      businessName: "AdWriter",
      businessLogo: null,
      openaiApiKey: null,
      openaiModel: "gpt-4o",
      autoSaveAds: true,
      emailNotifications: false,
      defaultVariations: 3,
      updatedAt: new Date(),
    };
    this.userSettings.set(1, demoSettings);
  }

  // User management
  async getUser(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(user => user.email === email);
  }

  async getUserByGoogleId(googleId: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(user => user.googleId === googleId);
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const user: User = {
      ...insertUser,
      id: this.currentUserId++,
      createdAt: new Date(),
    };
    this.users.set(user.id, user);
    return user;
  }

  async updateUser(id: number, updateData: Partial<InsertUser>): Promise<User | undefined> {
    const user = this.users.get(id);
    if (!user) return undefined;
    
    const updatedUser = { ...user, ...updateData };
    this.users.set(id, updatedUser);
    return updatedUser;
  }

  // User settings
  async getUserSettings(userId: number): Promise<UserSettings | undefined> {
    return Array.from(this.userSettings.values()).find(settings => settings.userId === userId);
  }

  async upsertUserSettings(settings: InsertUserSettings): Promise<UserSettings> {
    const existing = await this.getUserSettings(settings.userId);
    
    if (existing) {
      const updated: UserSettings = {
        ...existing,
        ...settings,
        updatedAt: new Date(),
      };
      this.userSettings.set(existing.id, updated);
      return updated;
    } else {
      const newSettings: UserSettings = {
        ...settings,
        id: this.currentUserSettingsId++,
        updatedAt: new Date(),
      };
      this.userSettings.set(newSettings.id, newSettings);
      return newSettings;
    }
  }

  // Campaigns
  async getCampaigns(userId: number): Promise<Campaign[]> {
    return Array.from(this.campaigns.values()).filter(campaign => campaign.userId === userId);
  }

  async getCampaign(id: number): Promise<Campaign | undefined> {
    return this.campaigns.get(id);
  }

  async createCampaign(insertCampaign: InsertCampaign): Promise<Campaign> {
    const campaign: Campaign = {
      ...insertCampaign,
      id: this.currentCampaignId++,
      createdAt: new Date(),
    };
    this.campaigns.set(campaign.id, campaign);
    return campaign;
  }

  async updateCampaign(id: number, updateData: Partial<InsertCampaign>): Promise<Campaign | undefined> {
    const campaign = this.campaigns.get(id);
    if (!campaign) return undefined;
    
    const updated = { ...campaign, ...updateData };
    this.campaigns.set(id, updated);
    return updated;
  }

  // Generated ads
  async getGeneratedAds(userId: number, campaignId?: number): Promise<GeneratedAd[]> {
    return Array.from(this.generatedAds.values()).filter(ad => {
      if (ad.userId !== userId) return false;
      if (campaignId && ad.campaignId !== campaignId) return false;
      return true;
    });
  }

  async createGeneratedAd(insertAd: InsertGeneratedAd): Promise<GeneratedAd> {
    const ad: GeneratedAd = {
      ...insertAd,
      id: this.currentGeneratedAdId++,
      createdAt: new Date(),
    };
    this.generatedAds.set(ad.id, ad);
    return ad;
  }

  async updateGeneratedAd(id: number, updateData: Partial<InsertGeneratedAd>): Promise<GeneratedAd | undefined> {
    const ad = this.generatedAds.get(id);
    if (!ad) return undefined;
    
    const updated = { ...ad, ...updateData };
    this.generatedAds.set(id, updated);
    return updated;
  }

  async deleteGeneratedAd(id: number): Promise<boolean> {
    return this.generatedAds.delete(id);
  }

  // API usage tracking
  async getApiUsage(userId: number, startDate?: Date, endDate?: Date): Promise<ApiUsage[]> {
    return Array.from(this.apiUsage.values()).filter(usage => {
      if (usage.userId !== userId) return false;
      if (startDate && usage.timestamp < startDate) return false;
      if (endDate && usage.timestamp > endDate) return false;
      return true;
    });
  }

  async createApiUsage(insertUsage: InsertApiUsage): Promise<ApiUsage> {
    const usage: ApiUsage = {
      ...insertUsage,
      id: this.currentApiUsageId++,
      timestamp: new Date(),
    };
    this.apiUsage.set(usage.id, usage);
    return usage;
  }

  async getApiUsageSummary(userId: number): Promise<{ today: string; month: string }> {
    const now = new Date();
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const todayUsage = await this.getApiUsage(userId, startOfDay);
    const monthUsage = await this.getApiUsage(userId, startOfMonth);

    const todayTotal = todayUsage.reduce((sum, usage) => sum + parseFloat(usage.cost), 0);
    const monthTotal = monthUsage.reduce((sum, usage) => sum + parseFloat(usage.cost), 0);

    return {
      today: `$${todayTotal.toFixed(2)}`,
      month: `$${monthTotal.toFixed(2)}`,
    };
  }
}

export const storage = new MemStorage();
