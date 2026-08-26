import { Request, Response, NextFunction } from "express";
import { createRemoteJWKSet, jwtVerify } from "jose";

const JWKS = createRemoteJWKSet(
  new URL(`${process.env.CLIENT_URL}/api/auth/jwks`)
);

export async function authMiddleware (req: Request, res: Response, next: NextFunction) {
  try {
    const token = req.headers.authorization?.split(" ")[1];
    if (!token) {
      return res.status(401).json({message: "Unauthorized"});
    }

    const {payload} = await jwtVerify(token, JWKS);
    if (!payload?.sub) {
      return res.status(401).json({message: "Invalid authentication token"});
    }

    req.userId = payload.sub;
    next();
  } catch (err) {
    res.status(401).json({message: "Invalid or expired authentication token"});
  }
}
