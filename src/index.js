import { handleIdCommand, handleSettingsCommand, handleBroadcastCommand, handleStartCommand, handleHelpCommand } from "./tech/tech_h";
import { handleAddCommand, handleTodayCommand, handleTasksCommand, handleStatsCommand } from "./tasks/tasks_h";
import { handleStatusCommand, handleClearCommand, handleSetDataCommand } from "./assistant/assistant_h";
import { handlePhotoCommand, handleDefaultText, handleImageCommand } from "./assistant/assistant";
import { saveUserData, saveMessage } from "./assistant/assistant_db";
import { restrictAccess, handleUserResponse } from "./utils/access";
import { handleUniversityCommand } from "./university/university";
import { handleStreakCommand } from "./streaks/streak_h";
import { processReaction } from "./utils/reactions";
import { setMessageReaction } from "./utils/utils";
import { processQuery } from "./callback";

// Дефолт
export default {
	async fetch(request, env) {
		const TELEGRAM_URL = `https://api.telegram.org/bot${env.TELEGRAM_TOKEN}`;
		let update = {};
		try {
			const text = await request.text();
			update = text ? JSON.parse(text) : {};
		} catch (error) {
			console.error('Помилка при розборі JSON:', error);
		}

		if (update.callback_query) {
			await processQuery(env, TELEGRAM_URL, update.callback_query);
		} else if (update.message) {
			await processMessage(env, TELEGRAM_URL, update.message);
		}
		return new Response('OK');
	},
};

// Обробка повідомлень
export async function processMessage(env, TELEGRAM_URL, message) {
	const allowedUsers = JSON.parse(env.USERS || '[]');
	const admins = Array.isArray(env.ADMINS) ? env.ADMINS : JSON.parse(env.ADMINS || '[]');

	if (!message.text?.startsWith('/id') && !(await restrictAccess(TELEGRAM_URL, message, allowedUsers))) return;

	const isGroupChat = ['group', 'supergroup'].includes(message?.chat?.type);
	const botUsername = 'fluxie_bot';
	const triggerWords = ['Флюксі', 'Флю', 'Ксі', 'Fluxie', 'Flu', 'Xie'];
	const lowerText = message?.text?.toLowerCase() || '';
	const lowerCaption = message?.caption?.toLowerCase() || '';
	const hasTrigger = triggerWords.some((word) => lowerText.includes(word) || lowerCaption.includes(word));
	const isBotReplied = message?.reply_to_message?.from?.username === botUsername;
	const shouldRespond = !isGroupChat || hasTrigger || isBotReplied;

	const reaction = processReaction(message);
	if (reaction) await setMessageReaction(TELEGRAM_URL, message.chat.id, message.message_id, reaction);

	if (!shouldRespond) return;

	if (message?.from?.first_name) {
		await saveUserData(env.DB, message.from.id, { first_name: message.from.first_name });
	}

	if (message?.text) {
		await saveMessage(env.DB, message.from.id, message.chat.id, 'user', message.text);
		await handleTextCommand(env, TELEGRAM_URL, message, admins);
	} else if (message?.photo) {
		await handlePhotoCommand(env, TELEGRAM_URL, message);
	} else {
		await handleUserResponse(TELEGRAM_URL, message);
	}
}

async function handleTextCommand(env, TELEGRAM_URL, message, admins) {
	const text = message.text.toLowerCase();
	const commandHandlers = {
		'/gen': () => handleImageCommand(env, TELEGRAM_URL, message),
		згенеруй: () => handleImageCommand(env, TELEGRAM_URL, message),
		'/remember': () => handleSetDataCommand(env.DB, TELEGRAM_URL, message),
		'/clear': () => handleClearCommand(env.DB, TELEGRAM_URL, message),
		'/status': () => handleStatusCommand(env, TELEGRAM_URL, message),
		'/id': () => handleIdCommand(env, TELEGRAM_URL, message),
		'/settings': () => handleSettingsCommand(env, TELEGRAM_URL, message),
		'/broadcast': () => handleBroadcastCommand(env, TELEGRAM_URL, message, admins),
		'/start': () => handleStartCommand(env, TELEGRAM_URL, message),
		'/help': () => handleHelpCommand(env, TELEGRAM_URL, message),
		'/streak': () => handleStreakCommand(env.DB, TELEGRAM_URL, message),
		'/add': () => handleAddCommand(env.DB, TELEGRAM_URL, message),
		'/today': () => handleTodayCommand(env.DB, TELEGRAM_URL, message),
		'/tasks': () => handleTasksCommand(env.DB, TELEGRAM_URL, message),
		'/stats': () => handleStatsCommand(env.DB, TELEGRAM_URL, message),
		'/university': () => handleUniversityCommand(env.DB, TELEGRAM_URL, message),
	};

	const command = Object.keys(commandHandlers).find((cmd) => text.startsWith(cmd));
	if (command) {
		await commandHandlers[command]();
	} else {
		await handleDefaultText(env.DB, TELEGRAM_URL, message);
	}
}
