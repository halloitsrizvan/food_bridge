-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "Role" AS ENUM ('GOV', 'GIVER', 'TAKER');

-- CreateEnum
CREATE TYPE "GiverKind" AS ENUM ('RESTAURANT', 'CATERER', 'HOUSEHOLD', 'EVENT');

-- CreateEnum
CREATE TYPE "TakerKind" AS ENUM ('INSTITUTION', 'CHARITY', 'HOUSE');

-- CreateEnum
CREATE TYPE "AccountStatus" AS ENUM ('ACTIVE', 'SUSPENDED', 'APPEALING');

-- CreateEnum
CREATE TYPE "Tier" AS ENUM ('BRONZE', 'SILVER', 'GOLD', 'PLATINUM');

-- CreateEnum
CREATE TYPE "FoodCategory" AS ENUM ('COOKED', 'PACKAGED', 'RAW');

-- CreateEnum
CREATE TYPE "Diet" AS ENUM ('VEG', 'NON_VEG', 'BOTH');

-- CreateEnum
CREATE TYPE "HandoverMode" AS ENUM ('GIVER_DELIVERS', 'TAKER_PICKS_UP', 'EITHER');

-- CreateEnum
CREATE TYPE "OfferStatus" AS ENUM ('OPEN', 'CONTACTED', 'SETTLED', 'DELIVERED', 'EXPIRED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "NeedStatus" AS ENUM ('OPEN', 'CONTACTED', 'SETTLED', 'FULFILLED', 'EXPIRED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "ClaimStatus" AS ENUM ('PENDING', 'ACCEPTED', 'DECLINED', 'EXPIRED', 'COMPLETED');

-- CreateEnum
CREATE TYPE "AppealStatus" AS ENUM ('OPEN', 'APPROVED', 'REJECTED');

-- CreateTable
CREATE TABLE "profiles" (
    "id" UUID NOT NULL,
    "role" "Role" NOT NULL,
    "giver_kind" "GiverKind",
    "taker_kind" "TakerKind",
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "maps_url" TEXT,
    "address" TEXT NOT NULL DEFAULT '',
    "area" TEXT NOT NULL DEFAULT '',
    "lat" DOUBLE PRECISION,
    "lng" DOUBLE PRECISION,
    "members" INTEGER,
    "open_to_receive" BOOLEAN NOT NULL DEFAULT true,
    "onboarded" BOOLEAN NOT NULL DEFAULT false,
    "status" "AccountStatus" NOT NULL DEFAULT 'ACTIVE',
    "points" INTEGER NOT NULL DEFAULT 0,
    "trust_score" INTEGER NOT NULL DEFAULT 70,
    "tier" "Tier" NOT NULL DEFAULT 'BRONZE',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "offers" (
    "id" UUID NOT NULL,
    "giver_id" UUID NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "category" "FoodCategory" NOT NULL,
    "diet" "Diet" NOT NULL,
    "quantity_meals" INTEGER NOT NULL,
    "cooked_at" TIMESTAMP(3),
    "expected_expiry_at" TIMESTAMP(3) NOT NULL,
    "safe_until" TIMESTAMP(3) NOT NULL,
    "mode" "HandoverMode" NOT NULL,
    "photo_url" TEXT,
    "status" "OfferStatus" NOT NULL DEFAULT 'OPEN',
    "scheduled_for" TIMESTAMP(3),
    "escalation_level" INTEGER NOT NULL DEFAULT 0,
    "gov_alerted" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "offers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "needs" (
    "id" UUID NOT NULL,
    "taker_id" UUID NOT NULL,
    "title" TEXT NOT NULL,
    "notes" TEXT NOT NULL DEFAULT '',
    "diet" "Diet" NOT NULL,
    "meals_needed" INTEGER NOT NULL,
    "needed_from" TIMESTAMP(3) NOT NULL,
    "needed_by" TIMESTAMP(3) NOT NULL,
    "mode" "HandoverMode" NOT NULL,
    "status" "NeedStatus" NOT NULL DEFAULT 'OPEN',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "needs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "claims" (
    "id" UUID NOT NULL,
    "offer_id" UUID NOT NULL,
    "need_id" UUID,
    "taker_id" UUID NOT NULL,
    "giver_id" UUID NOT NULL,
    "initiated_by" "Role" NOT NULL,
    "status" "ClaimStatus" NOT NULL DEFAULT 'PENDING',
    "hold_until" TIMESTAMP(3) NOT NULL,
    "otp_hash" TEXT,
    "otp_salt" TEXT,
    "otp_expires_at" TIMESTAMP(3),
    "accepted_at" TIMESTAMP(3),
    "completed_at" TIMESTAMP(3),
    "meals_delivered" INTEGER,
    "handover_photo" TEXT,
    "score_snapshot" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "claims_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "reviews" (
    "id" UUID NOT NULL,
    "claim_id" UUID NOT NULL,
    "from_id" UUID NOT NULL,
    "to_id" UUID NOT NULL,
    "rating" INTEGER NOT NULL,
    "comment" TEXT NOT NULL DEFAULT '',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "reviews_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "complaints" (
    "id" UUID NOT NULL,
    "claim_id" UUID NOT NULL,
    "from_id" UUID NOT NULL,
    "against_id" UUID NOT NULL,
    "reason" TEXT NOT NULL,
    "weight" DOUBLE PRECISION NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "complaints_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "appeals" (
    "id" UUID NOT NULL,
    "account_id" UUID NOT NULL,
    "message" TEXT NOT NULL,
    "status" "AppealStatus" NOT NULL DEFAULT 'OPEN',
    "decided_by" UUID,
    "decided_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "appeals_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "point_ledger" (
    "id" UUID NOT NULL,
    "account_id" UUID NOT NULL,
    "claim_id" UUID,
    "delta" INTEGER NOT NULL,
    "reason" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "point_ledger_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notifications" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "type" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "link" TEXT NOT NULL DEFAULT '',
    "read_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "app_config" (
    "key" TEXT NOT NULL,
    "value" JSONB NOT NULL,

    CONSTRAINT "app_config_pkey" PRIMARY KEY ("key")
);

-- CreateIndex
CREATE UNIQUE INDEX "profiles_email_key" ON "profiles"("email");

-- CreateIndex
CREATE INDEX "profiles_role_status_idx" ON "profiles"("role", "status");

-- CreateIndex
CREATE INDEX "profiles_lat_lng_idx" ON "profiles"("lat", "lng");

-- CreateIndex
CREATE INDEX "profiles_role_open_to_receive_status_idx" ON "profiles"("role", "open_to_receive", "status");

-- CreateIndex
CREATE INDEX "offers_status_expected_expiry_at_idx" ON "offers"("status", "expected_expiry_at");

-- CreateIndex
CREATE INDEX "offers_status_safe_until_idx" ON "offers"("status", "safe_until");

-- CreateIndex
CREATE INDEX "offers_giver_id_status_idx" ON "offers"("giver_id", "status");

-- CreateIndex
CREATE INDEX "needs_status_needed_by_idx" ON "needs"("status", "needed_by");

-- CreateIndex
CREATE INDEX "needs_taker_id_status_idx" ON "needs"("taker_id", "status");

-- CreateIndex
CREATE INDEX "claims_status_hold_until_idx" ON "claims"("status", "hold_until");

-- CreateIndex
CREATE INDEX "claims_offer_id_status_idx" ON "claims"("offer_id", "status");

-- CreateIndex
CREATE INDEX "claims_taker_id_status_idx" ON "claims"("taker_id", "status");

-- CreateIndex
CREATE INDEX "claims_giver_id_status_idx" ON "claims"("giver_id", "status");

-- CreateIndex
CREATE INDEX "reviews_to_id_idx" ON "reviews"("to_id");

-- CreateIndex
CREATE UNIQUE INDEX "reviews_claim_id_from_id_key" ON "reviews"("claim_id", "from_id");

-- CreateIndex
CREATE INDEX "complaints_against_id_created_at_idx" ON "complaints"("against_id", "created_at");

-- CreateIndex
CREATE UNIQUE INDEX "complaints_claim_id_from_id_key" ON "complaints"("claim_id", "from_id");

-- CreateIndex
CREATE INDEX "appeals_status_created_at_idx" ON "appeals"("status", "created_at");

-- CreateIndex
CREATE INDEX "point_ledger_account_id_created_at_idx" ON "point_ledger"("account_id", "created_at");

-- CreateIndex
CREATE INDEX "notifications_user_id_read_at_created_at_idx" ON "notifications"("user_id", "read_at", "created_at");

-- AddForeignKey
ALTER TABLE "offers" ADD CONSTRAINT "offers_giver_id_fkey" FOREIGN KEY ("giver_id") REFERENCES "profiles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "needs" ADD CONSTRAINT "needs_taker_id_fkey" FOREIGN KEY ("taker_id") REFERENCES "profiles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "claims" ADD CONSTRAINT "claims_offer_id_fkey" FOREIGN KEY ("offer_id") REFERENCES "offers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "claims" ADD CONSTRAINT "claims_need_id_fkey" FOREIGN KEY ("need_id") REFERENCES "needs"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "claims" ADD CONSTRAINT "claims_taker_id_fkey" FOREIGN KEY ("taker_id") REFERENCES "profiles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "claims" ADD CONSTRAINT "claims_giver_id_fkey" FOREIGN KEY ("giver_id") REFERENCES "profiles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_claim_id_fkey" FOREIGN KEY ("claim_id") REFERENCES "claims"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_from_id_fkey" FOREIGN KEY ("from_id") REFERENCES "profiles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_to_id_fkey" FOREIGN KEY ("to_id") REFERENCES "profiles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "complaints" ADD CONSTRAINT "complaints_claim_id_fkey" FOREIGN KEY ("claim_id") REFERENCES "claims"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "complaints" ADD CONSTRAINT "complaints_from_id_fkey" FOREIGN KEY ("from_id") REFERENCES "profiles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "complaints" ADD CONSTRAINT "complaints_against_id_fkey" FOREIGN KEY ("against_id") REFERENCES "profiles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "appeals" ADD CONSTRAINT "appeals_account_id_fkey" FOREIGN KEY ("account_id") REFERENCES "profiles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "point_ledger" ADD CONSTRAINT "point_ledger_account_id_fkey" FOREIGN KEY ("account_id") REFERENCES "profiles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "point_ledger" ADD CONSTRAINT "point_ledger_claim_id_fkey" FOREIGN KEY ("claim_id") REFERENCES "claims"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "profiles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;


-- ============================================================================
-- Hand-written additions (not expressible in schema.prisma)
-- ============================================================================

-- One ACTIVE (PENDING/ACCEPTED) claim per offer: the concurrency backstop.
CREATE UNIQUE INDEX "claims_one_active_per_offer" ON "claims" ("offer_id") WHERE "status" IN ('PENDING', 'ACCEPTED');

-- Row level security everywhere. The server uses the service role / table owner (bypasses RLS).
ALTER TABLE "profiles" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "offers" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "needs" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "claims" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "reviews" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "complaints" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "appeals" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "point_ledger" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "notifications" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "app_config" ENABLE ROW LEVEL SECURITY;

-- The only client-facing policy: a user can SELECT their own notifications (Supabase Realtime).
CREATE POLICY "notifications_select_own" ON "notifications" FOR SELECT TO authenticated USING ("user_id" = auth.uid());

-- Realtime publication for the notification bell.
ALTER PUBLICATION supabase_realtime ADD TABLE "notifications";
