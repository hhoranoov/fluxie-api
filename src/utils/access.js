import { sendMessage } from './utils';

// 1. Функція обмеження доступу
export async function restrictAccess(DB, TELEGRAM_URL, message, ownerID) {
  const userID = message?.from?.id;
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

export async function removeUser(DB, id) {
  await DB.prepare(`DELETE FROM users WHERE id = ?`).bind(id).run();
}

export async function getUserRole(DB, id) {
  const result = await DB.prepare(`SELECT role FROM users WHERE id = ?`).bind(id).first();
  return result?.role || null;
}
