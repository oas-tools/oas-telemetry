import { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";
import { OasTlmConfig } from "../config/config.types.js";

export function getAuthMiddleware(oasTlmConfig: OasTlmConfig) {
  return function authMiddleware(req: Request, res: Response, next: NextFunction) {
    if (!oasTlmConfig.auth.enabled) {
      return next();
    }
    const token = req.cookies["oas-tlm-access-token"];
    if (!token) {
      res.status(401).json({ valid: false, message: "No access token" });
      return;
    }
    try {
      const payload = jwt.verify(token, oasTlmConfig.auth.jwtSecret) as any;
      if (payload.type !== "access") throw new Error("Invalid token type");
      return next();
    } catch {
      res.status(401).json({ valid: false, message: "Invalid access token" });
    }
  };
}