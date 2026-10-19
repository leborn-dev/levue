# Firebase example

This demo reads, adds and removes users in a Realtime Database. It deliberately has no default connection to the old shared upstream demo project. Before `app.js` loads, supply `window.FIREBASE_CONFIG` with the web configuration of a project you control (for example in a locally served script). Without that configuration the example only displays setup instructions and does not initialize Firebase.

Firebase web API keys identify a project; they do not authorize database access. Apply API restrictions, Firebase Security Rules, and App Check as applicable before using your project. See [Firebase API key guidance](https://firebase.google.com/docs/projects/api-keys) and [Realtime Database security](https://firebase.google.com/docs/database/security). Use a separate key for non-Firebase APIs. Do not put server credentials or unrestricted Google API credentials in a client configuration.

The original configuration was identical to the public vuejs/vue v2.7.16 example. Its current restrictions and database rules are unknown; this change neither assumes they are safe nor changes that external project or historical commits.
