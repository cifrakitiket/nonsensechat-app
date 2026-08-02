# Push notifications — server side (FCM via Supabase Edge Function)

The Android client stores each device's FCM token in `users.doc.fcmTokens`. This Edge Function
fans a new message out to every other chat member's tokens via **FCM HTTP v1**, so notifications
arrive even when the app is killed.

`fcmTokens` needs **no schema migration** — `users.doc` is already `jsonb`, and the client adds the
array via the existing `doc_apply` `arrayUnion` op. The DB trigger `trg_users` is unaffected.

## One-time setup

### 1. Register the Android app in Firebase
- Firebase console → project **nonsensechattm-e5d18** → Add app → **Android**.
- Package name: `com.nonsense.chat`.
- Download **`google-services.json`** → place at `android/app/google-services.json`.
- Make sure **Cloud Messaging API (V1)** is enabled (Project settings → Cloud Messaging).

### 2. Create a Firebase service account (for the server to send)
- Firebase console → Project settings → **Service accounts** → *Generate new private key*.
- This downloads a JSON file. Keep it secret.

### 3. Deploy the function
```bash
# from the repo root
supabase login
supabase link --project-ref xpkiirwnpxyfwbrktmqm

# store the service account JSON as a secret (single line)
supabase secrets set FIREBASE_SERVICE_ACCOUNT="$(cat /path/to/service-account.json)"

supabase functions deploy push-on-message --no-verify-jwt
```
`SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are injected automatically at runtime.

### 4. Add the database webhook
Dashboard → **Database → Webhooks → Create**:
- Table: `messages`
- Events: **Insert**
- Type: **HTTP Request** → `POST`
- URL: the deployed function URL
  (`https://xpkiirwnpxyfwbrktmqm.functions.supabase.co/push-on-message`)
- (No extra headers needed; the function was deployed with `--no-verify-jwt`.)

## Test
1. Install the app on a device and sign in (this writes a token to `users.doc.fcmTokens`).
2. Fully close the app.
3. From the web client (or another device), send that user a message.
4. The device should show a notification; tapping it opens the right chat.

Dead tokens (HTTP 404/403 from FCM) are pruned from `users.doc.fcmTokens` automatically.
