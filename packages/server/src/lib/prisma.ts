import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

// Prisma 7 replaced binary engines with a pure-JS "client" engine.
// That engine requires an explicit driver adapter — it no longer bundles
// a native .node binary.  PrismaPg wraps the 'pg' package (node-postgres).
//
// DATABASE_URL is loaded before this module by `-r dotenv/config` in the
// dev/start scripts, so process.env.DATABASE_URL is always set here.
//
// Java analogy: like configuring a DataSource bean with a JDBC URL —
// instead of the ORM discovering the driver by magic, you wire it explicitly.
const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });

export const prisma = new PrismaClient({ adapter });
