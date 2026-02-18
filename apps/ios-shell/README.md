# Branches iOS Shell

Capacitor wrapper for the existing Next.js application.

## Goals
- Keep `src/` as the product source of truth.
- Ship an App Store-ready iPhone app with deep links and native bridges.
- Reuse current Supabase auth/realtime/storage flows.

## Local workflow
1. Install dependencies in this workspace: `npm install`.
2. Run the web app: `npm run dev` from repository root.
3. Sync native project files: `npm run sync` from `apps/ios-shell`.
4. Open Xcode project: `npm run open`.

## Environment
- Development web URL: `http://localhost:3000`
- Production web URL: `NEXT_PUBLIC_APP_URL` (defaults to `https://branches-azure.vercel.app`)

## Deep links
- Universal links: `https://branches-azure.vercel.app/invite/:token`
- Fallback custom scheme: `branches://invite/:token`
- Update `public/.well-known/apple-app-site-association` with your real Apple Team ID before release.

## Native permissions
`ios/App/App/Info.plist` includes:
- `NSCameraUsageDescription`
- `NSPhotoLibraryUsageDescription`
- `NSPhotoLibraryAddUsageDescription`

## Notes
- This shell intentionally uses `server.url` to load the hosted web app.
- For full offline-first native bundling, replace remote loading with a compiled local web bundle.
