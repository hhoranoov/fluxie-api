import { deleteChatHistory, saveMessage, saveUserData } from '../assistant/assistant_db';
import { checkServicesAvailability } from '../assistant/assistant';
import { sendMessage } from '../utils/utils';

// Перевірка статусу
export async function handleStatusCommand(env, TELEGRAM_URL, message) {
  const status = await checkServicesAvailability();
  const reply = `
🔍 *Перевірка стану сервісів*

• *Генерація тексту:* ${status.textGeneration ? '✅ Доступно' : '❌ Недоступно'}
• *Генерація зображень:* ${status.imageGeneration ? '✅ Доступно' : '❌ Недоступно'}
• *Розпізнавання зображень:* ${status.imageRecognition ? '✅ Доступно' : '❌ Недоступно'}

_Переконайтеся, що всі сервіси працюють належним чином._
  `.trim();

  await sendMessage(TELEGRAM_URL, message.chat.id, reply, { parse_mode: 'Markdown' });
  await saveMessage(env.DB, message.from.id, message.chat.id, 'bot', reply);
}

// Видалення історії
export async function handleClearCommand(db, TELEGRAM_URL, message) {
  const result = await deleteChatHistory(db, message.chat.id);
  await sendMessage(TELEGRAM_URL, message.chat.id, result.message);
}

// Додавання важливої інформації
export async function handleSetDataCommand(db, TELEGRAM_URL, message) {
  const data = message.text.substring(8).trim();
  if (!data) {
    const reply = '📃 Будь ласка, надайте дані для запису.';
    await sendMessage(TELEGRAM_URL, message.chat.id, reply);
    return;
  }
  await saveUserData(db, message.from.id, data);
  const reply = `🎉 Дані успішно записані: \`${data}\``;
  await sendMessage(TELEGRAM_URL, message.chat.id, reply, { parse_mode: 'Markdown' });
  await saveMessage(db, message.from.id, message.chat.id, 'bot', reply);
}
