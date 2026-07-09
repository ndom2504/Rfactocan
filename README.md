# Rfacto (RapidFacto)

Plateforme web de mise en relation entre **voyageurs** et **expéditeurs** pour transporter des colis du **Canada vers l'Afrique**.

MVP sans paiement in-app : authentification, annonces, matching, réservations, messagerie, notations, admin.

## Stack

- Next.js 15 (App Router) + TypeScript + Tailwind
- Prisma + SQLite (local) — prêt pour Postgres / Supabase en production
- Auth session JWT (cookie httpOnly) — clients Supabase optionnels pour Storage / Realtime
- API REST sous `/api/*` (contrat stable pour une future app Expo Android)

## Démarrage

```bash
npm install
cp .env.example .env
npm run db:setup
npm run dev
```

Ouvrir [http://localhost:3000](http://localhost:3000).

### Comptes démo

| Rôle | Email | Mot de passe |
|------|-------|--------------|
| Admin | admin@rfacto.ca | password123 |
| Voyageur | voyageur@rfacto.ca | password123 |
| Expéditeur | expediteur@rfacto.ca | password123 |

## Fonctionnalités MVP

- Inscription / connexion (email)
- Profils + rôles (expéditeur, voyageur, les deux, admin)
- Publication de voyages et de demandes de colis
- Upload photos (local `/public/uploads`)
- Matching score (destination, date, poids, prix, note)
- Réservation : proposer → accepter/refuser (checklist douanière) → suivi des statuts
- Messagerie par réservation (polling)
- Notations après livraison
- Admin : vérifier / suspendre utilisateurs, signalements

## Structure

```
app/
  (marketing)/     Landing
  (auth)/          Login / register
  (app)/           Dashboard authentifié
  api/             API JSON
components/
lib/               auth, prisma, matching, supabase
prisma/
```

## Production (Supabase)

1. Créer un projet Supabase Postgres
2. Remplacer `DATABASE_URL` par l'URL Postgres
3. Changer le provider Prisma en `postgresql`
4. Renseigner `NEXT_PUBLIC_SUPABASE_*` pour Storage / Realtime
5. Définir un `AUTH_SECRET` fort

## Hors MVP (V2)

Paiement escrow Stripe, Mobile Money, KYC passeport, QR codes, Expo Android.
