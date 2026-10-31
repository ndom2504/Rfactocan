-- Add STORY kind for spontaneous photo/video statuses
DO $$ BEGIN
  ALTER TYPE "MemberStatusKind" ADD VALUE IF NOT EXISTS 'STORY';
EXCEPTION
  WHEN duplicate_object THEN NULL;
  WHEN undefined_object THEN NULL;
END $$;
