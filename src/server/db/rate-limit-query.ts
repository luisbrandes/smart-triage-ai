import "server-only";
import { Prisma } from "@/generated/prisma/client";

export function rateLimitQuery(key: string, now: Date, resetBefore: Date, limit: number) {
  return Prisma.sql`
    INSERT INTO "RateLimitBucket" ("key", "windowStartedAt", "count", "updatedAt")
    VALUES (${key}, ${now}, 1, ${now})
    ON CONFLICT ("key") DO UPDATE SET
      "count" = CASE WHEN "RateLimitBucket"."windowStartedAt" <= ${resetBefore} THEN 1 ELSE "RateLimitBucket"."count" + 1 END,
      "windowStartedAt" = CASE WHEN "RateLimitBucket"."windowStartedAt" <= ${resetBefore} THEN ${now} ELSE "RateLimitBucket"."windowStartedAt" END,
      "updatedAt" = ${now}
    WHERE "RateLimitBucket"."windowStartedAt" <= ${resetBefore}
       OR "RateLimitBucket"."count" < ${limit}
    RETURNING "count"
  `;
}
