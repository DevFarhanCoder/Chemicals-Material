-- CreateEnum
CREATE TYPE "Status" AS ENUM ('PENDING', 'CONTACTED', 'NOT_INTERESTED', 'CONVERTED');

-- CreateEnum
CREATE TYPE "ScrapingStatus" AS ENUM ('RUNNING', 'SUCCESS', 'FAILED', 'PARTIAL');

-- CreateTable
CREATE TABLE "materials" (
    "id" TEXT NOT NULL,
    "case_no" VARCHAR(50) NOT NULL,
    "product_name" TEXT NOT NULL,
    "email" VARCHAR(255),
    "mobile" VARCHAR(50),
    "company_name" VARCHAR(255) NOT NULL,
    "location" VARCHAR(255),
    "price" VARCHAR(100),
    "status" "Status" NOT NULL DEFAULT 'PENDING',
    "remarks" TEXT,
    "last_contacted" TIMESTAMP(3),
    "source_url" TEXT NOT NULL,
    "source_site" VARCHAR(100) NOT NULL,
    "scraped_at" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "materials_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "scraping_logs" (
    "id" TEXT NOT NULL,
    "source" VARCHAR(100) NOT NULL,
    "status" "ScrapingStatus" NOT NULL,
    "items_scraped" INTEGER NOT NULL DEFAULT 0,
    "items_failed" INTEGER NOT NULL DEFAULT 0,
    "errors" JSONB,
    "started_at" TIMESTAMP(3) NOT NULL,
    "completed_at" TIMESTAMP(3),
    "duration_ms" INTEGER,

    CONSTRAINT "scraping_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "admin_actions" (
    "id" TEXT NOT NULL,
    "material_id" TEXT NOT NULL,
    "action" VARCHAR(50) NOT NULL,
    "old_value" TEXT,
    "new_value" TEXT,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "admin_actions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "materials_case_no_key" ON "materials"("case_no");

-- CreateIndex
CREATE INDEX "materials_company_name_idx" ON "materials"("company_name");

-- CreateIndex
CREATE INDEX "materials_status_idx" ON "materials"("status");

-- CreateIndex
CREATE INDEX "materials_created_at_idx" ON "materials"("created_at");

-- CreateIndex
CREATE INDEX "materials_source_site_idx" ON "materials"("source_site");

-- CreateIndex
CREATE INDEX "scraping_logs_source_idx" ON "scraping_logs"("source");

-- CreateIndex
CREATE INDEX "scraping_logs_started_at_idx" ON "scraping_logs"("started_at");

-- CreateIndex
CREATE INDEX "admin_actions_material_id_idx" ON "admin_actions"("material_id");

-- CreateIndex
CREATE INDEX "admin_actions_timestamp_idx" ON "admin_actions"("timestamp");
