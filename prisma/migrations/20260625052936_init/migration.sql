-- CreateEnum
CREATE TYPE "JobState" AS ENUM ('QUEUED', 'PARSING', 'AI_PROCESSING', 'ASSEMBLING', 'RENDERING', 'POST_PROCESSING', 'COMPLETED', 'FAILED', 'INTERRUPTED');

-- CreateEnum
CREATE TYPE "RenderProfile" AS ENUM ('draft', 'standard', 'high_quality');

-- CreateTable
CREATE TABLE "ContentManifest" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "manifestHash" TEXT NOT NULL,
    "rawJson" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ContentManifest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Scene" (
    "id" TEXT NOT NULL,
    "manifestId" TEXT NOT NULL,
    "sceneHash" TEXT NOT NULL,
    "sceneIndex" INTEGER NOT NULL,
    "narration" TEXT NOT NULL,
    "visualHint" TEXT,
    "durationMs" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Scene_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Asset" (
    "id" TEXT NOT NULL,
    "sceneId" TEXT,
    "assetType" TEXT NOT NULL,
    "provider" TEXT,
    "url" TEXT,
    "localPath" TEXT,
    "checksum" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Asset_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RenderJob" (
    "id" TEXT NOT NULL,
    "manifestId" TEXT NOT NULL,
    "ownerTokenHash" TEXT NOT NULL,
    "state" "JobState" NOT NULL DEFAULT 'QUEUED',
    "renderProfile" "RenderProfile" NOT NULL DEFAULT 'standard',
    "lastCheckpoint" JSONB,
    "costEstimateUsd" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "gptImageCalls" INTEGER NOT NULL DEFAULT 0,
    "wanxCalls" INTEGER NOT NULL DEFAULT 0,
    "ttsDurationSecs" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "RenderJob_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OutputBundle" (
    "id" TEXT NOT NULL,
    "jobId" TEXT NOT NULL,
    "mp4Path" TEXT,
    "coverPath" TEXT,
    "metadataPath" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OutputBundle_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "JobErrorLog" (
    "id" TEXT NOT NULL,
    "jobId" TEXT NOT NULL,
    "stepName" TEXT NOT NULL,
    "errorMessage" TEXT NOT NULL,
    "errorStack" TEXT,
    "retryCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "JobErrorLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ContentManifest_manifestHash_key" ON "ContentManifest"("manifestHash");

-- CreateIndex
CREATE INDEX "ContentManifest_title_idx" ON "ContentManifest"("title");

-- CreateIndex
CREATE UNIQUE INDEX "Scene_sceneHash_key" ON "Scene"("sceneHash");

-- CreateIndex
CREATE INDEX "Scene_manifestId_sceneIndex_idx" ON "Scene"("manifestId", "sceneIndex");

-- CreateIndex
CREATE UNIQUE INDEX "Asset_checksum_key" ON "Asset"("checksum");

-- CreateIndex
CREATE INDEX "Asset_sceneId_assetType_idx" ON "Asset"("sceneId", "assetType");

-- CreateIndex
CREATE INDEX "RenderJob_manifestId_ownerTokenHash_idx" ON "RenderJob"("manifestId", "ownerTokenHash");

-- CreateIndex
CREATE INDEX "RenderJob_state_idx" ON "RenderJob"("state");

-- CreateIndex
CREATE INDEX "OutputBundle_jobId_idx" ON "OutputBundle"("jobId");

-- CreateIndex
CREATE INDEX "JobErrorLog_jobId_stepName_idx" ON "JobErrorLog"("jobId", "stepName");

-- AddForeignKey
ALTER TABLE "Scene" ADD CONSTRAINT "Scene_manifestId_fkey" FOREIGN KEY ("manifestId") REFERENCES "ContentManifest"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Asset" ADD CONSTRAINT "Asset_sceneId_fkey" FOREIGN KEY ("sceneId") REFERENCES "Scene"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RenderJob" ADD CONSTRAINT "RenderJob_manifestId_fkey" FOREIGN KEY ("manifestId") REFERENCES "ContentManifest"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OutputBundle" ADD CONSTRAINT "OutputBundle_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "RenderJob"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JobErrorLog" ADD CONSTRAINT "JobErrorLog_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "RenderJob"("id") ON DELETE CASCADE ON UPDATE CASCADE;
