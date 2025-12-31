-- CreateTable
CREATE TABLE "Transaction" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "amountCent" INTEGER NOT NULL,
    "category" TEXT NOT NULL,
    "note" TEXT,
    "ts" DATETIME NOT NULL,
    "isAnomaly" BOOLEAN NOT NULL DEFAULT false,
    "source" TEXT NOT NULL DEFAULT 'manual',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "Reminder" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "type" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "config" TEXT,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "Persona" (
    "id" TEXT NOT NULL PRIMARY KEY DEFAULT 'default',
    "ageBand" TEXT,
    "incomeBand" TEXT,
    "savingRate" REAL,
    "riskProfile" TEXT DEFAULT '稳健',
    "spendTopCategories" TEXT
);
