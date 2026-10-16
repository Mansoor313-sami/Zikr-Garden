# Zikr Garden

A mobile-friendly daily zikr tracker. Create categories, record counts by date, set targets, and track completed or archived goals. Entries and categories can be edited or deleted. The entry form suggests the next date and pre-fills counts from the previous recorded day.

**Live site:** https://zikr-garden-mansoor-2026.web.app/

## Run locally

1. Install Node.js 20 or later.
2. Run `npm install`.
3. Run `npm run dev` and open the URL shown in the terminal.

Run `npm run build` to create the production site in `dist/`.

## Firebase

The site uses Firebase Authentication (email and password) and Firebase Realtime Database. The client configuration in `src/main.js` points to the existing `zikr-garden-mansoor-2026` project. Database access rules are in `database.rules.json` and restrict each user to their own data.

To deploy to the existing Firebase project, sign in with the Firebase CLI and run `firebase deploy --project zikr-garden-mansoor-2026` after building. You need access to that Firebase project. For a different project, update the client configuration in `src/main.js`, enable email/password sign-in and Realtime Database, then deploy the rules and site to that project.
