# iOS Release Checklist

## Build and Signing
- Confirm `apps/ios-shell/capacitor.config.ts` points to production app URL.
- Run `npm run sync` in `apps/ios-shell`.
- Open Xcode and set signing team, bundle identifier, and provisioning profile.
- Archive build for App Store distribution.

## App Review Assets
- Upload iPhone screenshots for key flows (tree, chat, memories, settings).
- Provide app preview text describing family collaboration features.
- Configure support URL and privacy policy URL.

## Privacy and Permissions
- Verify camera/photo usage strings in `Info.plist`.
- Ensure account deletion is accessible from in-app settings.
- Confirm data types in App Privacy nutrition labels match actual collection.

## Functional Validation
- Auth/login/signup/onboarding.
- Invite deep link open while logged out and logged in.
- Tree CRUD and relationship actions.
- Chat real-time send/receive with image upload.
- Memories create/view/like/comment/delete.
- Profile editing and account deletion.

## Rollout
- Enable phased release in App Store Connect.
- Monitor crash/error telemetry and key performance metrics (cold start, tree render, chat load).
