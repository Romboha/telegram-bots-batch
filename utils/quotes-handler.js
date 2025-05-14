/**
 * Модуль для обробки цитованих повідомлень
 */

const { checkQuotedMessageForAllBotNames } = require('./multi-bot-detector');

/**
 * Отримує інформацію про цитоване повідомлення
 * @param {Object} ctx - Контекст Telegraf
 * @param {Array} bots - Масив конфігурацій ботів
 * @returns {Object} - Інформація про цитоване повідомлення
 */
function getQuotedMessageInfo(ctx, bots) {
  console.log('\n=== Перевірка цитування ===');
  
  const result = {
    hasQuotedMessage: false,
    isReplyToBot: false,
    replyToBotId: null,
    quotedMessage: null,
    quotedUsername: null,
    botsInQuotedMessage: [] // Масив ботів, згаданих у цитаті
  };

  // Перевіряємо, чи є відповідь на повідомлення
  if (!ctx.message.reply_to_message) {
    console.log('Відповідь на повідомлення не знайдена');
    return result;
  }
  
  console.log('Знайдено відповідь на повідомлення!');

  // Отримуємо відповідне повідомлення
  const replyMsg = ctx.message.reply_to_message;
  result.hasQuotedMessage = true;
  
  // Перевіряємо, чи відповідає користувач на повідомлення бота
  if (replyMsg.from && replyMsg.from.is_bot) {
    // Перевіряємо чи це один з наших ботів
    const botId = replyMsg.from.id.toString();
    
    // Шукаємо відповідного бота за id в токені
    const targetBot = bots.find(bot => bot.token.split(':')[0] === botId);
    
    if (targetBot) {
      result.isReplyToBot = true;
      result.replyToBotId = targetBot.id;
    }
  }

  // Зберігаємо текст цитованого повідомлення
  if (replyMsg.text) {
    result.quotedMessage = replyMsg.text;
    result.quotedUsername = replyMsg.from.username || replyMsg.from.first_name || 'невідомий';
    
    // Перевіряємо, чи містить цитоване повідомлення імена ботів
    result.botsInQuotedMessage = checkQuotedMessageForAllBotNames(result.quotedMessage, bots);
  }

  return result;
}

/**
 * Форматує цитату для відображення
 * @param {string} text - Текст цитати
 * @param {string} username - Ім'я користувача, якого цитують
 * @returns {string} - Форматована цитата
 */
function formatQuote(text, username) {
  if (!text) return '';
  
  const maxQuoteLength = 100;
  let formattedQuote = text;
  
  // Обмежуємо довжину цитати
  if (formattedQuote.length > maxQuoteLength) {
    formattedQuote = formattedQuote.substring(0, maxQuoteLength) + '...';
  }
  
  return `${username}: "${formattedQuote}"`;
}

module.exports = {
  getQuotedMessageInfo,
  formatQuote
};
