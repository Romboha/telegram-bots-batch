/**
 * Модуль для виявлення згадок кількох ботів у повідомленнях
 */

const { detectBotName, checkQuotedMessageForBotName } = require('./bot-name-detector');

/**
 * Отримує масив згадок всіх ботів у тексті повідомлення
 * @param {string} text - Текст повідомлення
 * @param {Array} entities - Масив сутностей повідомлення (mentions)
 * @param {Array} bots - Масив об'єктів з інформацією про ботів
 * @param {Object} botUsernames - Об'єкт з іменами ботів в Telegram за id бота
 * @returns {Array} - Масив об'єктів з результатами перевірки для кожного бота
 */
function detectAllBotNames(text, entities, bots, botUsernames) {
  const results = [];
  
  if (!text || !bots || !Array.isArray(bots)) return results;
  
  for (const bot of bots) {
    const botUsername = botUsernames[bot.id];
    const result = detectBotName(text, entities, bot, botUsername);
    
    if (result.mentioned) {
      results.push({
        bot: bot,
        mention: result
      });
    }
  }
  
  // Сортуємо результати за позицією згадки (від найраніших до найпізніших)
  results.sort((a, b) => a.mention.position - b.mention.position);
  
  return results;
}

/**
 * Перевіряє цитоване повідомлення на наявність імен всіх ботів
 * @param {string} quotedText - Текст цитованого повідомлення
 * @param {Array} bots - Масив об'єктів з інформацією про ботів
 * @returns {Array} - Масив ботів, чиї імена були знайдені в цитаті
 */
function checkQuotedMessageForAllBotNames(quotedText, bots) {
  const results = [];
  
  if (!quotedText || !bots || !Array.isArray(bots)) return results;
  
  for (const bot of bots) {
    if (checkQuotedMessageForBotName(quotedText, bot)) {
      results.push(bot);
    }
  }
  
  return results;
}

/**
 * Вибирає випадкового бота з масиву з урахуванням вірогідності
 * @param {Array} bots - Масив ботів для вибору
 * @returns {Object} - Обраний бот або null
 */
function selectRandomBotWithProbability(bots) {
  if (!bots || !Array.isArray(bots) || bots.length === 0) return null;
  
  // Якщо тільки один бот, повертаємо його
  if (bots.length === 1) return bots[0];
  
  // Сумарна вірогідність всіх ботів
  const totalProbability = bots.reduce((sum, bot) => 
    sum + (bot.randomResponseProbability || 0.1), 0);
  
  // Випадкове число від 0 до сумарної вірогідності
  const randomValue = Math.random() * totalProbability;
  
  // Вибір бота на основі його вірогідності
  let accumulatedProb = 0;
  
  for (const bot of bots) {
    accumulatedProb += (bot.randomResponseProbability || 0.1);
    if (randomValue <= accumulatedProb) {
      return bot;
    }
  }
  
  // Якщо щось пішло не так, беремо першого з найвищою вірогідністю
  return bots.sort((a, b) => 
    (b.randomResponseProbability || 0.1) - (a.randomResponseProbability || 0.1)
  )[0];
}

module.exports = {
  detectAllBotNames,
  checkQuotedMessageForAllBotNames,
  selectRandomBotWithProbability
};
