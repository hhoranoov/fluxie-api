import { addLesson, getLessonsForDay } from './university_db';
import { sendMessage } from '../utils/utils';

const validDays = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
const classTimes = ['9.00 – 10.35', '10.50 – 12.25', '12.45 – 14.20', '14.30 – 16.05', '16.15 – 17.50', '18.00 – 19.35'];

// Функції для керування парами
export async function handleUniversityCommand(db, TELEGRAM_URL, message) {
	const chatId = message.chat.id;
	const args = message.text.split(' ').slice(1);

	if (args[0] === 'add' && args.length >= 4) {
		const [_, rawDay, ...rest] = args;
		const day = rawDay.toLowerCase();

		if (!validDays.includes(day)) {
			return await sendMessage(TELEGRAM_URL, chatId, '❌ Невірний день. Використовуйте один із: Monday–Sunday.');
		}

		const [subject, room] = [rest.slice(0, -1).join(' '), rest.at(-1)];
		await addLesson(db, chatId, day, subject, room);
		await sendMessage(TELEGRAM_URL, chatId, `✅ Пара *${subject}* у *${room}* додана на *${day}*`, { parse_mode: 'Markdown' });
	} else {
		const day = args[0] ? args[0].toLowerCase() : new Date().toLocaleString('en-US', { weekday: 'long' }).toLowerCase();

		if (!validDays.includes(day)) {
			return await sendMessage(TELEGRAM_URL, chatId, '❌ Невірний день. Використовуйте один із: Monday–Sunday.');
		}

		const lessons = await getLessonsForDay(db, chatId, day);

		if (lessons.length === 0) {
			return await sendMessage(TELEGRAM_URL, chatId, `ℹ️ На *${day}* пар немає.`, { parse_mode: 'Markdown' });
		}

		let text = `📅 *Розклад на ${day.charAt(0).toUpperCase() + day.slice(1)}:*\n\n`;

    const buttons = lessons.map((lesson) => [
      { text: `❌ Видалити ${lesson.subject} (${lesson.room})`, callback_data: `del_${lesson.id}_${day}` },
    ]);

		lessons.forEach((l, i) => {
			text += `🕓 *Пара ${i + 1}:* (${classTimes[i]})\n`;
			text += `📚 *Предмет*: ${l.subject}\n`;
			text += `🏫 *Аудиторія*: ${l.room}\n\n`;
		});

		await sendMessage(TELEGRAM_URL, chatId, text, { parse_mode: 'Markdown', reply_markup: { inline_keyboard: buttons } });
	}
}
