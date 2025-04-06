// Встановлення реакцій на повідомлення
export function processReaction(message) {
  if (Math.random() > 0.4) return null;

  const reactionGroups = {
    positive: {
      words: ['супер', 'круто', 'гарно', 'чудово', 'топ', 'молодець', 'класно', 'відмінно', 'найкраще', 'ура', 'добре'],
      emojis: ['🔥', '😎', '💪', '👏', '✨'],
    },
    negative: {
      words: ['погано', 'жахливо', 'сумно', 'не дуже', 'депресія', 'гірше не буває', 'негативно'],
      emojis: ['😢', '😞', '💔', '🥀'],
    },
    funny: {
      words: ['ахах', 'брооо', 'лол', 'смішно', 'ржака', 'пхпх', 'угар', 'анекдот', 'мем'],
      emojis: ['😂', '🤣', '😆', '😹'],
    },
    angry: {
      words: ['бісить', 'блін', 'я злий', 'ненавиджу', 'розлючений', 'злість', 'задовбало', 'жесть'],
      emojis: ['😡', '🤬', '😤', '👿'],
    },
    surprised: {
      words: ['що?', 'серйозно?', 'не вірю', 'ого', 'шок', 'несподівано', 'wow', '😲'],
      emojis: ['😲', '😯', '🤯', '😵'],
    },
    love: {
      words: ['люблю', 'сердечко', 'цілую', '❤️', 'приємно', 'обіймаю', 'мілашка', 'няшно'],
      emojis: ['❤️', '😍', '🥰', '😘'],
    },
    important: {
      words: ['сосав', 'ахуй', 'траходром', 'сука', 'піздєц', 'я твою маму'],
      emojis: ['🤡', '🐳', '👀', '🤓', '💊'],
    },
  };

  if (message?.text) {
    const lowerText = message.text.toLowerCase();

    for (const group in reactionGroups) {
      if (reactionGroups[group].words.some((word) => lowerText.includes(word))) {
        const emoji = reactionGroups[group].emojis[Math.floor(Math.random() * reactionGroups[group].emojis.length)];
        return [{ type: "emoji", emoji }];
      }
    }

    if (lowerText.includes('бот') || lowerText.includes('fluxie')) {
      const emoji = ['🤖', '👀', '🧐'][Math.floor(Math.random() * 3)];
      return [{ type: "emoji", emoji }];
    }
  }

  if (message?.photo) {
    const emoji = ['📸', '🌄', '🎥'][Math.floor(Math.random() * 3)];
    return [{ type: "emoji", emoji }];
  }

  return null;
}
