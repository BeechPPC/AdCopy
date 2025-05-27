import type { Express } from "express";
import express from "express";
import { createServer, type Server } from "http";
import multer from "multer";
import path from "path";
import { storage } from "./storage";
import { authenticateUser, optionalAuth, type AuthenticatedRequest } from "./middleware/auth";
import { generateAdCopy, validateApiKey } from "./lib/openai";
import { GoogleAdsClient } from "./lib/google-ads";
import { insertUserSettingsSchema, insertCampaignSchema, insertGeneratedAdSchema, insertApiUsageSchema } from "@shared/schema";
import fs from 'fs';

// Ensure uploads directory exists
const uploadsDir = path.join(process.cwd(), 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Configure multer for file uploads
const upload = multer({
  dest: uploadsDir,
  limits: { fileSize: 2 * 1024 * 1024 }, // 2MB limit
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    
    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Only image files (JPEG, JPG, PNG, GIF) are allowed'));
    }
  }
});

export async function registerRoutes(app: Express): Promise<Server> {
  
  // Auth routes
  app.post("/api/auth/demo-login", async (req, res) => {
    try {
      const { email } = req.body;
      
      let user = await storage.getUserByEmail(email);
      if (!user) {
        user = await storage.createUser({ 
          email,
          googleId: null,
          googleAccessToken: null,
          googleRefreshToken: null
        });
        
        // Create default settings
        await storage.upsertUserSettings({
          userId: user.id,
          businessName: "AdWriter",
          businessLogo: null,
          openaiApiKey: null,
          openaiModel: "gpt-4o",
          autoSaveAds: true,
          emailNotifications: false,
          defaultVariations: 3
        });
      }
      
      res.json({ user, token: user.id.toString() });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/auth/google", (req, res) => {
    const authUrl = GoogleAdsClient.getAuthUrl();
    res.json({ authUrl });
  });

  app.post("/api/auth/google/callback", authenticateUser, async (req: AuthenticatedRequest, res) => {
    try {
      const { code } = req.body;
      const tokens = await GoogleAdsClient.exchangeCodeForTokens(code);
      
      await storage.updateUser(req.user.id, {
        googleAccessToken: tokens.access_token,
        googleRefreshToken: tokens.refresh_token
      });
      
      res.json({ success: true });
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  });

  // User settings routes
  app.get("/api/settings", authenticateUser, async (req: AuthenticatedRequest, res) => {
    try {
      const settings = await storage.getUserSettings(req.user.id);
      res.json(settings);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  app.put("/api/settings", authenticateUser, async (req: AuthenticatedRequest, res) => {
    try {
      console.log('Updating settings for user:', req.user.id);
      console.log('Request body:', req.body);
      
      const validatedData = insertUserSettingsSchema.parse({
        ...req.body,
        userId: req.user.id
      });
      
      console.log('Validated data:', validatedData);
      
      const settings = await storage.upsertUserSettings(validatedData);
      console.log('Settings updated successfully:', settings);
      
      res.json(settings);
    } catch (error: any) {
      console.error('Settings update error:', {
        error: error.message,
        stack: error.stack,
        body: req.body,
        userId: req.user.id
      });
      
      if (error.name === 'ZodError') {
        return res.status(400).json({ 
          error: "Invalid settings data", 
          details: error.errors 
        });
      }
      
      res.status(500).json({ 
        error: "Failed to update settings. Please try again.",
        details: error.message 
      });
    }
  });

  app.post("/api/settings/logo", authenticateUser, upload.single('logo'), async (req: AuthenticatedRequest, res) => {
    try {
      console.log('Logo upload request received for user:', req.user.id);
      
      if (!req.file) {
        console.log('No file in request');
        return res.status(400).json({ error: "No file uploaded" });
      }

      console.log('File details:', {
        originalname: req.file.originalname,
        size: req.file.size,
        mimetype: req.file.mimetype,
        path: req.file.path
      });

      // Validate file size
      if (req.file.size > 2 * 1024 * 1024) {
        console.log('File too large:', req.file.size);
        fs.unlinkSync(req.file.path); // Delete the file
        return res.status(400).json({ error: "File size must be less than 2MB" });
      }

      // Generate a unique filename
      const ext = path.extname(req.file.originalname);
      const filename = `${Date.now()}-${Math.random().toString(36).substring(7)}${ext}`;
      const newPath = path.join(uploadsDir, filename);

      console.log('Moving file to:', newPath);

      // Move the file to its final location
      fs.renameSync(req.file.path, newPath);
      
      const logoPath = `/uploads/${filename}`;
      console.log('Logo path:', logoPath);
      
      const settings = await storage.upsertUserSettings({
        userId: req.user.id,
        businessLogo: logoPath
      });
      
      if (!settings) {
        throw new Error('Failed to update settings with new logo path');
      }
      
      console.log('Settings updated with new logo:', settings);
      
      res.json({ logoPath });
    } catch (error: any) {
      console.error('Logo upload error:', {
        error: error.message,
        stack: error.stack,
        file: req.file ? {
          originalname: req.file.originalname,
          size: req.file.size,
          mimetype: req.file.mimetype,
          path: req.file.path
        } : null,
        userId: req.user.id
      });
      
      // Clean up the uploaded file if it exists
      if (req.file?.path && fs.existsSync(req.file.path)) {
        try {
          fs.unlinkSync(req.file.path);
          console.log('Cleaned up temporary file:', req.file.path);
        } catch (cleanupError: any) {
          console.error('Error cleaning up file:', cleanupError.message);
        }
      }
      
      res.status(500).json({ 
        error: "Failed to upload logo. Please try again.",
        details: error.message 
      });
    }
  });

  app.post("/api/settings/validate-openai", authenticateUser, async (req: AuthenticatedRequest, res) => {
    try {
      const { apiKey } = req.body;
      const isValid = await validateApiKey(apiKey);
      res.json({ valid: isValid });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  // Campaigns routes
  app.get("/api/campaigns", authenticateUser, async (req: AuthenticatedRequest, res) => {
    try {
      if (req.user.googleAccessToken) {
        const googleAds = new GoogleAdsClient(req.user.googleAccessToken);
        const googleCampaigns = await googleAds.getCampaigns();
        
        // Sync with local storage
        for (const gCampaign of googleCampaigns) {
          const existing = await storage.getCampaigns(req.user.id);
          const found = existing.find(c => c.googleCampaignId === gCampaign.id);
          
          if (!found) {
            await storage.createCampaign({
              userId: req.user.id,
              googleCampaignId: gCampaign.id,
              name: gCampaign.name,
              status: gCampaign.status,
              targetKeywords: gCampaign.targetKeywords || [],
              businessDescription: null
            });
          }
        }
      }
      
      const campaigns = await storage.getCampaigns(req.user.id);
      res.json(campaigns);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/campaigns/:id", authenticateUser, async (req: AuthenticatedRequest, res) => {
    try {
      const campaign = await storage.getCampaign(parseInt(req.params.id));
      if (!campaign || campaign.userId !== req.user.id) {
        return res.status(404).json({ error: "Campaign not found" });
      }
      res.json(campaign);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  // Ad generation routes
  app.post("/api/ads/generate", authenticateUser, async (req: AuthenticatedRequest, res) => {
    try {
      const { campaignId, businessDescription, landingPageUrl, targetKeywords, tone, focus, variations } = req.body;
      
      const settings = await storage.getUserSettings(req.user.id);
      if (!settings?.openaiApiKey && !process.env.OPENAI_API_KEY) {
        return res.status(400).json({ error: "OpenAI API key not configured" });
      }
      
      const result = await generateAdCopy(settings.openaiApiKey || process.env.OPENAI_API_KEY, settings.openaiModel || "gpt-4o", {
        businessDescription,
        landingPageUrl,
        targetKeywords,
        tone,
        focus,
        variations: variations || settings.defaultVariations
      });
      
      // Track API usage
      await storage.createApiUsage({
        userId: req.user.id,
        service: "openai",
        operation: "ad_generation",
        cost: result.cost.toString(),
        tokens: result.tokens,
        model: settings.openaiModel
      });
      
      // Save generated ads if auto-save is enabled
      if (settings.autoSaveAds) {
        for (const ad of result.ads) {
          await storage.createGeneratedAd({
            userId: req.user.id,
            campaignId: campaignId || null,
            headline: ad.headline,
            description: ad.description,
            displayUrl: ad.displayUrl,
            tone,
            focus,
            status: "draft"
          });
        }
      }
      
      res.json(result);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/ads", authenticateUser, async (req: AuthenticatedRequest, res) => {
    try {
      const campaignId = req.query.campaignId ? parseInt(req.query.campaignId as string) : undefined;
      const ads = await storage.getGeneratedAds(req.user.id, campaignId);
      res.json(ads);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  app.put("/api/ads/:id", authenticateUser, async (req: AuthenticatedRequest, res) => {
    try {
      const ad = await storage.updateGeneratedAd(parseInt(req.params.id), req.body);
      if (!ad) {
        return res.status(404).json({ error: "Ad not found" });
      }
      res.json(ad);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  app.delete("/api/ads/:id", authenticateUser, async (req: AuthenticatedRequest, res) => {
    try {
      const success = await storage.deleteGeneratedAd(parseInt(req.params.id));
      if (!success) {
        return res.status(404).json({ error: "Ad not found" });
      }
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  // API usage routes
  app.get("/api/usage", authenticateUser, async (req: AuthenticatedRequest, res) => {
    try {
      const summary = await storage.getApiUsageSummary(req.user.id);
      res.json(summary);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/usage/detailed", authenticateUser, async (req: AuthenticatedRequest, res) => {
    try {
      const { startDate, endDate } = req.query;
      const start = startDate ? new Date(startDate as string) : undefined;
      const end = endDate ? new Date(endDate as string) : undefined;
      
      const usage = await storage.getApiUsage(req.user.id, start, end);
      res.json(usage);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  // Optimization suggestions
  app.get("/api/optimization/suggestions", authenticateUser, async (req: AuthenticatedRequest, res) => {
    try {
      const { AdOptimizer } = await import("./lib/optimization");
      const optimizer = new AdOptimizer();
      const suggestions = await optimizer.getOptimizationSuggestions(req.user.id);
      res.json({ suggestions });
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch optimization suggestions" });
    }
  });

  // Serve uploaded files
  app.use('/uploads', express.static('uploads'));

  const httpServer = createServer(app);
  return httpServer;
}
