-- Tax reductions granted by the government to givers.
CREATE TABLE "tax_reductions" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "giver_id" UUID NOT NULL,
    "tax_type" TEXT NOT NULL,
    "percent" INTEGER NOT NULL,
    "reason" TEXT NOT NULL,
    "valid_until" DATE NOT NULL,
    "granted_by_id" UUID NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "tax_reductions_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "tax_reductions_percent_check" CHECK ("percent" BETWEEN 1 AND 100)
);

CREATE INDEX "tax_reductions_giver_id_created_at_idx" ON "tax_reductions"("giver_id", "created_at");
CREATE INDEX "tax_reductions_created_at_idx" ON "tax_reductions"("created_at");

ALTER TABLE "tax_reductions" ADD CONSTRAINT "tax_reductions_giver_id_fkey" FOREIGN KEY ("giver_id") REFERENCES "profiles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "tax_reductions" ADD CONSTRAINT "tax_reductions_granted_by_id_fkey" FOREIGN KEY ("granted_by_id") REFERENCES "profiles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- No client policies: only the API (government role) reads or writes this table.
ALTER TABLE "tax_reductions" ENABLE ROW LEVEL SECURITY;
