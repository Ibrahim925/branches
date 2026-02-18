# Branches

Branches is a Next.js + Supabase family tree app with real-time chat, memories, profile claiming, and invitation flows.

## Web app

1. Install dependencies:
```bash
npm install
```

2. Configure env vars:
```bash
cp .env.example .env.local
```

3. Run development server:
```bash
npm run dev
```

4. Open [http://localhost:3000](http://localhost:3000).

## iOS shell (Capacitor)

The iOS wrapper lives in `apps/ios-shell` and loads the same web app.

1. Install shell dependencies:
```bash
cd apps/ios-shell
npm install
```

2. Sync project:
```bash
npm run sync
```

3. Open Xcode:
```bash
npm run open
```

Deep links:
- Universal: `https://branches-azure.vercel.app/invite/:token`
- Custom scheme: `branches://invite/:token`

## Notes

- Service worker caching is enabled in production builds via `public/sw.js`.
- iOS-safe-area helpers and offline banner are in global runtime UI.
- App Store release checklist: `docs/ios-release-checklist.md`.
