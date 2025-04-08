import { handleTaskType, getWeekNumber, sortTasksByTime, handleViewTasks, handleViewTasksButtons } from "./tasks/tasks";
import { answerCallbackQuery, editTelegramMessage, sendMessage } from "./utils/utils";
import { getLessonsForDay, deleteLesson} from "./university/university_db"
import { handleHelpCommand } from "./tech/tech_h";
import { getTasks } from "./tasks/tasks_db";

export async function processQuery(env, TELEGRAM_URL, callbackQuery) {
	const chatId = callbackQuery.message.chat.id;
	const messageId = callbackQuery.message.message_id;
	const data = callbackQuery.data;
	const callbackQueryId = callbackQuery.id;

	const helpTexts = {
		help_tasks: {
			text: `📝 *Команди для завдань:*\n
- /add <день> <час> <завдання> - додати нове завдання\n
- /today - переглянути завдання на сьогодні\n
- /tasks <день> - переглянути завдання на конкретний день\n
**Функціонал в розробці**`,
			keyboard: [[{ text: '⬅️ Назад', callback_data: 'help' }]],
		},

		help_ai: {
			text: `💠 *Команди ШІ:*\n
- /status - перевірити статус ШІ сервісів\n
- /gen <промпт> або згенеруй <промпт> - згенерити зображення\n
- /remember <дані> - додати в пам'ять ШІ`,
			keyboard: [[{ text: '⬅️ Назад', callback_data: 'help' }]],
		},

		help_main: {
			text: `🚀 *Основні команди:*\n
- /start - почати роботу з ботом\n
- /help - отримати допомогу\n
- /id - отримати ID користувача`,
			keyboard: [[{ text: '⬅️ Назад', callback_data: 'help' }]],
		},

		help_stats: {
			text: `📊 *Статистика:*\n
- /stats week - статистика за тиждень\n
- /stats month - статистика за місяць`,
			keyboard: [[{ text: '⬅️ Назад', callback_data: 'help' }]],
		},

		help_streaks: {
			text: `🎯 *Цілі (Streaks):*\n
- /streak add <назва> - додати нову ціль\n
- /streak check - перевірити streaks\n
- /streak delete <назва> - видалити ціль`,
			keyboard: [[{ text: '⬅️ Назад', callback_data: 'help' }]],
		},
	};

	const db = env.DB;

	if (helpTexts[data]) {
		await editTelegramMessage(TELEGRAM_URL, chatId, messageId, helpTexts[data].text, {
			parse_mode: 'Markdown',
			reply_markup: JSON.stringify({ inline_keyboard: helpTexts[data].keyboard }),
		});
	} else if (data === 'help') {
		await handleHelpCommand(env, TELEGRAM_URL, callbackQuery.message, false);
	} else if (data.startsWith('type_')) {
		const parts = data.split('_');
		const dayArg = parts[1];
		const timeArg = parts[2];
		const task = parts.slice(3, -1).join(' ');
		const taskType = parts[parts.length - 1];
		await handleTaskType(db, TELEGRAM_URL, chatId, dayArg, timeArg, task, taskType);
	} else if (data.startsWith('task_')) {
		const parts = data.split('_');
		const viewDay = parts[1];
		const taskIndex = parseInt(parts[2], 10);
		let tasks = await getTasks(db, chatId);
		const tasksForDay = tasks[viewDay] || [];
		const filteredTasks = tasksForDay.filter((task) => {
			if (task.type === 'recursive') {
				return true;
			}
			return task.week === getWeekNumber(new Date());
		});
		const sortedTasks = sortTasksByTime(filteredTasks);
		if (taskIndex >= 0 && taskIndex < sortedTasks.length) {
			const taskInfo = sortedTasks[taskIndex];
			const toggleStatusText = taskInfo.status === 'Не виконано' ? '✅ Виконано' : '❌ Не виконано';
			const inlineKeyboard = {
				inline_keyboard: [
					[
						{ text: toggleStatusText, callback_data: `toggle_${viewDay}_${taskIndex}` },
						{ text: '🗑️ Видалити', callback_data: `delete_${viewDay}_${taskIndex}` },
					],
					[{ text: 'Назад', callback_data: `back_${viewDay}` }],
				],
			};
			const messageText = `Завдання: *${taskInfo.task}*\nЧас: *${taskInfo.time}*\nСтатус: *${taskInfo.status === 'Не виконано' ? '❌' : '✅'
				}*`;
			await editTelegramMessage(TELEGRAM_URL, chatId, messageId, messageText, { reply_markup: inlineKeyboard, parse_mode: 'Markdown' });
		} else {
			await sendMessage(TELEGRAM_URL, chatId, 'Завдання не знайдено 🔍');
		}
	} else if (data.startsWith('toggle_')) {
		const parts = data.split('_');
		const viewDay = parts[1];
		const taskIndex = parseInt(parts[2], 10);
		let tasks = await getTasks(db, chatId);
		const tasksForDay = tasks[viewDay] || [];
		const filteredTasks = tasksForDay.filter((task) => {
			if (task.type === 'recursive') {
				return true;
			}
			return task.week === getWeekNumber(new Date());
		});
		const sortedTasks = sortTasksByTime(filteredTasks);
		if (taskIndex >= 0 && taskIndex < sortedTasks.length) {
			const taskInfo = sortedTasks[taskIndex];
			taskInfo.status = taskInfo.status === 'Не виконано' ? 'Виконано' : 'Не виконано';
			if (taskInfo.status === 'Виконано') {
				taskInfo.completed_at = new Date().toISOString();
				taskInfo.last_completed_at = new Date().toISOString();
			}
			await db
				.prepare('UPDATE tasks SET status = ?, completed_at = ?, last_completed_at = ? WHERE id = ?')
				.bind(taskInfo.status, taskInfo.completed_at, taskInfo.last_completed_at, taskInfo.id)
				.run();
			await handleViewTasks(db, TELEGRAM_URL, chatId, viewDay, messageId);
		} else {
			await sendMessage(TELEGRAM_URL, chatId, 'Завдання не знайдено 🔍');
		}
	} else if (data.startsWith('delete_')) {
		const parts = data.split('_');
		const viewDay = parts[1];
		const taskIndex = parseInt(parts[2], 10);
		let tasks = await getTasks(db, chatId);
		const tasksForDay = tasks[viewDay] || [];
		const filteredTasks = tasksForDay.filter((task) => {
			if (task.type === 'recursive') {
				return true;
			}
			return task.week === getWeekNumber(new Date());
		});
		const sortedTasks = sortTasksByTime(filteredTasks);
		if (taskIndex >= 0 && taskIndex < sortedTasks.length) {
			const taskInfo = sortedTasks[taskIndex];
			await db.prepare('DELETE FROM tasks WHERE id = ?').bind(taskInfo.id).run();
			await handleViewTasks(db, TELEGRAM_URL, chatId, viewDay, messageId);
		} else {
			await sendMessage(TELEGRAM_URL, chatId, 'Завдання не знайдено 🔍');
		}
	} else if (data.startsWith('refresh_')) {
		const parts = data.split('_');
		const viewDay = parts[1];
		await handleViewTasksButtons(db, TELEGRAM_URL, chatId, viewDay, messageId);
	} else if (data.startsWith('back_')) {
		const parts = data.split('_');
		const viewDay = parts[1];
		await handleViewTasks(db, TELEGRAM_URL, chatId, viewDay, messageId);
	} else if (data.startsWith('delete_all_')) {
		const parts = data.split('_');
		const viewDay = parts[1];
		await db.prepare('DELETE FROM tasks WHERE chat_id = ? AND day = ?').bind(chatId, viewDay).run();
		await handleViewTasks(db, TELEGRAM_URL, chatId, viewDay, messageId);
	} else if (data.startsWith('del_')) {
		const [action, lessonId, day] = data.split('_');
		const validDays = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
		const classTimes = ['9.00 – 10.35', '10.50 – 12.25', '12.45 – 14.20', '14.30 – 16.05', '16.15 – 17.50', '18.00 – 19.35'];

		if (!validDays.includes(day)) {
			return await sendMessage(TELEGRAM_URL, chatId, '❌ Невірний день. Використовуйте один із: Monday–Sunday.');
		}

		await deleteLesson(env.DB, lessonId);

		const lessons = await getLessonsForDay(env.DB, chatId, day);

		if (lessons.length === 0) {
			await editTelegramMessage(TELEGRAM_URL, chatId, messageId, 'ℹ️ На цьому дні пар немає.');
		} else {
			let text = `📅 *Розклад на ${day.charAt(0).toUpperCase() + day.slice(1)}:*\n\n`;

			const buttons = lessons.map((lesson) => [
				{ text: `❌ Видалити ${lesson.subject} (${lesson.room})`, callback_data: `del_${lesson.id}_${day}` },
			]);

			lessons.forEach((l, i) => {
				text += `🕓 *Пара ${i + 1}:* (${classTimes[i]})\n`;
				text += `📚 *Предмет*: ${l.subject}\n`;
				text += `🏫 *Аудиторія*: ${l.room}\n\n`;
			});

			await editTelegramMessage(TELEGRAM_URL, chatId, messageId, text, {
				parse_mode: 'Markdown',
				reply_markup: { inline_keyboard: buttons },
			});
		}
	} else {
		console.error('Unknown callback data:', data);
	}
	await answerCallbackQuery(TELEGRAM_URL, callbackQueryId);
}
