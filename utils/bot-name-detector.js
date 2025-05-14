/**
 * Модуль для визначення згадок імені бота у повідомленнях
 */

const { MIN_NAME_PART_LENGTH } = require('../global-config');

/**
 * Перевіряє, чи містить повідомлення згадку імені бота
 * @param {string} text - Текст повідомлення
 * @param {Array} entities - Масив сутностей повідомлення (mentions)
 * @param {Object} bot - Об'єкт з інформацією про бота
 * @param {string} botUsername - Ім'я бота в Telegram
 * @returns {Object} - Результат перевірки {mentioned: boolean, nameFound: string, method: string, position: number}
 */
function detectBotName(text, entities, bot, botUsername) {
  // Результат за замовчуванням
  const result = {
    mentioned: false,
    nameFound: '',
    method: '',
    position: -1 // Позиція згадки в тексті
  };

  if (!text || !bot) return result;
  
  // 1. Шукаємо пряму згадку бота через @username
  if (entities && Array.isArray(entities)) {
    const mentionEntity = entities.find(entity => 
      entity.type === 'mention' && 
      text.substring(entity.offset, entity.offset + entity.length) === `@${botUsername}`
    );
    
    if (mentionEntity) {
      result.mentioned = true;
      result.nameFound = `@${botUsername}`;
      result.method = 'mention';
      result.position = mentionEntity.offset;
      return result;
    }
  }

  // 2. Шукаємо текстову згадку бота (повний текст)
  
  // Перед початком пошуку підготуємо текст і розбиваємо на слова один раз
  const normalizedText = text.toLowerCase();
  const words = normalizedText.split(/[\s,.!?;:\)\(\-\+\n]+/).filter(w => w.length > 0);
  
  // Отримаємо масив варіацій імен
  const nameVariations = bot.nameVariations || [];
  
  // Перевірка точного збігу слова
  for (const botName of nameVariations) {
    const normalizedName = botName.toLowerCase();
    
    // Перевіряємо кожне слово в тексті
    for (let i = 0; i < words.length; i++) {
      const word = words[i];
      
      // Перевіряємо чи точно співпадає слово
      if (word === normalizedName) {
        result.mentioned = true;
        result.nameFound = botName;
        result.method = 'exact_match';
        result.position = normalizedText.indexOf(word);
        return result;
      }
      
      // Перевіряємо чи слово містить ім'я бота в себе, але тільки якщо ім'я бота достатньо довге
      if (normalizedName.length >= MIN_NAME_PART_LENGTH && word.includes(normalizedName)) {
        result.mentioned = true;
        result.nameFound = botName;
        result.method = 'contains_name';
        result.position = normalizedText.indexOf(word);
        return result;
      }
    }
    
    // Перевіряємо складені імена (кілька слів)
    if (normalizedName.includes(' ')) {
      const namePosition = normalizedText.indexOf(normalizedName);
      if (namePosition !== -1) {
        result.mentioned = true;
        result.nameFound = botName;
        result.method = 'phrase_match';
        result.position = namePosition;
        return result;
      }
    }
  }

  // Перевіряємо окремо кожен варіант імені в тексті повідомлення, враховуючи розділові знаки
  
  // Спочатку отримаємо слова з тексту
  const originalWords = text.toLowerCase().split(/\s+/);
  
  // Далі очищаємо від розділових знаків
  const cleanWords = [];  
  for (const word of originalWords) {
    // Видаляємо розділові знаки
    const cleanWord = word.replace(/[,.!?;:\)\(\-\+]*/g, '');
    if (cleanWord.length > 0) {
      cleanWords.push(cleanWord);
    }
  }
  
  // Додаткова перевірка на збіг імені бота в словах
  for (let i = 0; i < cleanWords.length; i++) {
    const word = cleanWords[i];
    // Слово вже очищене від розділових знаків раніше
    const cleanWord = word;
    
    const nameVariation = nameVariations.find(name => {
      const normalizedName = name.toLowerCase();
      
      // 1. Перевіряємо точний збіг слів
      // Наприклад: слово "сифон" точно збігається з іменем "сифон"
      if (cleanWord === normalizedName) {
        return true;
      }
      
      // 2. Перевірка чи слово містить ім'я бота повністю
      // Наприклад: слово "суперсифон" містить ім'я "сифон"
      // Але тільки якщо ім'я бота достатньо довге (щоб уникнути хибних збігів з короткими словами)
      if (normalizedName.length >= MIN_NAME_PART_LENGTH && cleanWord.includes(normalizedName)) {
        return true;
      }
      
      // 3. Перевірка чи слово є частиною імені бота (наприклад, сифон в Сифоненко)
      // Але тільки якщо саме слово достатньо довге
      // Це дозволить уникнути хибних збігів на коротких словах як "в" або "у", що технічно є частиною імені
      if (cleanWord.length >= MIN_NAME_PART_LENGTH && normalizedName.includes(cleanWord)) {
        return true;
      }
      
      return false;
    });
    
    if (nameVariation) {
      result.mentioned = true;
      result.nameFound = nameVariation;
      result.method = 'word_match';
      result.position = normalizedText.indexOf(word);
      return result;
    }
  }

  return result;
}

/**
 * Перевіряє цитоване повідомлення на наявність імені бота
 * @param {string} quotedText - Текст цитованого повідомлення
 * @param {Object} bot - Об'єкт з інформацією про бота
 * @returns {boolean} - true, якщо знайдено ім'я бота
 */
function checkQuotedMessageForBotName(quotedText, bot) {
  if (!quotedText || !bot || !bot.nameVariations) return false;
  
  // Спочатку отримаємо слова з тексту
  const originalWords = quotedText.toLowerCase().split(/\s+/);
  
  // Далі очищаємо від розділових знаків
  const cleanWords = [];  
  for (const word of originalWords) {
    // Видаляємо розділові знаки
    const cleanWord = word.replace(/[,.!?;:\)\(\-\+]*/g, '');
    if (cleanWord.length > 0) {
      cleanWords.push(cleanWord);
    }
  }
  
  const nameVariations = bot.nameVariations;
  
  for (const word of cleanWords) {
    const nameVariation = nameVariations.find(name => {
      const normalizedName = name.toLowerCase();
      
      // 1. Перевіряємо точний збіг слів
      if (word === normalizedName) {
        return true;
      }
      
      // 2. Перевірка чи слово містить ім'я бота повністю
      if (normalizedName.length >= MIN_NAME_PART_LENGTH && word.includes(normalizedName)) {
        return true;
      }
      
      // 3. Перевірка чи слово є частиною імені бота (але тільки якщо довге)
      if (word.length >= MIN_NAME_PART_LENGTH && normalizedName.includes(word)) {
        return true;
      }
      
      return false;
    });
    
    if (nameVariation) {
      return true;
    }
  }
  
  return false;
}

module.exports = {
  detectBotName,
  checkQuotedMessageForBotName
};
