# Railway PostgreSQL Migration Guide

**Rise In Harmony — Infrastructure Reference**
**Prepared by:** Manus AI | **Date:** June 2026

---

## Overview

This guide covers the complete migration of Rise In Harmony's backend database from the current Manus-managed MySQL instance to a self-hosted PostgreSQL database on Railway. The migration is required before public launch to support the three-surface architecture described in the development plan: the web app, mobile app, and a standalone Railway-hosted API all share a single PostgreSQL database.

The migration has three distinct phases: provisioning the Railway service, adapting the Drizzle schema from MySQL to PostgreSQL dialect, and migrating existing data. The entire process can be completed in a single working session without downtime for a pre-launch app.

---

## 1. Railway Account Setup

### 1.1 Create the Railway Project

Sign in at [railway.app](https://railway.app) and create a new project. Name it `rise-in-harmony`. Within the project, add two services: a **PostgreSQL** database service (click "Add Service" → "Database" → "PostgreSQL") and a **Node.js** web service for the API (click "Add Service" → "GitHub Repo" → select your repository, set the root directory to `/` and the build command to `pnpm build`).

Railway provisions the PostgreSQL service instantly and injects a `DATABASE_URL` environment variable in the format `postgresql://user:password@host:port/dbname`. Copy this value — it will be needed in the next step.

### 1.2 Recommended Railway Plan

Start on the **Hobby plan ($5/month)**, which provides up to 8 GB RAM and 8 vCPU — sufficient for the first 10,000 users. Upgrade to **Pro ($20/month)** before public launch to unlock 30-day log retention, priority support, and granular access control for team members.

---

## 2. Schema Migration: MySQL → PostgreSQL

### 2.1 Update the Drizzle Config

The current `drizzle.config.ts` uses the MySQL dialect. Update it to PostgreSQL:

```ts
// drizzle.config.ts
import { defineConfig } from "drizzle-kit";

export default defineConfig({
  schema: "./drizzle/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",   // ← was "mysql"
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
});
```

### 2.2 Update the Drizzle Schema

PostgreSQL uses different column types than MySQL. The key changes required in `drizzle/schema.ts` are listed in the table below.

| MySQL Type | PostgreSQL Equivalent | Notes |
| :--- | :--- | :--- |
| `mysqlTable` | `pgTable` | Import from `drizzle-orm/pg-core` |
| `int()` | `integer()` | Direct equivalent |
| `varchar(n)` | `varchar(n)` | Same syntax |
| `text()` | `text()` | Same syntax |
| `boolean()` | `boolean()` | Same syntax |
| `timestamp()` | `timestamp()` | Same syntax; use `{ withTimezone: true }` |
| `json()` | `jsonb()` | Use `jsonb` for better indexing in PostgreSQL |
| `mysqlEnum(...)` | `pgEnum(...)` | Must be declared separately before the table |

The `pgEnum` pattern requires declaring enums as top-level constants before the table definition:

```ts
// drizzle/schema.ts — PostgreSQL version
import { pgTable, pgEnum, integer, text, boolean, timestamp, jsonb } from "drizzle-orm/pg-core";

export const subscriptionTierEnum = pgEnum("subscription_tier", ["free", "premium", "lifetime"]);
export const userRoleEnum = pgEnum("user_role", ["user", "admin"]);

export const users = pgTable("users", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  openId: text("open_id").notNull().unique(),
  name: text("name"),
  email: text("email"),
  role: userRoleEnum("role").notNull().default("user"),
  subscriptionTier: subscriptionTierEnum("subscription_tier").notNull().default("free"),
  subscriptionExpiresAt: timestamp("subscription_expires_at", { withTimezone: true }),
  // ... remaining columns
});
```

### 2.3 Update the Database Driver

Replace the `mysql2` driver with `postgres` (the `pg` package):

```bash
pnpm remove mysql2
pnpm add pg
pnpm add -D @types/pg
```

Update `server/db.ts` to use the PostgreSQL connection:

```ts
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "../drizzle/schema";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
export const db = drizzle(pool, { schema });
```

### 2.4 Push the Schema

Once the schema and config are updated, run the migration:

```bash
pnpm db:push
```

Drizzle Kit will generate the PostgreSQL DDL and apply it to the Railway database. Verify the tables were created by connecting to the Railway database using the connection string from the Railway dashboard.

---

## 3. Data Migration

For a pre-launch application with no production user data, the migration is straightforward: the schema push creates all tables fresh, and no data transfer is required. If there is existing data in the Manus-managed MySQL database that must be preserved, use the following procedure.

### 3.1 Export from MySQL

```bash
# Export all tables as CSV using the Manus database connection string
mysqldump --single-transaction --no-create-info --complete-insert \
  --fields-terminated-by=',' --fields-enclosed-by='"' \
  --lines-terminated-by='\n' \
  -h HOST -u USER -p DATABASE \
  users sessions alarms studio_presets subscription_events \
  > rih_export.csv
```

### 3.2 Import to PostgreSQL

```bash
# Import each table using psql COPY
psql $DATABASE_URL -c "\COPY users FROM 'users.csv' CSV HEADER"
psql $DATABASE_URL -c "\COPY sessions FROM 'sessions.csv' CSV HEADER"
psql $DATABASE_URL -c "\COPY alarms FROM 'alarms.csv' CSV HEADER"
```

Verify row counts match between source and destination before cutting over traffic.

---

## 4. Environment Variable Update

After migration, update the following environment variables in the Railway service dashboard and in the Manus WebDev secrets panel:

| Variable | Old Value | New Value |
| :--- | :--- | :--- |
| `DATABASE_URL` | Manus MySQL connection string | Railway PostgreSQL connection string |

The Railway PostgreSQL URL format is:
```
postgresql://postgres:PASSWORD@HOST:5432/railway
```

Enable SSL by appending `?sslmode=require` to the connection string for production.

---

## 5. Materialized View for Dashboard Stats

The development plan specifies a materialized view for dashboard statistics that is refreshed nightly. Create this after the initial schema migration:

```sql
CREATE MATERIALIZED VIEW user_stats AS
SELECT
  user_id,
  COUNT(*)                                    AS total_sessions,
  SUM(duration_seconds / 60)                 AS total_minutes,
  AVG(mood_rating)                            AS avg_mood,
  MAX(started_at)                             AS last_session_at
FROM sessions
GROUP BY user_id;

CREATE UNIQUE INDEX ON user_stats (user_id);
```

Schedule a nightly refresh using a Railway cron job or a Heartbeat scheduled task:

```sql
REFRESH MATERIALIZED VIEW CONCURRENTLY user_stats;
```

The `CONCURRENTLY` option allows reads to continue during the refresh without locking the view.

---

## 6. Railway Environment Secrets

The following secrets must be configured in the Railway service's environment variable panel. None of these should ever be committed to the repository.

| Secret Name | Source | Description |
| :--- | :--- | :--- |
| `DATABASE_URL` | Railway dashboard (auto-injected) | PostgreSQL connection string |
| `JWT_SECRET` | Generate with `openssl rand -hex 32` | Session cookie signing key |
| `REVENUECAT_WEBHOOK_SECRET` | RevenueCat dashboard → Webhooks | Validates incoming webhook events |
| `RESEND_API_KEY` | Resend dashboard → API Keys | Transactional email sending |
| `BUILT_IN_FORGE_API_KEY` | Manus platform | LLM and storage API access |

---

## 7. Verification Checklist

Before directing production traffic to the Railway API, verify each item in this checklist.

- [ ] Railway PostgreSQL service is running and accessible
- [ ] All tables created by `pnpm db:push` match the schema definition
- [ ] `DATABASE_URL` environment variable is set in the Railway service
- [ ] SSL is enabled on the database connection (`?sslmode=require`)
- [ ] The API health check endpoint (`GET /health`) returns `200 OK`
- [ ] A test user can register and log in via the API
- [ ] A test session can be created and retrieved
- [ ] The RevenueCat webhook endpoint (`POST /api/trpc/subscription.revenuecatWebhook`) returns `200` for a test payload
- [ ] The Resend welcome email is sent on first login
- [ ] Row counts match between old MySQL and new PostgreSQL (if migrating existing data)
