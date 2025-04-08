import { handleAddTask, handleViewTasks, handleStats } from './tasks';
import { sendMessage } from '../utils/utils';

// Додавання завданння
export async function handleAddCommand(db, TELEGRAM_URL, message) {
	const args = message.text.substring(5).trim().split(' ');
	if (args.length < 3) {
		const reply = 'Неправильний формат команди. Використовуйте /add <день> <час> <завдання>';
		await sendMessage(TELEGRAM_URL, message.chat.id, reply);
		return;
	}
	const [dayArg, timeArg, ...taskParts] = args;
	const task = taskParts.join(' ');
	await handleAddTask(db, TELEGRAM_URL, message.chat.id, dayArg, timeArg, task);
}

// Перегляд сьогодні
export async function handleTodayCommand(db, TELEGRAM_URL, message) {
	await handleViewTasks(db, TELEGRAM_URL, message.chat.id, 'today');
}

// Перегляд певного дня
export async function handleTasksCommand(db, TELEGRAM_URL, message) {
	const dayArg = message.text.substring(7).trim() || 'today';
	await handleViewTasks(db, TELEGRAM_URL, message.chat.id, dayArg);
}

// Функція статистики
export async function handleStatsCommand(db, TELEGRAM_URL, message) {
	const period = message.text.substring(7).trim().toLowerCase();
	if (period === 'week' || period === 'month') {
		await handleStats(db, TELEGRAM_URL, message.chat.id, period);
	} else {
		const reply = 'Невідомий період. Використовуйте /stats week або /stats month.';
		await sendMessage(TELEGRAM_URL, message.chat.id, reply);
	}
}
