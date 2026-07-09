# Rfacto (RapidFacto)

Plateforme mondiale de mise en relation entre **voyageurs** et **expéditeurs** — marketplace P2P de transport collaboratif de colis (*l'Airbnb du bagage international*).

> Le réseau mondial qui connecte les voyageurs et les expéditeurs partout dans le monde.

Auth, matching mondial, réservations, messagerie, **paiement escrow Stripe**, **KYC Stripe Identity**, géo (Country / City / Currency / Language), admin.

## Stack

- Next.js 15 (App Router) + TypeScript + Tailwind
- Prisma + **Neon Postgres**
- Auth session JWT + Google OAuth
- **Stripe** : Checkout (manual capture), Connect Express, Identity
- Déploiement : **Vercel** (`rfacto.com`)

## Démarrage local

```bash
npm install
cp .env.example .env
# Renseigne Neon + AUTH_SECRET (+ Stripe pour paiements/KYC)
npm run db:setup
npm run dev
```

### Variables d'environnement (Vercel)

| Variable | Description |
|----------|-------------|
| `DATABASE_URL` | Neon pooled |
| `DIRECT_URL` | Neon direct |
| `AUTH_SECRET` | Secret sessions |
| `NEXT_PUBLIC_APP_URL` | `https://rfacto.com` |
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` | Google OAuth |
| `STRIPE_SECRET_KEY` | Clé secrète Stripe |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | Clé publique Stripe |
| `STRIPE_WEBHOOK_SECRET` | Secret webhook |
| `PLATFORM_FEE_BPS` | Commission (défaut `1000` = 10 %) |

Root Directory Vercel : **vide**.

### Neon SQL (si `db push` échoue en local)

Exécuter dans l'ordre dans Neon SQL Editor :

1. `prisma/neon-init.sql` (schéma de base)
2. `prisma/neon-google-auth.sql`
3. `prisma/neon-payments-kyc.sql`
4. `prisma/neon-geo.sql` (**Country / City / Currency / Language**)
5. Puis `npm run db:seed` (ou `prisma/neon-seed.sql` pour comptes démo)

### Stripe (escrow + KYC)

1. [Stripe Dashboard](https://dashboard.stripe.com/) → activer **Identity** et **Connect**
2. Developers → API keys → copier Secret + Publishable dans Vercel
3. Developers → Webhooks → Add endpoint :
   - URL : `https://rfacto.com/api/stripe/webhook`
   - Events :
     - `identity.verification_session.verified`
     - `identity.verification_session.requires_input`
     - `identity.verification_session.canceled`
     - `checkout.session.completed`
     - `payment_intent.amount_capturable_updated`
     - `payment_intent.succeeded`
     - `payment_intent.canceled`
     - `payment_intent.payment_failed`
     - `account.updated`
     - `charge.refunded`
4. Copier le **Signing secret** → `STRIPE_WEBHOOK_SECRET`
5. Connect settings : brand Rfacto, return URLs via `NEXT_PUBLIC_APP_URL`

### Flux paiement

1. Voyageur : Profil → **Vérifier mon identité** (Identity) → **Activer les paiements** (Connect)
2. Expéditeur propose une réservation
3. Voyageur accepte (+ checklist douanière) → statut `AWAITING_PAYMENT`
4. Expéditeur paie via Stripe Checkout (autorisation, fonds bloqués)
5. Webhook → `AUTHORIZED` + booking `ACCEPTED`
6. Transit → **Livré** → capture + transfer net au voyageur (Rfacto garde 10 %)

### Auth Google

Redirect URI : `https://rfacto.com/api/auth/google/callback`  
Origins : `https://rfacto.com`, `http://localhost:3000`

### Comptes démo

| Rôle | Email | Mot de passe |
|------|-------|--------------|
| Admin | admin@rfacto.ca | password123 |
| Voyageur | voyageur@rfacto.ca | password123 |
| Expéditeur | expediteur@rfacto.ca | password123 |

## Hors scope (V2.1+)

Mobile Money, assurance, litiges automatisés, QR scan, Expo Android, multi-devises.
