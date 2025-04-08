// Додати пару
export async function addLesson(db, chatId, day, subject, room) {
  await db.prepare('INSERT INTO schedule (chat_id, day, subject, room) VALUES (?, ?, ?, ?)').bind(chatId, day, subject, room).run();
}

// Отримати пару
export async function getLessonsForDay(db, chatId, day) {
  const { results } = await db.prepare('SELECT id, subject, room FROM schedule WHERE chat_id = ? AND day = ?').bind(chatId, day).all();
  return results || [];
}

// Видалити пару
export async function deleteLesson(db, lessonId) {
  await db.prepare('DELETE FROM schedule WHERE id = ?').bind(lessonId).run();
}
