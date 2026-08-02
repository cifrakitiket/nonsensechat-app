migrate((app) => {
  function createCollection(config) {
    try {
      app.findCollectionByNameOrId(config.name);
      return;
    } catch (_) {
      // Create only on a clean PocketBase instance. Dashboard edits remain untouched.
    }
    app.save(new Collection(config));
  }

  const authRule = '@request.auth.id != ""';
  const docField = { name: 'doc', type: 'json' };

  createCollection({
    type: 'auth',
    name: 'users',
    listRule: authRule,
    viewRule: authRule,
    createRule: '',
    updateRule: authRule,
    deleteRule: null,
    fields: [
      { name: 'doc_id', type: 'text' },
      docField,
      { name: 'nick_lower', type: 'text' }
    ],
    passwordAuth: { enabled: true }
  });

  createCollection({
    type: 'base',
    name: 'chats',
    listRule: authRule,
    viewRule: authRule,
    createRule: authRule,
    updateRule: authRule,
    deleteRule: authRule,
    fields: [
      { name: 'doc_id', type: 'text', required: true },
      docField,
      { name: 'members', type: 'json' },
      { name: 'type', type: 'text' },
      { name: 'privacy', type: 'text' }
    ],
    indexes: [
      'CREATE UNIQUE INDEX idx_chats_doc_id ON chats (doc_id)'
    ]
  });

  createCollection({
    type: 'base',
    name: 'messages',
    listRule: authRule,
    viewRule: authRule,
    createRule: authRule,
    updateRule: authRule,
    deleteRule: authRule,
    fields: [
      { name: 'doc_id', type: 'text', required: true },
      docField,
      { name: 'chat_id', type: 'text' },
      { name: 'at', type: 'text' },
      { name: 'msg_type', type: 'text' }
    ],
    indexes: [
      'CREATE UNIQUE INDEX idx_messages_doc_id ON messages (doc_id)',
      'CREATE INDEX idx_messages_chat_id ON messages (chat_id)'
    ]
  });

  createCollection({
    type: 'base',
    name: 'folders',
    listRule: authRule,
    viewRule: authRule,
    createRule: authRule,
    updateRule: authRule,
    deleteRule: authRule,
    fields: [
      { name: 'doc_id', type: 'text', required: true },
      docField,
      { name: 'user_id', type: 'text' },
      { name: 'ord', type: 'number' }
    ],
    indexes: [
      'CREATE UNIQUE INDEX idx_folders_doc_id ON folders (doc_id)',
      'CREATE INDEX idx_folders_user_id ON folders (user_id)'
    ]
  });

  createCollection({
    type: 'base',
    name: 'call_sessions',
    listRule: authRule,
    viewRule: authRule,
    createRule: authRule,
    updateRule: authRule,
    deleteRule: authRule,
    fields: [
      { name: 'doc_id', type: 'text', required: true },
      docField
    ],
    indexes: [
      'CREATE UNIQUE INDEX idx_call_sessions_doc_id ON call_sessions (doc_id)'
    ]
  });

  createCollection({
    type: 'base',
    name: 'call_history',
    listRule: authRule,
    viewRule: authRule,
    createRule: authRule,
    updateRule: authRule,
    deleteRule: authRule,
    fields: [
      { name: 'doc_id', type: 'text', required: true },
      docField,
      { name: 'chat_id', type: 'text' }
    ],
    indexes: [
      'CREATE UNIQUE INDEX idx_call_history_doc_id ON call_history (doc_id)',
      'CREATE INDEX idx_call_history_chat_id ON call_history (chat_id)'
    ]
  });

  createCollection({
    type: 'base',
    name: 'friend_requests',
    listRule: authRule,
    viewRule: authRule,
    createRule: authRule,
    updateRule: authRule,
    deleteRule: authRule,
    fields: [
      { name: 'doc_id', type: 'text', required: true },
      docField,
      { name: 'to_uid', type: 'text' }
    ],
    indexes: [
      'CREATE UNIQUE INDEX idx_friend_requests_doc_id ON friend_requests (doc_id)',
      'CREATE INDEX idx_friend_requests_to_uid ON friend_requests (to_uid)'
    ]
  });

  createCollection({
    type: 'base',
    name: 'sticker_packs',
    listRule: authRule,
    viewRule: authRule,
    createRule: authRule,
    updateRule: authRule,
    deleteRule: authRule,
    fields: [
      { name: 'doc_id', type: 'text', required: true },
      docField
    ],
    indexes: [
      'CREATE UNIQUE INDEX idx_sticker_packs_doc_id ON sticker_packs (doc_id)'
    ]
  });

  createCollection({
    type: 'base',
    name: 'uploads',
    listRule: authRule,
    viewRule: '',
    createRule: authRule,
    updateRule: authRule,
    deleteRule: authRule,
    fields: [
      { name: 'owner', type: 'text' },
      { name: 'file', type: 'file', maxSelect: 1, maxSize: 104857600 }
    ]
  });
}, (app) => {
  [
    'uploads',
    'sticker_packs',
    'friend_requests',
    'call_history',
    'call_sessions',
    'folders',
    'messages',
    'chats',
    'users'
  ].forEach((name) => {
    try { app.delete(app.findCollectionByNameOrId(name)); } catch (_) {}
  });
});
