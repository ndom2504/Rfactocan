# Notifications push géolocalisées (type Uber)

See also the Android project doc:
`C:\Users\gismi\AndroidStudioProjects\rfactocan\docs\PUSH_NOTIFICATIONS.md`

## API setup

1. Apply SQL: `npx prisma db execute --schema prisma/schema.prisma --file prisma/sql/add-device-tokens-location.sql`
2. Set on Vercel:
   - `FIREBASE_PROJECT_ID`
   - `FIREBASE_CLIENT_EMAIL`
   - `FIREBASE_PRIVATE_KEY` (with `\n` for newlines)
3. Redeploy the Next.js API.

## Endpoints

- `POST /api/devices/fcm` `{ token, platform: "ANDROID" }`
- `DELETE /api/devices/fcm` `{ token }`
- `POST /api/presence/location` `{ latitude, longitude }`

## Triggers

- `POST /api/requests` → notify nearby TRAVELER/BOTH
- `POST /api/services` → notify nearby SENDER/BOTH
