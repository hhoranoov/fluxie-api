import { sendMessage } from './utils';

// Обмеження доступу
export async function restrictAccess(DB, TELEGRAM_URL, message, ownerID) {
  const userID = message?.from?.id;
  if (!userID) {
    await sendMessage(
      TELEGRAM_URL,
      message.chat.id,
      `⛔ Не вдалося отримати ваш ID. Будь ласка, спробуйте знову.`,
      { parse_mode: 'Markdown' }
    );
    return false;
  }

  if (userID == ownerID) return true;

  const role = await getUserRole(DB, userID);

  if (!role) {
    if (!message.text || message.text.toLowerCase() !== 'слава україні!') {
      await sendMessage(
        TELEGRAM_URL,
        message.chat.id,
        `⛔ *Доступ обмежений!*\n\n` +
        `Цей бот знаходиться в розробці. Напишіть "Слава Україні!" для запиту на доступ.`,
        { parse_mode: 'Markdown' }
      );
    } else {
      await sendMessage(
        TELEGRAM_URL,
        message.chat.id,
        `Дякуємо за підтвердження! Ось ваш ID: \`${userID}\`. Надішліть його в підтримку для отримання доступу до бота. Доступ безкоштовний!` +
        `\n\n- [Підтримка 1](t.me/horanov)`,
        { parse_mode: 'Markdown' }
      );
    }
    return false;
  }

  return true;
}

// Додавання користувача
export async function addUser(db, userId, role = 'user') {
  const userExists = await db.prepare('SELECT * FROM users WHERE id = ?').bind(userId).first();

  if (!userExists) {
    await db.prepare(`
			INSERT INTO users (id, role, registration_date)
			VALUES (?, ?, datetime('now'))
		`).bind(userId, role).run();
  } else {
    await db.prepare(`
			UPDATE users SET role = ? WHERE id = ?
		`).bind(role, userId).run();
  }
}

// Видалення користувача
export async function removeUser(DB, id) {
  await DB.prepare(`DELETE FROM users WHERE id = ?`).bind(id).run();
}

// Отримання користувача
export async function getUserRole(DB, id) {
  const result = await DB.prepare(`SELECT role FROM users WHERE id = ?`).bind(id).first();
  return result?.role || null;
}
