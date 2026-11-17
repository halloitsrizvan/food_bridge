-- Handover chat: messages between the giver and receiver of one claim.
CREATE TABLE "claim_messages" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "claim_id" UUID NOT NULL,
    "sender_id" UUID NOT NULL,
    "body" TEXT NOT NULL,
    "read_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "claim_messages_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "claim_messages_claim_id_created_at_idx" ON "claim_messages"("claim_id", "created_at");
CREATE INDEX "claim_messages_claim_id_sender_id_read_at_idx" ON "claim_messages"("claim_id", "sender_id", "read_at");

ALTER TABLE "claim_messages" ADD CONSTRAINT "claim_messages_claim_id_fkey" FOREIGN KEY ("claim_id") REFERENCES "claims"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "claim_messages" ADD CONSTRAINT "claim_messages_sender_id_fkey" FOREIGN KEY ("sender_id") REFERENCES "profiles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- No client policies: all access goes through the API, which checks the caller is a party to the claim.
ALTER TABLE "claim_messages" ENABLE ROW LEVEL SECURITY;
