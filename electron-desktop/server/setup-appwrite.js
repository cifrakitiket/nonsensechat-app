/* ════════════════════════════════════════════════════════════════════════
   ОДНОРАЗОВАЯ НАСТРОЙКА СХЕМЫ APPWRITE
   Создаёт базу, коллекции (с атрибутами и индексами) и storage-бакет,
   которые нужны приложению. Запускать один раз после создания проекта.

   Требуется Node 18+ (встроенный fetch). Никаких npm install не нужно.

   Запуск (bash):
     APPWRITE_ENDPOINT="https://cloud.appwrite.io/v1" \
     APPWRITE_PROJECT="<PROJECT_ID>" \
     APPWRITE_API_KEY="<API_KEY>" \
     node server/setup-appwrite.js

   API-ключ создаётся в консоли Appwrite (Overview → Integrations → API Keys)
   со scope: databases.* и buckets/files (или просто все databases и storage).
   ════════════════════════════════════════════════════════════════════════ */

const ENDPOINT = (process.env.APPWRITE_ENDPOINT || 'https://cloud.appwrite.io/v1').replace(/\/+$/, '');
const PROJECT = process.env.APPWRITE_PROJECT || '';
const API_KEY = process.env.APPWRITE_API_KEY || '';
const DB_ID = process.env.APPWRITE_DB || 'nonsense';
const BUCKET = process.env.APPWRITE_BUCKET || 'uploads';

if (!PROJECT || !API_KEY) {
  console.error('Задайте переменные окружения APPWRITE_PROJECT и APPWRITE_API_KEY.');
  console.error('Пример: APPWRITE_PROJECT=xxx APPWRITE_API_KEY=yyy node server/setup-appwrite.js');
  process.exit(1);
}

const DOC_SIZE = 1000000; // максимум для атрибута doc (JSON строкой), ~1 МБ

// Разрешения: любой залогиненный пользователь читает/пишет (как было в compat-слое).
const CRUD_USERS = ['create("users")', 'read("users")', 'update("users")', 'delete("users")'];
const BUCKET_PERMS = ['create("users")', 'read("any")', 'update("users")', 'delete("users")'];

// [key, size, required, array?]
const COLLECTIONS = {
  users: {
    strings: [['doc_id', 64, true], ['nick_lower', 128, false], ['doc', DOC_SIZE, false]],
    indexes: [['doc_id', ['doc_id']], ['nick_lower', ['nick_lower']]]
  },
  chats: {
    // members — массив; Appwrite не поддерживает индексы на массивах, поэтому
    // фильтр по members идёт клиентским сканом (см. appwrite-client.js).
    strings: [['doc_id', 64, true], ['type', 32, false], ['privacy', 32, false], ['members', 64, false, true], ['doc', DOC_SIZE, false]],
    indexes: [['doc_id', ['doc_id']]]
  },
  messages: {
    strings: [['doc_id', 64, true], ['chat_id', 64, false], ['at', 40, false], ['msg_type', 32, false], ['doc', DOC_SIZE, false]],
    indexes: [['doc_id', ['doc_id']], ['chat_id', ['chat_id']], ['at', ['at']]]
  },
  folders: {
    strings: [['doc_id', 64, true], ['user_id', 64, false], ['doc', DOC_SIZE, false]],
    doubles: [['ord', false]],
    indexes: [['doc_id', ['doc_id']], ['user_id', ['user_id']]]
  },
  call_history: {
    strings: [['doc_id', 64, true], ['chat_id', 64, false], ['doc', DOC_SIZE, false]],
    indexes: [['doc_id', ['doc_id']], ['chat_id', ['chat_id']]]
  },
  friend_requests: {
    strings: [['doc_id', 64, true], ['to_uid', 64, false], ['doc', DOC_SIZE, false]],
    indexes: [['doc_id', ['doc_id']], ['to_uid', ['to_uid']]]
  },
  sticker_packs: {
    strings: [['doc_id', 64, true], ['doc', DOC_SIZE, false]],
    indexes: [['doc_id', ['doc_id']]]
  },
  call_sessions: {
    strings: [['doc_id', 64, true], ['doc', DOC_SIZE, false]],
    indexes: [['doc_id', ['doc_id']]]
  }
};

function sleep(ms) { return new Promise((r) => setTimeout(r, ms)); }

async function req(method, path, body) {
  const res = await fetch(ENDPOINT + path, {
    method,
    headers: {
      'Content-Type': 'application/json',
      'X-Appwrite-Project': PROJECT,
      'X-Appwrite-Key': API_KEY
    },
    body: body ? JSON.stringify(body) : undefined
  });
  let json = {};
  try { json = await res.json(); } catch (_) {}
  return { ok: res.ok, status: res.status, json };
}

// 409 = уже существует → считаем успехом (идемпотентность).
async function ensure(label, method, path, body) {
  const r = await req(method, path, body);
  if (r.ok) { console.log('  ✓ ' + label); return r.json; }
  if (r.status === 409) { console.log('  = ' + label + ' (уже есть)'); return r.json; }
  const msg = (r.json && r.json.message) || ('HTTP ' + r.status);
  throw new Error(label + ' → ' + msg);
}

async function waitAttrsAvailable(col, keys) {
  for (let attempt = 0; attempt < 60; attempt++) {
    const r = await req('GET', `/databases/${DB_ID}/collections/${col}/attributes`);
    const list = (r.json && r.json.attributes) || [];
    const byKey = {};
    for (const a of list) byKey[a.key] = a.status;
    const pending = keys.filter((k) => byKey[k] !== 'available');
    if (pending.length === 0) return;
    await sleep(1000);
  }
  console.warn(`  ! Атрибуты ${col} не перешли в available за отведённое время — индексы могут не создаться.`);
}

async function main() {
  console.log(`Appwrite setup → ${ENDPOINT} (project ${PROJECT})`);

  console.log('База данных:');
  // На free-плане лимит в 1 БД: повторный POST даёт не 409, а ошибку лимита.
  // Поэтому сначала проверяем наличие через GET.
  const dbCheck = await req('GET', `/databases/${DB_ID}`);
  if (dbCheck.ok) {
    console.log('  = database ' + DB_ID + ' (уже есть)');
  } else {
    await ensure(`database ${DB_ID}`, 'POST', '/databases', { databaseId: DB_ID, name: 'Nonsense' });
  }

  for (const [col, def] of Object.entries(COLLECTIONS)) {
    console.log(`\nКоллекция ${col}:`);
    await ensure(`collection ${col}`, 'POST', `/databases/${DB_ID}/collections`, {
      collectionId: col,
      name: col,
      permissions: CRUD_USERS,
      documentSecurity: false
    });

    const attrKeys = [];
    for (const [key, size, required, array] of (def.strings || [])) {
      await ensure(`attr ${col}.${key} (string)`, 'POST', `/databases/${DB_ID}/collections/${col}/attributes/string`, {
        key, size, required: !!required, array: !!array
      });
      attrKeys.push(key);
    }
    for (const [key, required] of (def.doubles || [])) {
      await ensure(`attr ${col}.${key} (float)`, 'POST', `/databases/${DB_ID}/collections/${col}/attributes/float`, {
        key, required: !!required, default: required ? undefined : 0
      });
      attrKeys.push(key);
    }

    console.log(`  … ждём готовности атрибутов ${col}`);
    await waitAttrsAvailable(col, attrKeys);

    for (const [key, attributes] of (def.indexes || [])) {
      await ensure(`index ${col}.${key}`, 'POST', `/databases/${DB_ID}/collections/${col}/indexes`, {
        key, type: 'key', attributes, orders: attributes.map(() => 'ASC')
      });
    }
  }

  console.log('\nStorage-бакет:');
  await ensure(`bucket ${BUCKET}`, 'POST', '/storage/buckets', {
    bucketId: BUCKET,
    name: 'uploads',
    permissions: BUCKET_PERMS,
    fileSecurity: false,
    enabled: true
  });

  console.log('\n✅ Готово. Схема Appwrite создана.');
  console.log(`   endpoint:   ${ENDPOINT}`);
  console.log(`   projectId:  ${PROJECT}`);
  console.log(`   databaseId: ${DB_ID}`);
  console.log(`   bucketId:   ${BUCKET}`);
  console.log('\nВставьте эти значения в public/index.html → window.NONSENSE_APPWRITE.');
}

main().catch((e) => {
  console.error('\n✗ Ошибка настройки:', e.message);
  process.exit(1);
});
