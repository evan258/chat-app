import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";
import { PrismaClient } from "../../generated/prisma/index.js";

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL!,
  ssl: process.env.NODE_ENV === "production" ? { rejectUnauthorized: false } : false,
});

const adapter = new PrismaPg(pool);
export const prisma = new PrismaClient({adapter});
