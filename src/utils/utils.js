async function sendTelegramRequest(TELEGRAM_URL, method, payload) {
  const response = await fetch(`${TELEGRAM_URL}/${method}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  const data = await response.json();
  return data.result || data;
}

export async function sendMessage(TELEGRAM_URL, chatId, text, options = {}) {
  return sendTelegramRequest(TELEGRAM_URL, 'sendMessage', { chat_id: chatId, text, ...options });
}

export async function editTelegramMessage(TELEGRAM_URL, chatId, messageId, text, options = {}) {
  return sendTelegramRequest(TELEGRAM_URL, 'editMessageText', { chat_id: chatId, message_id: messageId, text, ...options });
}

export async function sendPhoto(TELEGRAM_URL, chatId, photoUrl, caption = '') {
  return sendTelegramRequest(TELEGRAM_URL, 'sendPhoto', { chat_id: chatId, photo: photoUrl, caption });
}

export async function getFile(TELEGRAM_URL, fileId) {
  const response = await fetch(`${TELEGRAM_URL}/getFile?file_id=${fileId}`);
  const data = await response.json();
  return data.result;
}

export async function sendChatAction(TELEGRAM_URL, chatId, action) {
  return sendTelegramRequest(TELEGRAM_URL, 'sendChatAction', { chat_id: chatId, action });
}

export async function deleteMessage(TELEGRAM_URL, chatId, messageId) {
  try {
    await sendTelegramRequest(TELEGRAM_URL, 'deleteMessage', { chat_id: chatId, message_id: messageId });
  } catch (error) {
    console.error('Не вдалося видалити повідомлення:', error);
  }
}

export async function answerCallbackQuery(TELEGRAM_URL, callbackQueryId) {
  const payload = {
    callback_query_id: callbackQueryId,
  };
  return sendTelegramRequest(TELEGRAM_URL, 'answerCallbackQuery', payload);
}

export async function setMessageReaction(TELEGRAM_URL, chatId, messageId, reaction) {
  const payload = {
    chat_id: chatId,
    message_id: messageId,
    reaction,
    is_big: true,
  };

  const result = await sendTelegramRequest(TELEGRAM_URL, 'setMessageReaction', payload);
  return result;
}
