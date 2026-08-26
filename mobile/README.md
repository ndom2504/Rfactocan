# Rfacto Mobile (Expo → iOS / Android)

Application Expo branchée sur l’API Next.js (`Authorization: Bearer`).

- **iPhone / App Store** : ce dossier (`mobile/`). Build cloud via **EAS** depuis Windows.
- **Android Play** : app Kotlin native (`AndroidStudioProjects/rfactocan`), pas ce projet.

## Où on en est (août 2026)

Fait :
- Bundle id `com.rfacto.app`
- Projet EAS `d8977989-e19b-4dfa-92e3-25e47b779597` (compte Expo `ndom2504`)
- Auth email + mot de passe **et** OTP SMS (Twilio)
- Navigation type Android : Accueil, Actions, Communauté, Messages, Boutiques
- In (activation SMS + recherche numéro + chat)
- Voyages / demandes / réservations / services / boutiques (listes API)
- `eas.json` + drapeau Apple « pas de chiffrement export » (`ITSAppUsesNonExemptEncryption`)

Pas encore :
- Compte **Apple Developer** (99 $/an) + premier build TestFlight
- Parité avancée : vocaux, appels LiveKit, push, Google / Sign in with Apple, contacts du téléphone

## Configuration

```bash
cd mobile
cp .env.example .env
```

```
EXPO_PUBLIC_API_URL=https://www.rfacto.com
```

## Test (Expo Go)

```bash
cd mobile
npm install
npm start
```

Scannez le QR avec Expo Go. Utile pour l’UI, pas pour le store (SecureStore limité dans Go).

## Build iOS depuis Windows (EAS)

1. Compte [Apple Developer](https://developer.apple.com/programs/).
2. Dans un terminal :

```bash
cd mobile
npx eas-cli login
npx eas-cli init --id d8977989-e19b-4dfa-92e3-25e47b779597
npx eas-cli build --platform ios --profile production
```

EAS signe et compile dans le cloud. Premier build : suivre les questions Apple (équipe, certificats).  
Le `.ipa` part sur [expo.dev](https://expo.dev) ; ensuite :

```bash
npx eas-cli submit --platform ios
```

(ou upload manuel dans Transporter / App Store Connect → TestFlight.)

## Build iOS sur Mac

```bash
cd mobile
npx expo prebuild --platform ios
npx expo run:ios
```

Ouvrir `mobile/ios` dans Xcode si besoin.

## Android (ce dossier Expo)

```bash
npx expo prebuild --platform android
npx expo run:android
```

Le store Android de prod reste le projet Kotlin.

## Hors v1 Expo

Google Sign-In, Sign in with Apple (obligatoire dès qu’on ajoute Google), In, push, LiveKit, Stripe Payment Sheet.
