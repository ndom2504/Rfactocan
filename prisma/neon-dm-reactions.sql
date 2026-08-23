-- WhatsApp-style emoji reactions on direct / In messages. Run once on Neon.

CREATE TABLE IF NOT EXISTS "DirectMessageReaction" (
  "id" TEXT NOT NULL,
  "messageId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "emoji" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "DirectMessageReaction_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "DirectMessageReaction_messageId_userId_key"
  ON "DirectMessageReaction" ("messageId", "userId");

CREATE INDEX IF NOT EXISTS "DirectMessageReaction_messageId_idx"
  ON "DirectMessageReaction" ("messageId");

DO $$ BEGIN
  ALTER TABLE "DirectMessageReaction"
    ADD CONSTRAINT "DirectMessageReaction_messageId_fkey"
    FOREIGN KEY ("messageId") REFERENCES "DirectMessage"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "DirectMessageReaction"
    ADD CONSTRAINT "DirectMessageReaction_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
