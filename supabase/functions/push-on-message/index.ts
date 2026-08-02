// ============================================================================
//  push-on-message  —  Supabase Edge Function (Deno)
//
//  Fires from a Database Webhook on INSERT into public.messages, looks up the
//  chat's other members, reads their users.doc.fcmTokens, and sends an FCM
//  HTTP v1 *data* message to each device so the Android app shows a notification
//  even when it is fully closed.
//
//  Secrets (set with `supabase secrets set ...`):
//    FIREBASE_SERVICE_ACCOUNT  — the full service-account JSON (one line)
//    SUPABASE_URL              — auto-provided by the platform
//    SUPABASE_SERVICE_ROLE_KEY — auto-provided by the platform
//
//  Deploy:
//    supabase functions deploy push-on-message --no-verify-jwt
//  Then add a Database Webhook (Dashboard → Database → Webhooks):
//    table=messages, events=INSERT, type=HTTP, URL=<function URL>.
// ============================================================================

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const FCM_PROJECT_ID = "nonsensechattm-e5d18";

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
);

// ── Google OAuth: mint an access token from the service account ──────────────

interface ServiceAccount {
  client_email: string;
  private_key: string;
}

function pemToArrayBuffer(pem: string): ArrayBuffer {
  const b64 = pem
    .replace(/-----BEGIN PRIVATE KEY-----/, "")
    .replace(/-----END PRIVATE KEY-----/, "")
    .replace(/\s+/g, "");
  const bin = atob(b64);
  const buf = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) buf[i] = bin.charCodeAt(i);
  return buf.buffer;
}

function base64url(data: string | Uint8Array): string {
  const str = typeof data === "string"
    ? btoa(data)
    : btoa(String.fromCharCode(...data));
  return str.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

async function getAccessToken(sa: ServiceAccount): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  const header = base64url(JSON.stringify({ alg: "RS256", typ: "JWT" }));
  const claim = base64url(JSON.stringify({
    iss: sa.client_email,
    scope: "https://www.googleapis.com/auth/firebase.messaging",
    aud: "https://oauth2.googleapis.com/token",
    iat: now,
    exp: now + 3600,
  }));
  const unsigned = `${header}.${claim}`;

  const key = await crypto.subtle.importKey(
    "pkcs8",
    pemToArrayBuffer(sa.private_key),
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = new Uint8Array(
    await crypto.subtle.sign("RSASSA-PKCS1-v1_5", key, new TextEncoder().encode(unsigned)),
  );
  const jwt = `${unsigned}.${base64url(sig)}`;

  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: `grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion=${jwt}`,
  });
  const json = await res.json();
  if (!json.access_token) throw new Error("OAuth failed: " + JSON.stringify(json));
  return json.access_token;
}

// ── Notification preview text by message type ────────────────────────────────

function previewFor(doc: Record<string, unknown>): string {
  switch (doc.type) {
    case "photo": return doc.caption ? String(doc.caption) : "📷 Photo";
    case "file": return "📎 " + (doc.fileName ?? "File");
    case "sticker": return (doc.emoji ? String(doc.emoji) + " " : "") + "Sticker";
    case "poll": return "📊 " + String((doc.poll as Record<string, unknown>)?.question ?? "Poll");
    default: return String(doc.text ?? "");
  }
}

// ── Remove a dead token from a user's doc via the doc_apply RPC ───────────────

async function pruneToken(uid: string, token: string) {
  await supabase.rpc("doc_apply", {
    _table: "users",
    _id: uid,
    _ops: [{ op: "arrayRemove", path: ["fcmTokens"], value: [token] }],
  });
}

// ── HTTP entrypoint ──────────────────────────────────────────────────────────

Deno.serve(async (req) => {
  try {
    const payload = await req.json();
    const record = payload.record ?? payload.new ?? payload;
    const doc: Record<string, unknown> = record.doc ?? {};
    const chatId: string | undefined = record.chat_id ?? (doc.chat_id as string);
    const senderUid = String(doc.uid ?? "");
    if (!chatId || doc.type === "system") return new Response("skip", { status: 200 });

    // Load the chat to find recipients and a group name.
    const { data: chatRow } = await supabase.from("chats").select("doc").eq("id", chatId).maybeSingle();
    const chatDoc = (chatRow?.doc ?? {}) as Record<string, unknown>;
    const members: string[] = (chatDoc.members as string[]) ?? [];
    const recipients = members.filter((m) => m !== senderUid);
    if (recipients.length === 0) return new Response("no recipients", { status: 200 });

    const senderName = String(doc.author ?? "Someone");
    const isGroup = chatDoc.type === "group" || chatDoc.type === "channel";
    const title = isGroup ? `${senderName} · ${chatDoc.name ?? "Group"}` : senderName;
    const body = previewFor(doc);

    // Collect FCM tokens for all recipients.
    const { data: users } = await supabase.from("users").select("id,doc").in("id", recipients);
    const targets: { uid: string; token: string }[] = [];
    for (const u of users ?? []) {
      const tokens: string[] = (((u.doc ?? {}) as Record<string, unknown>).fcmTokens as string[]) ?? [];
      for (const t of tokens) targets.push({ uid: u.id, token: t });
    }
    if (targets.length === 0) return new Response("no tokens", { status: 200 });

    const sa = JSON.parse(Deno.env.get("FIREBASE_SERVICE_ACCOUNT")!) as ServiceAccount;
    const accessToken = await getAccessToken(sa);
    const endpoint = `https://fcm.googleapis.com/v1/projects/${FCM_PROJECT_ID}/messages:send`;

    await Promise.all(targets.map(async ({ uid, token }) => {
      const res = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          message: {
            token,
            data: { chatId, title, body },
            android: { priority: "HIGH" },
          },
        }),
      });
      if (res.status === 404 || res.status === 403) {
        // Token no longer valid (UNREGISTERED / SenderId mismatch) — prune it.
        await pruneToken(uid, token).catch(() => {});
      }
    }));

    return new Response("ok", { status: 200 });
  } catch (e) {
    console.error("push-on-message error", e);
    return new Response("error", { status: 200 }); // 200 so the webhook isn't retried forever
  }
});
