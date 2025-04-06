// 1. Функція отримання завдань
export async function getTasks(db, chatId) {
	const rows = await db.prepare('SELECT * FROM tasks WHERE chat_id = ?').bind(chatId).all();
	const tasks = {};
	rows.results.forEach((row) => {
		if (!tasks[row.day]) tasks[row.day] = [];
		tasks[row.day].push({
			id: row.id,
			chat_id: row.chat_id,
			day: row.day,
			time: row.time,
			task: row.task,
			status: row.status,
			type: row.type,
			week: row.week,
			completed_at: row.completed_at,
			last_completed_at: row.last_completed_at,
		});
	});
	return tasks;
}

// 2. Функція збереження завдань
export async function saveTasks(db, chatId, tasks) {
	await db.prepare('DELETE FROM tasks WHERE chat_id = ?').bind(chatId).run();
	for (const day in tasks) {
		for (const task of tasks[day]) {
			await db
				.prepare(
					'INSERT INTO tasks (chat_id, day, time, task, status, type, week, completed_at, last_completed_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)'
				)
				.bind(task.chat_id, task.day, task.time, task.task, task.status, task.type, task.week, task.completed_at, task.last_completed_at)
				.run();
		}
	}
}
