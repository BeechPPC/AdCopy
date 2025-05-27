import { Request, Response, NextFunction } from "express";
import { storage } from "../storage";

export interface AuthenticatedRequest extends Request {
  user?: any;
}

export async function authenticateUser(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    // For demo purposes, we'll use a simple user ID in headers
    // In production, this would validate JWT tokens or session cookies
    const userId = req.headers['x-user-id'] as string;
    
    if (!userId) {
      return res.status(401).json({ error: "Authentication required" });
    }

    const user = await storage.getUser(parseInt(userId));
    if (!user) {
      return res.status(401).json({ error: "Invalid user" });
    }

    req.user = user;
    next();
  } catch (error) {
    res.status(500).json({ error: "Authentication error" });
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
