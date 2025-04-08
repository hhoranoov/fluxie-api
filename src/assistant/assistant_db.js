// Фільтрування історії
export async function getFilteredHistory(db, chatId) {
	const result = await db
		.prepare('SELECT sender, text, media_url FROM messages WHERE chat_id = ? ORDER BY id DESC LIMIT 100')
		.bind(chatId)
		.all();

	if (result && result.results) {
		return result.results.reverse().map((msg) => {
			if (msg.media_url) {
				return {
					role: msg.sender === 'user' ? 'user' : 'assistant',
					content: msg.text,
					media_url: msg.media_url,
				};
			} else {
				return {
					role: msg.sender === 'user' ? 'user' : 'assistant',
					content: msg.text,
				};
			}
		});
	}
	return [];
}

// Видалення історії чату
export async function deleteChatHistory(db, chatId) {
	try {
		await db.prepare('DELETE FROM messages WHERE chat_id = ?').bind(chatId).run();
		return { success: true, message: '🧹 Історію чату успішно видалено.' };
	} catch (error) {
		console.error('Помилка при видаленні історії чату:', error);
		return { success: false, message: '❗️ Помилка при видаленні історії.' };
	}
}

// Збереження історії
export async function saveUserData(db, userId, data) {
	const existingData = await getUserData(db, userId);
	if (!existingData) {
		await db.prepare('INSERT INTO user_data (user_id, data) VALUES (?, ?)').bind(userId, JSON.stringify(data)).run();
	} else {
		const updatedData = { ...existingData, ...data };
		await db.prepare('UPDATE user_data SET data = ? WHERE user_id = ?').bind(JSON.stringify(updatedData), userId).run();
	}
}

// Отримання історії
export async function getUserData(db, userId) {
	const result = await db.prepare('SELECT data FROM user_data WHERE user_id = ?').bind(userId).first();
	return result?.data ? JSON.parse(result.data) : null;
}

// Збереження повідомлення
export async function saveMessage(db, userId, chatId, sender, text, mediaUrl = null) {
	if (mediaUrl) {
		await db
			.prepare('INSERT INTO messages (user_id, chat_id, sender, text, media_url) VALUES (?, ?, ?, ?, ?)')
			.bind(userId, chatId, sender, text, mediaUrl)
			.run();
	} else {
		await db.prepare('INSERT INTO messages (user_id, chat_id, sender, text) VALUES (?, ?, ?, ?)').bind(userId, chatId, sender, text).run();
	}
}

// Функція статистики
export async function updateUserStats(db, userId, statType) {
	await db
		.prepare(
			`
		INSERT INTO user_stats (user_id, ${statType})
		VALUES (?, 1)
		ON CONFLICT(user_id) DO UPDATE SET ${statType} = ${statType} + 1
	`
		)
		.bind(userId)
		.run();
}
