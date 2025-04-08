import { handleIdCommand, handleSettingsCommand, handleBroadcastCommand, handleStartCommand, handleHelpCommand } from "./tech/tech_h";
import { handleAddCommand, handleTodayCommand, handleTasksCommand, handleStatsCommand } from "./tasks/tasks_h";
import { handleStatusCommand, handleClearCommand, handleSetDataCommand } from "./assistant/assistant_h";
import { handlePhotoCommand, handleDefaultText, handleImageCommand } from "./assistant/assistant";
import { restrictAccess, addUser, removeUser, getUserRole } from "./utils/access";
import { saveUserData, saveMessage } from "./assistant/assistant_db";
import { handleUniversityCommand } from "./university/university";
import { setMessageReaction, sendMessage } from "./utils/utils";
import { handleStreakCommand } from "./streaks/streak_h";
import { processReaction } from "./utils/reactions";
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
	const ownerID = parseInt(env.OWNER_ID);

	if (!message.text?.startsWith('/id') &&
		!(await restrictAccess(env.DB, TELEGRAM_URL, message, ownerID))) return;

	const isGroupChat = ['group', 'supergroup'].includes(message?.chat?.type);
	const botUsername = 'fluxie_bot';
	const triggerWords = ['Флюксі', 'Флю', 'Ксі', 'Fluxie', 'Flu', 'Xie'];
	const lowerText = message?.text?.toLowerCase() || '';
	const lowerCaption = message?.caption?.toLowerCase() || '';
	const hasTrigger = triggerWords.some(word => lowerText.includes(word) || lowerCaption.includes(word));
	const isBotReplied = message?.reply_to_message?.from?.username === botUsername;
	const shouldRespond = !isGroupChat || hasTrigger || isBotReplied;

	const reaction = processReaction(message);
	if (reaction) {
		await setMessageReaction(TELEGRAM_URL, message.chat.id, message.message_id, reaction);
	}

	if (!shouldRespond) return;

	if (message?.from?.first_name) {
		await saveUserData(env.DB, message.from.id, { first_name: message.from.first_name });
	}

	if (message?.text) {
		await saveMessage(env.DB, message.from.id, message.chat.id, 'user', message.text);
		await handleTextCommand(env, TELEGRAM_URL, message, ownerID);
	} else if (message?.photo) {
		await handlePhotoCommand(env, TELEGRAM_URL, message);
	}
}

// Обробка команд
export async function handleTextCommand(env, TELEGRAM_URL, message) {
	const text = message.text.toLowerCase();
	const chatID = message.chat.id;
	const fromID = message.from.id;
	const ownerID = parseInt(env.OWNER_ID);

	if (fromID === ownerID && text.startsWith('/grant')) {
		const [, idStr, role = 'user'] = message.text.split(' ');
		const id = parseInt(idStr);
		if (!id || !['user', 'admin'].includes(role)) {
			await sendMessage(TELEGRAM_URL, chatID, '⚠️ Неправильна команда. Формат:\n/grant ID [user|admin]');
			return;
		}
		await addUser(env.DB, id, role);
		await sendMessage(TELEGRAM_URL, chatID, `✅ Користувача ${id} додано як ${role}.`);
		return;
	}

	if (fromID === ownerID && text.startsWith('/revoke')) {
		const [, idStr] = message.text.split(' ');
		const id = parseInt(idStr);
		if (!id) {
			await sendMessage(TELEGRAM_URL, chatID, '⚠️ Неправильна команда. Формат:\n/revoke ID');
			return;
		}
		await removeUser(env.DB, id);
		await sendMessage(TELEGRAM_URL, chatID, `🚫 Користувача ${id} видалено.`);
		return;
	}

	const commandHandlers = {
		'/gen': () => handleImageCommand(env, TELEGRAM_URL, message),
		згенеруй: () => handleImageCommand(env, TELEGRAM_URL, message),
		'/remember': () => handleSetDataCommand(env.DB, TELEGRAM_URL, message),
		'/clear': () => handleClearCommand(env.DB, TELEGRAM_URL, message),
		'/status': () => handleStatusCommand(env, TELEGRAM_URL, message),
		'/id': () => handleIdCommand(env, TELEGRAM_URL, message),
		'/settings': () => handleSettingsCommand(env, TELEGRAM_URL, message),
		'/start': () => handleStartCommand(env, TELEGRAM_URL, message),
		'/help': () => handleHelpCommand(env, TELEGRAM_URL, message),
		'/streak': () => handleStreakCommand(env.DB, TELEGRAM_URL, message),
		'/add': () => handleAddCommand(env.DB, TELEGRAM_URL, message),
		'/today': () => handleTodayCommand(env.DB, TELEGRAM_URL, message),
		'/tasks': () => handleTasksCommand(env.DB, TELEGRAM_URL, message),
		'/stats': () => handleStatsCommand(env.DB, TELEGRAM_URL, message),
		'/university': () => handleUniversityCommand(env.DB, TELEGRAM_URL, message),
	};

	if (text.startsWith('/broadcast')) {
		const role = await getUserRole(env.DB, fromID);
		const isOwner = fromID === ownerID;

		if (role === 'admin' || isOwner) {
			await handleBroadcastCommand(env, TELEGRAM_URL, message);
		} else {
			await sendMessage(TELEGRAM_URL, chatID, '⛔ У вас немає прав для цієї команди.');
		}
		return;
	}

	const command = Object.keys(commandHandlers).find((cmd) => text.startsWith(cmd));
	if (command) {
		await commandHandlers[command]();
	} else {
		await handleDefaultText(env.DB, TELEGRAM_URL, message);
	}
}
