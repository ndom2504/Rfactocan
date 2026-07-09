-- Seed démo Rfacto (mot de passe pour tous: password123)
-- À exécuter dans Neon → SQL Editor APRÈS neon-init.sql

INSERT INTO "User" (
  id, email, "passwordHash", "displayName", country, bio, role, status,
  "verifiedAt", "ratingAvg", "ratingCount", "createdAt", "updatedAt"
) VALUES
(
  'seed_admin_001',
  'admin@rfacto.ca',
  '$2b$10$TZ8/.lN6/fuCAZ556OpvFeT2WejEgi7YRTuWWwMK9rlQn1ux8.DJO',
  'Admin Rfacto',
  'Canada',
  'Administrateur de la plateforme Rfacto.',
  'ADMIN',
  'ACTIVE',
  NOW(),
  0,
  0,
  NOW(),
  NOW()
),
(
  'seed_traveler_001',
  'voyageur@rfacto.ca',
  '$2b$10$TZ8/.lN6/fuCAZ556OpvFeT2WejEgi7YRTuWWwMK9rlQn1ux8.DJO',
  'Amina N.',
  'Canada',
  'Voyage régulièrement Montréal → Libreville.',
  'TRAVELER',
  'ACTIVE',
  NOW(),
  4.8,
  12,
  NOW(),
  NOW()
),
(
  'seed_sender_001',
  'expediteur@rfacto.ca',
  '$2b$10$TZ8/.lN6/fuCAZ556OpvFeT2WejEgi7YRTuWWwMK9rlQn1ux8.DJO',
  'Marc D.',
  'Canada',
  'Envoie des colis familiaux vers le Gabon.',
  'SENDER',
  'ACTIVE',
  NOW(),
  4.5,
  6,
  NOW(),
  NOW()
)
ON CONFLICT (email) DO NOTHING;

INSERT INTO "Trip" (
  id, "userId", "fromCountry", "fromCity", "toCountry", "toCity",
  "departAt", "weightKg", "pricePerKgCad", "acceptedGoods", notes,
  airline, "flightNumber", status, "createdAt", "updatedAt"
) VALUES (
  'seed_trip_001',
  'seed_traveler_001',
  'CA',
  'Montréal',
  'GA',
  'Libreville',
  NOW() + INTERVAL '20 days',
  18,
  18,
  'Vêtements, documents, produits non périssables',
  'Bagage soute disponible, objets fragiles acceptés avec emballage.',
  'Air Canada / Ethiopian',
  'AC123',
  'OPEN',
  NOW(),
  NOW()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO "ParcelRequest" (
  id, "userId", "fromCountry", "fromCity", "toCountry", "toCity",
  "weightKg", description, "photosJson", urgency, "declaredValue",
  "maxPricePerKg", "desiredDate", status, "createdAt", "updatedAt"
) VALUES (
  'seed_request_001',
  'seed_sender_001',
  'CA',
  'Montréal',
  'GA',
  'Libreville',
  5,
  'Documents et vêtements pour la famille. Urgent mais flexible ±3 jours.',
  '[]',
  'HIGH',
  150,
  20,
  NOW() + INTERVAL '18 days',
  'OPEN',
  NOW(),
  NOW()
)
ON CONFLICT (id) DO NOTHING;
