import { Request, Response, NextFunction } from "express";
import { storage } from "../storage";

export interface AuthenticatedRequest extends Request {
  user?: any;
}

export async function authenticateUser(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    console.log("Authenticating user...");
    
    // For demo purposes, always authenticate as the demo user
    // In production, this would validate JWT tokens or session cookies
    const demoUser = await storage.getUser(1);
    console.log("Demo user found:", demoUser);
    
    if (demoUser) {
      req.user = demoUser;
      return next();
    }
    
    console.log("Demo user not found, creating new user...");
    // If demo user doesn't exist, create it
    const newUser = await storage.createUser({
      email: "demo@example.com",
      googleId: null,
      googleAccessToken: null,
      googleRefreshToken: null
    });
    
    console.log("New user created:", newUser);
    req.user = newUser;
    next();
  } catch (error) {
    console.error("Authentication error:", error);
    res.status(401).json({ error: "Invalid user" });
  }
}

export async function optionalAuth(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const userId = req.headers['x-user-id'] as string;
    
    if (userId) {
      const user = await storage.getUser(parseInt(userId));
      if (user) {
        req.user = user;
      }
    }
    
    next();
  } catch (error) {
    next();
  }
}
