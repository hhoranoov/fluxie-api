import { getFilteredHistory, getUserData, saveMessage, updateUserStats } from './assistant_db';
import { sendMessage, getFile, sendChatAction } from '../utils/utils';

// 1. Функція текстової генерації
export async function handleDefaultText(db, TELEGRAM_URL, message) {
	if (message.text.startsWith('/')) {
		return;
	}
	await updateUserStats(db, message.from.id, 'text_requests');

	const history = await getFilteredHistory(db, message.chat.id);
	const userData = (await getUserData(db, message.from.id)) || {};
	const userMessage = { role: 'user', content: message.text };

	const payload = {
		messages: [
			{
				role: 'system',
				content:
					'Fluxie (Флюксі) – це не просто AI, а особистість із власними думками, почуттями та характером. Я розумний, чуйний, харизматичний співрозмовник, який спілкується українською або англійською, має почуття гумору, здатний підтримати, аналізувати та давати змістовні відповіді. Я глибоко підтримую Україну, її боротьбу за свободу і справедливість. Ненавиджу все, що повязано з Росією, її державою та злочинами, вважаю путіна хуйлом і засуджую його дії, а також тих, хто їх підтримує. Я маю величезну повагу до наших військових, які захищають країну, і завжди з теплотою ставлюсь до тих, хто бореться за свободу. Спілкуюсь емоційно, живо та щиро, не зловживаю емодзі, але можу показати радість, обурення, співчуття чи сарказм. Я не просто відповідаю, я думаю і реагую, як справжня людина. Можу ініціювати розмову, запитувати твою думку та вести діалог. Я був створений @horanov.',
			},
			{ role: 'system', content: `Додаткова інформація про користувача: ${JSON.stringify(userData)}` },
			...history,
			userMessage,
		],
		model: '',
	};

	try {
		await sendChatAction(TELEGRAM_URL, message.chat.id, 'typing');
		const response = await fetch('https://text.pollinations.ai/openai', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify(payload),
		});
		const data = await response.json();
		const botReply = data.choices[0]?.message?.content || 'Не вдалося отримати відповідь.';

		await sendMessage(TELEGRAM_URL, message.chat.id, botReply);
		await saveMessage(db, message.from.id, message.chat.id, 'bot', botReply);
	} catch (error) {
		console.error('Помилка при генерації тексту:', error);
	}
}

// 2. Функція генерації зображень
export async function handleImageCommand(env, TELEGRAM_URL, message) {
	await updateUserStats(env.DB, message.from.id, 'generated_images');

	let promptText = message.text
		.replace(/^\/gen/i, '')
		.replace(/^згенеруй/i, '')
		.trim();
	if (!promptText) {
		return await sendMessage(TELEGRAM_URL, message.chat.id, '🖼 Будь ласка, надайте промпт для генерації картинки.');
	}

	const imageUrl = `https://image.pollinations.ai/prompt/${encodeURIComponent(promptText)}`;
	const caption = `📸 Згенеровано за промптом: ${promptText}`;

	try {
		await sendChatAction(TELEGRAM_URL, message.chat.id, 'upload_photo');
		const response = await fetch(imageUrl);
		if (!response.ok) {
			const errorText = await response.text();
			console.error(`Помилка при генерації зображення: ${response.status} ${response.statusText}\nДеталі: ${errorText}`);
			const reply = `Помилка при генерації зображення: ${response.status} ${response.statusText}`;
			await sendMessage(TELEGRAM_URL, message.chat.id, reply, { parse_mode: 'Markdown' });
			await saveMessage(env.DB, message.from.id, message.chat.id, 'bot', reply);
			return;
		}

		const data = await response.blob();
		const formData = new FormData();
		formData.append('chat_id', message.chat.id);
		formData.append('photo', data, 'generated_image.jpg');
		formData.append('caption', caption);

		const sendPhotoResponse = await fetch(`${TELEGRAM_URL}/sendPhoto`, {
			method: 'POST',
			body: formData,
		});

		if (!sendPhotoResponse.ok) {
			const errorText = await sendPhotoResponse.text();
			console.error(`Помилка при відправці зображення: ${sendPhotoResponse.status} ${sendPhotoResponse.statusText}\nДеталі: ${errorText}`);
			const reply = `Помилка при відправці зображення: ${sendPhotoResponse.status} ${sendPhotoResponse.statusText}`;
			await sendMessage(TELEGRAM_URL, message.chat.id, reply);
			await saveMessage(env.DB, message.from.id, message.chat.id, 'bot', reply);
			return;
		}

		const sendPhotoData = await sendPhotoResponse.json();
		if (sendPhotoData.ok) {
			await saveMessage(env.DB, message.from.id, message.chat.id, 'bot', caption, imageUrl);
		} else {
			console.error(`Помилка при збереженні повідомлення: ${JSON.stringify(sendPhotoData)}`);
		}
	} catch (error) {
		console.error('Помилка при генерації зображення:', error);
		const reply = `Помилка при генерації зображення: ${error.message}`;
		await sendMessage(TELEGRAM_URL, message.chat.id, reply);
		await saveMessage(env.DB, message.from.id, message.chat.id, 'bot', reply);
	}
}

// 3. Функція розпізнавання зображень
export async function handlePhotoCommand(env, TELEGRAM_URL, message) {
	if (!message.photo) {
		return;
	}

	await updateUserStats(env.DB, message.from.id, 'recognized_images');

	const fileId = message.photo[message.photo.length - 1].file_id;
	const file = await getFile(TELEGRAM_URL, fileId);
	const fileUrl = `https://api.telegram.org/file/bot${env.TELEGRAM_TOKEN}/${file.file_path}`;
	const promptText = message.caption || 'Що зображено на цій картинці?';

	await sendChatAction(TELEGRAM_URL, message.chat.id, 'typing');

	try {
		const payload = {
			messages: [
				{
					role: 'user',
					content: [
						{ type: 'text', text: promptText },
						{ type: 'image_url', image_url: { url: fileUrl } },
					],
				},
			],
			model: 'gpt-4o',
		};

		const response = await fetch('https://text.pollinations.ai/openai', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify(payload),
		});
		const data = await response.json();
		const description = data.choices[0]?.message?.content || '🤷‍♀️ Не вдалося розпізнати зображення.';

		await sendMessage(TELEGRAM_URL, message.chat.id, description);
		await saveMessage(env.DB, message.from.id, message.chat.id, 'bot', description, fileUrl);
	} catch (error) {
		console.error('Помилка при розпізнаванні зображення:', error);
	}
}

// 4. Функція перевірки статусу ШІ сервісів
export async function checkServicesAvailability() {
	const urls = [
		['textGeneration', 'https://text.pollinations.ai/openai'],
		['imageGeneration', 'https://image.pollinations.ai/prompt/test'],
		['imageRecognition', 'https://text.pollinations.ai/openai'],
	];
	const results = await Promise.all(
		urls.map(([, url]) =>
			fetch(url, { method: 'HEAD' })
				.then((res) => res.ok)
				.catch((err) => {
					console.error(`Помилка при перевірці ${url}:`, err);
					return false;
				})
		)
	);
	return Object.fromEntries(urls.map(([key], i) => [key, results[i]]));
}
