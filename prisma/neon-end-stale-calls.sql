-- Unblock "Un appel est déjà en cours." after Accept without LiveKit.
-- Run once in Neon SQL Editor, then retry the call.

UPDATE "Call"
SET
  "status" = 'ENDED',
  "endedAt" = NOW(),
  "endReason" = 'STALE_NO_MEDIA',
  "updatedAt" = NOW()
WHERE "status" IN ('RINGING', 'ACCEPTED');
