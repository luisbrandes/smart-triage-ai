const testUrl = process.env.TEST_DATABASE_URL;
if (!testUrl) throw new Error("TEST_DATABASE_URL é obrigatória para testes de integração.");
if (testUrl === process.env.DATABASE_URL || !/test/i.test(new URL(testUrl).pathname + new URL(testUrl).port)) throw new Error("TEST_DATABASE_URL deve apontar para banco exclusivo identificado como teste.");
process.env.DATABASE_URL = testUrl;
process.env.APP_MODE = "demo";
