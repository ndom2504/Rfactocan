-- Upsert admin Rfacto (à coller dans Neon SQL Editor)
-- Remplace email / passwordHash si besoin (hash généré avec bcrypt, cost 10)

INSERT INTO "User" (
  id, email, "passwordHash", "displayName", role, status,
  "verifiedAt", country, language, "preferredCurrency", bio,
  "createdAt", "updatedAt"
) VALUES (
  'admin_' || substr(md5(random()::text), 1, 16),
  'info@misterdil.com',
  '$2b$10$18QqeTtGC7rcM6ZLWzNvW.ysyiI1Y2n158ZHklbkM0/NHKPwDpAYC',
  'Admin Rfacto',
  'ADMIN',
  'ACTIVE',
  NOW(),
  'Canada',
  'fr',
  'CAD',
  'Administrateur de la plateforme Rfacto.',
  NOW(),
  NOW()
)
ON CONFLICT (email) DO UPDATE SET
  "passwordHash" = EXCLUDED."passwordHash",
  role = 'ADMIN',
  status = 'ACTIVE',
  "verifiedAt" = NOW(),
  "displayName" = EXCLUDED."displayName",
  "updatedAt" = NOW();

-- Rétrograder l'ancien admin démo s'il existe encore
UPDATE "User"
SET role = 'BOTH', "updatedAt" = NOW()
WHERE email = 'admin@rfacto.ca'
  AND role = 'ADMIN'
  AND email <> 'info@misterdil.com';
