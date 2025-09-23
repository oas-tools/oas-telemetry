import { Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import logger from '../utils/logger.js';
import { OasTlmConfig } from "../config/config.types.js";

function generateAccessToken(secret: string, expiresIn: number) {
    return jwt.sign({ type: "access" }, secret, { expiresIn: Math.floor(expiresIn / 1000) });
}

function generateRefreshToken(secret: string, expiresIn: number) {
    return jwt.sign({ type: "refresh" }, secret, { expiresIn: Math.floor(expiresIn / 1000) });
}

export const getLogin = (oasTlmConfig: OasTlmConfig) => (req: Request, res: Response) => {
    if (!oasTlmConfig.auth.enabled) {
        res.status(200).json({ valid: true, message: "Auth disabled" });
        return;
    }
    try {
        const { password } = req.body;
        if (password === oasTlmConfig.auth.password) {
            const accessToken = generateAccessToken(
                oasTlmConfig.auth.jwtSecret as string,
                oasTlmConfig.auth.accessTokenMaxAge
            );
            const refreshToken = generateRefreshToken(
                oasTlmConfig.auth.jwtSecret as string,
                oasTlmConfig.auth.refreshTokenMaxAge
            );

            res.cookie("accessToken", accessToken, {
                maxAge: oasTlmConfig.auth.accessTokenMaxAge,
                httpOnly: true,
                secure: process.env.NODE_ENV === "production",
                sameSite: "lax",
                path: "/"
            });
            res.cookie("refreshToken", refreshToken, {
                maxAge: oasTlmConfig.auth.refreshTokenMaxAge,
                httpOnly: true,
                secure: process.env.NODE_ENV === "production",
                sameSite: "lax",
                path: oasTlmConfig.general.baseUrl + "/auth/refresh" // <-- cambiado de "/auth/refresh" a oasTlmConfig.general.baseUrl + "/auth/refresh"
            });

            res.status(200).json({ valid: true, message: "Login successful" });
            return;
        }
        res.status(400).json({ valid: false, message: "Invalid password" });
    } catch (error) {
        logger.error("Login error: ", error);
        res.status(500).json({ valid: false, message: "Internal server error" });
    }
};

export const getLogout = (oasTlmConfig: OasTlmConfig) => (req: Request, res: Response) => {
    if (!oasTlmConfig.auth.enabled) {
        res.status(200).json({ valid: true, message: "Auth disabled" });
        return;
    }
    res.clearCookie('accessToken', { path: '/' });
    res.clearCookie('refreshToken', { path: oasTlmConfig.general.baseUrl + '/auth/refresh' }); // <-- cambiado de "/auth/refresh" a oasTlmConfig.general.baseUrl + "/auth/refresh"
    res.status(200).json({ valid: true, message: "Logged out" });
};

export const getRefresh = (oasTlmConfig: OasTlmConfig) => (req: Request, res: Response) => {
    if (!oasTlmConfig.auth.enabled) {
        res.status(200).json({ valid: true, message: "Auth disabled" });
        return;
    }
    const refreshToken = req.cookies.refreshToken;
    if (!refreshToken) {
        res.status(401).json({ valid: false, message: "No refresh token" });
        return;
    }
    try {
        const payload = jwt.verify(refreshToken, oasTlmConfig.auth.jwtSecret as string) as any;
        if (payload.type !== "refresh") throw new Error("Invalid token type");
        const accessToken = generateAccessToken(
            oasTlmConfig.auth.jwtSecret as string,
            oasTlmConfig.auth.accessTokenMaxAge
        );
        res.cookie("accessToken", accessToken, {
            maxAge: oasTlmConfig.auth.accessTokenMaxAge,
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: "lax",
            path: "/"
        });
        res.status(200).json({ valid: true, message: "Refreshed" });
    } catch (err) {
        res.status(401).json({ valid: false, message: "Invalid refresh token" });
    }
};

export const getAuthEnabled = (oasTlmConfig: OasTlmConfig) => (req: Request, res: Response) => {
    res.status(200).json({ enabled: !!oasTlmConfig.auth.enabled });
};

