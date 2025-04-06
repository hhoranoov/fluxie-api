import { sendMessage } from './utils';

// 1. Функція обмеження доступу
export async function restrictAccess(TELEGRAM_URL, message, allowedUsers) {
  const userID = message?.from?.id;

  if (!allowedUsers.includes(userID)) {
    if (!message.text || message.text.toLowerCase() !== 'слава україні!') {
      await sendMessage(
        TELEGRAM_URL,
        message.chat.id,
        `⛔ *Доступ обмежений!*\n\n` +
        `Цей бот знаходиться в розробці, і його використання доступне лише для вибраних користувачів. ` +
        `Щоб отримати доступ, напишіть "Слава Україні!".`,
        { parse_mode: 'Markdown' }
      );
    }
    return false;
  }
  return true;
}

// 2. Функція перевірки пропуску
export async function handleUserResponse(TELEGRAM_URL, message) {
  if (message.text && message.text.toLowerCase() === 'слава україні!') {
    await sendMessage(
      TELEGRAM_URL,
      message.chat.id,
      `🎉 Дякуємо за підтвердження! Напишіть в підтримку задля отримання доступу:\n\n` +
      `- [Підтримка 1](t.me/horanov)\n\n` +
      `_Відповідь протягом одного дня._`,
      { parse_mode: 'Markdown' }
    );
  }
}
