const functions = require('firebase-functions');
const admin = require('firebase-admin');
const cors = require('cors')({ origin: true });

admin.initializeApp();

const bucket = admin.storage().bucket();

exports.getUploadUrl = functions.https.onCall(async (data, context) => {
  // Проверка авторизации
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
  }

  const { fileName, chatId } = data;

  if (!fileName || !chatId) {
    throw new functions.https.HttpsError('invalid-argument', 'fileName and chatId are required');
  }

  try {
    const file = bucket.file(`chats/${chatId}/${Date.now()}_${fileName}`);
    
    const [url] = await file.getSignedUrl({
      version: 'v4',
      action: 'write',
      expires: Date.now() + 15 * 60 * 1000, // 15 minutes
      contentType: 'application/octet-stream',
    });

    return { 
      uploadUrl: url,
      fileName: file.name
    };
  } catch (error) {
    console.error('Error generating upload URL:', error);
    throw new functions.https.HttpsError('internal', 'Failed to generate upload URL');
  }
});

exports.getDownloadUrl = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
  }

  const { filePath } = data;

  if (!filePath) {
    throw new functions.https.HttpsError('invalid-argument', 'filePath is required');
  }

  try {
    const file = bucket.file(filePath);
    
    const [url] = await file.getSignedUrl({
      version: 'v4',
      action: 'read',
      expires: Date.now() + 7 * 24 * 60 * 60 * 1000, // 7 days
    });

    return { downloadUrl: url };
  } catch (error) {
    console.error('Error generating download URL:', error);
    throw new functions.https.HttpsError('internal', 'Failed to generate download URL');
  }
});
