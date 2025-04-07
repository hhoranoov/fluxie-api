import { saveMessage, getUserData } from '../assistant/assistant_db';
import { sendMessage, deleteMessage } from '../utils/utils';
import { getUserRole } from '../utils/access';

// 1. Функція для отримання ID
export async function handleIdCommand(env, TELEGRAM_URL, message) {
	let reply;

	if (message.reply_to_message && message.reply_to_message.sticker) {
		reply = `🖼 ID стікера: \`${message.reply_to_message.sticker.file_id}\``;
	} else {
		reply = `🪪 Ваш Telegram ID: \`${message.from.id}\``;
	}

	await sendMessage(TELEGRAM_URL, message.chat.id, reply, { parse_mode: 'Markdown' });
	await saveMessage(env.DB, message.from.id, message.chat.id, 'bot', reply);
}

// 2. Функція для розсилки повідомлень
export async function handleBroadcastCommand(env, TELEGRAM_URL, message) {
	try {
		const senderID = message.from.id;
		const role = await getUserRole(env.DB, senderID);
		const isOwner = senderID === parseInt(env.OWNER_ID);

		if (role !== 'admin' && !isOwner) {
			return await sendMessage(TELEGRAM_URL, message.chat.id, '❌ У вас немає прав для розсилки повідомлень.');
		}

		const args = message.text.split(' ');
		if (args.length < 3) {
			return await sendMessage(TELEGRAM_URL, message.chat.id, '⚠ Формат: /broadcast <user_id або "all"> <message>');
		}

		const target = args[1];
		const broadcastText = args.slice(2).join(' ').trim();
		if (!broadcastText) {
			return await sendMessage(TELEGRAM_URL, message.chat.id, '⚠ Будь ласка, введіть текст повідомлення.');
		}

		const broadcastMessage = `📢 *Оголошення від адміністрації:*\n\n${broadcastText}`;

		if (target.toLowerCase() === 'all') {
			const { results } = await env.DB.prepare('SELECT user_id FROM user_data').all();

			if (!results.length) {
				return await sendMessage(TELEGRAM_URL, message.chat.id, '⚠ У базі немає користувачів для розсилки.');
			}

			for (const user of results) {
				await sendMessage(TELEGRAM_URL, user.user_id, broadcastMessage, { parse_mode: 'Markdown' });
				await new Promise((resolve) => setTimeout(resolve, 500));
			}

			return await sendMessage(TELEGRAM_URL, message.chat.id, `✅ Повідомлення надіслано *${results.length}* користувачам.`, {
				parse_mode: 'Markdown',
			});
		} else {
			await sendMessage(TELEGRAM_URL, target, broadcastMessage, { parse_mode: 'Markdown' });
			return await sendMessage(TELEGRAM_URL, message.chat.id, '✅ Повідомлення надіслано користувачу.');
		}
	} catch (error) {
		console.error('Помилка в handleBroadcastCommand:', error);
		return await sendMessage(TELEGRAM_URL, message.chat.id, '❌ Сталася помилка при розсилці повідомлень.');
	}
}

// 3. Функція старту
export async function handleStartCommand(env, TELEGRAM_URL, message) {
	const chatId = message.chat.id;
	const command = 'start';
	const previousRecord = await env.DB.prepare('SELECT message_id FROM bot_messages WHERE chat_id = ? AND command = ?')
		.bind(chatId, command)
		.first();

	if (previousRecord && previousRecord.message_id) {
		try {
			await deleteMessage(TELEGRAM_URL, chatId, previousRecord.message_id);
		} catch (error) {
			console.error('Не вдалося видалити попереднє повідомлення для /start:', error);
		}
	}

	const userData = (await getUserData(env.DB, message.from.id)) || {};
	const userName = userData.first_name || 'користувач';
	const reply = `Привіт, ${userName}! 👋\n\nМене звати Флюксі. Обери команду нижче, або просто спілкуйся зі мною.`;

	const keyboard = {
		inline_keyboard: [
			[
				{
					text: '🌐 Вебсайт',
					url: 'https://fluxie.pp.ua',
				},
				{ text: '❓ Допомога', callback_data: 'help' },
			],
			[
				{
					text: '🇺🇦 На ЗСУ',
					url: 'https://savelife.in.ua/projects/status/active/',
				}
			]
		],
	};

	const sentMessage = await sendMessage(TELEGRAM_URL, chatId, reply, {
		reply_markup: JSON.stringify(keyboard),
	});

	await env.DB.prepare('INSERT OR REPLACE INTO bot_messages (chat_id, command, message_id) VALUES (?, ?, ?)')
		.bind(chatId, command, sentMessage.message_id)
		.run();

	await deleteMessage(TELEGRAM_URL, chatId, message.message_id);
}

// 4. Функція допомоги
export async function handleHelpCommand(env, TELEGRAM_URL, message, shouldDeleteOriginalMessage = true) {
	const chatId = message.chat.id;
	const command = 'help';
	const previousRecord = await env.DB.prepare('SELECT message_id FROM bot_messages WHERE chat_id = ? AND command = ?')
		.bind(chatId, command)
		.first();

	if (previousRecord && previousRecord.message_id) {
		try {
			await deleteMessage(TELEGRAM_URL, chatId, previousRecord.message_id);
		} catch (error) {
			console.error('Не вдалося видалити попереднє повідомлення /help:', error);
		}
	}

	const keyboard = {
		inline_keyboard: [
			[
				{ text: '🚀 Основні', callback_data: 'help_main' },
				{ text: '💠 ШІ', callback_data: 'help_ai' },
			],
			[
				{ text: '📝 Завдання', callback_data: 'help_tasks' },
				{ text: '🎯 Цілі', callback_data: 'help_streaks' },
			],
			[{ text: '📊 Статистика', callback_data: 'help_stats' }],
		],
	};

	const reply = `✻ *Вітаю!* Я Флюксі, і вмію багато чого.

	📲 _Виберіть категорію, щоб отримати допомогу по команді._`;

	const sentMessage = await sendMessage(TELEGRAM_URL, chatId, reply, {
		parse_mode: 'Markdown',
		reply_markup: JSON.stringify(keyboard),
	});

	await env.DB.prepare('INSERT OR REPLACE INTO bot_messages (chat_id, command, message_id) VALUES (?, ?, ?)')
		.bind(chatId, command, sentMessage.message_id)
		.run();

	if (shouldDeleteOriginalMessage && message.message_id) {
		await deleteMessage(TELEGRAM_URL, chatId, message.message_id);
	}
}

export async function handleSettingsCommand(env, TELEGRAM_URL, message) {
	const userId = message.from.id;
	const userData = await env.DB.prepare('SELECT * FROM users WHERE id = ?').bind(userId).first();
	const userDB = await getUserData(env.DB, userId);
	const userName = userDB?.first_name || 'Невідомий';
	const isOwner = userId === parseInt(env.OWNER_ID);
	const registrationDate = isOwner ? '∞∞:∞∞' : (userData?.registration_date || 'Дата відсутня');
	const stats = await env.DB.prepare('SELECT * FROM user_stats WHERE user_id = ?').bind(userId).first();
	const textStats = stats?.text_requests || 0;
	const imageGenStats = stats?.generated_images || 0;
	const imageRecStats = stats?.recognized_images || 0;

	const roleFromDb = userData?.role;
	const roleLabel = isOwner || roleFromDb === 'admin' ? 'Адмін' : 'Користувач';

	const settingsMessage =
		`🛠 *Ваш профіль:*\n\n` +
		`👤 Ім'я: ${userName}\n` +
		`🆔 ID: \`${userId}\`\n` +
		`📅 Дата реєстрації: ${registrationDate}\n` +
		`🔐 Роль: *${roleLabel}*\n\n` +
		`📊 *Статистика:*\n` +
		`📝 Текстових запитів: ${textStats}\n` +
		`🎨 Згенерованих зображень: ${imageGenStats}\n` +
		`🖼 Розпізнаних фото: ${imageRecStats}`;

	await sendMessage(TELEGRAM_URL, message.chat.id, settingsMessage, { parse_mode: 'Markdown' });
}
