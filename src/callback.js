import { answerCallbackQuery, editTelegramMessage } from "./utils/utils";
import { handleHelpCommand } from "./tech/tech_h";

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
- /image <промпт> - згенерити зображення\n
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
	} else {
		console.error('Unknown callback data:', data);
	}
	await answerCallbackQuery(TELEGRAM_URL, callbackQueryId);
}
