// 1. Функція отримання цілей DB
export async function getUserStreaks(db, chatId) {
	const result = await db.prepare('SELECT streaks FROM user_streaks WHERE chat_id = ?').bind(chatId).first();
	return result?.streaks ? JSON.parse(result.streaks) : {};
}

// 2. Функція зберігання цілей DB
export async function saveUserStreaks(db, chatId, streaks) {
	await db.prepare('INSERT OR REPLACE INTO user_streaks (chat_id, streaks) VALUES (?, ?)').bind(chatId, JSON.stringify(streaks)).run();
}
