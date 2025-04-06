import { handleAddStreak, handleCheckStreaks, handleDeleteStreak } from '../streaks/streak';
import { sendMessage } from '../utils/utils';

// Функція для взаємодії з цілями
export async function handleStreakCommand(db, TELEGRAM_URL, message) {
	const args = message.text.substring(8).trim().split(' ');

	if (args.length < 1 || args[0] === '') {
		const reply =
			'⚠️ *Неправильний формат команди!*\n\n' +
			'Використовуйте одну з наступних команд:\n' +
			'✅ `/streak add <назва цілі>` — додати нову ціль.\n' +
			'📊 `/streak check` — переглянути всі цілі.\n' +
			'❌ `/streak delete <назва цілі>` — видалити ціль.';
		await sendMessage(TELEGRAM_URL, message.chat.id, reply, {
			parse_mode: 'Markdown',
		});
		return;
	}

	const streakCommand = args[0];

	if (streakCommand === 'add') {
		const goalName = args.slice(1).join(' ').trim();
		if (!goalName) {
			await sendMessage(TELEGRAM_URL, message.chat.id, '⚠️ *Вкажіть назву цілі!*\nПриклад: `/streak add Читати книгу`', {
				parse_mode: 'Markdown',
			});
			return;
		}
		await handleAddStreak(db, TELEGRAM_URL, message.chat.id, goalName);
	} else if (streakCommand === 'check') {
		await handleCheckStreaks(db, TELEGRAM_URL, message.chat.id);
	} else if (streakCommand === 'delete') {
		const goalName = args.slice(1).join(' ').trim();
		if (!goalName) {
			await sendMessage(
				TELEGRAM_URL,
				message.chat.id,
				'⚠️ *Вкажіть назву цілі для видалення!*\nПриклад: `/streak delete Читати книгу`',
				{
					parse_mode: 'Markdown',
				}
			);
			return;
		}
		await handleDeleteStreak(db, TELEGRAM_URL, message.chat.id, goalName);
	} else {
		const reply =
			'⚠️ *Невідома команда streak!*\n\n' +
			'Використовуйте:\n' +
			'✅ `/streak add <назва цілі>` — додати нову ціль.\n' +
			'📊 `/streak check` — переглянути всі цілі.\n' +
			'❌ `/streak delete <назва цілі>` — видалити ціль.';
		await sendMessage(TELEGRAM_URL, message.chat.id, reply, {
			parse_mode: 'Markdown',
		});
	}
}
