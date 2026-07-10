# Rfacto Mobile (Expo → Android Studio)

Application Android/iOS native branchée sur l’API Next.js de Rfacto (`Authorization: Bearer`).

## Prérequis

- Node.js 20+
- Compte Expo (optionnel pour le store)
- [Android Studio](https://developer.android.com/studio) (SDK + émulateur)
- API Rfacto joignable (`https://www.rfacto.com` ou IP locale `:3000`)

## Configuration

```bash
cd mobile
cp .env.example .env
```

Éditez `.env` :

```
EXPO_PUBLIC_API_URL=https://www.rfacto.com
```

En local (téléphone/émulateur sur le même réseau) :

```
EXPO_PUBLIC_API_URL=http://192.168.x.x:3000
```

Sur l’émulateur Android, `http://10.0.2.2:3000` pointe vers le `localhost` de votre PC.

## Lancer en mode Expo (rapide)

```bash
cd mobile
npm install
npm start
```

Puis `a` pour Android, ou scannez le QR avec Expo Go (Bearer + SecureStore : préférer un build natif).

## Android Studio (projet natif)

```bash
cd mobile
npm install
npx expo prebuild --platform android
```

1. Ouvrez le dossier `mobile/android` dans **Android Studio**
2. Laissez Gradle synchroniser
3. Choisissez un émulateur ou un appareil USB
4. Run ▶

Alternative CLI :

```bash
npx expo run:android
```

Les dossiers `android/` et `ios/` sont générés localement (gitignorés). Relancez `prebuild` après changement de plugins natifs.

## Fonctionnalités v1

- Connexion / inscription (email + mot de passe)
- Profil + devise préférée
- Voyages & demandes (liste, détail, création)
- Réservations, acceptation, chat
- Paiement Stripe via navigateur in-app (`expo-web-browser`)

## Hors v1

Google Sign-In natif, Stripe Payment Sheet, KYC/Connect in-app, push notifications.
