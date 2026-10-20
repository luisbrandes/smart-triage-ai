import "dotenv/config";

import { getTestDatabaseUrl } from "../../scripts/db-test-deploy.mjs";

const testUrl = process.env.TEST_DATABASE_URL;
const isolatedTestUrl = getTestDatabaseUrl({
  testDatabaseUrl: testUrl,
  databaseUrl: process.env.DATABASE_URL,
  directDatabaseUrl: process.env.DIRECT_DATABASE_URL,
});
process.env.DATABASE_URL = isolatedTestUrl;
process.env.APP_MODE = "demo";