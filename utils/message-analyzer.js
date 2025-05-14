/**
 * Модуль аналізу повідомлень для визначення цільового бота
 */

const { detectAllBotNames, selectRandomBotWithProbability } = require('./multi-bot-detector');
const { getQuotedMessageInfo } = require('./quotes-handler');
const { GLOBAL_RANDOM_RESPONSE_PROBABILITY, SECONDARY_BOT_RESPONSE_PROBABILITY } = require('../global-config');

/**
 * Визначає список ботів, які мають відповісти на повідомлення
 * @param {Object} ctx - Контекст Telegraf
 * @param {Array} bots - Масив конфігурацій ботів
 * @param {Object} botUsernames - Об'єкт з іменами ботів в Telegram
 * @returns {Array} - Масив об'єктів ботів, які мають відповісти, з причинами відповіді
 */
function analyzeBotTargets(ctx, bots, botUsernames) {
  const results = [];
  
  try {
    // Отримуємо основну інформацію про повідомлення
    const chatType = ctx.chat.type; // private, group, supergroup
    const messageText = ctx.message.text || '';
    const entities = ctx.message.entities;
    
    // 1. Перевіряємо приватний чат - в приватному чаті відповідає тільки той бот, якому пишуть
    if (chatType === 'private') {
      const botId = ctx.botInfo.id.toString();
      const targetBot = bots.find(bot => bot.token.split(':')[0] === botId);
      
      if (targetBot) {
        results.push({
          bot: targetBot,
          reason: 'приватний_чат',
          priority: 1
        });
      }
      
      return results;
    }
    
    // 2. Отримуємо список згадок ботів в основному тексті
    const mentionedBots = detectAllBotNames(messageText, entities, bots, botUsernames);
    
    // 3. Отримуємо інформацію про цитоване повідомлення
    const quotedInfo = getQuotedMessageInfo(ctx, bots);
    
    // 4. Правило 1: Якщо згадується один бот у тексті/цитаті — відповідає він
    if (mentionedBots.length === 1) {
      results.push({
        bot: mentionedBots[0].bot,
        reason: 'згадка_в_тексті',
        priority: 1
      });
      
      return results;
    } 
    
    // 5. Правило 2: Якщо згадується кілька ботів у основному тексті
    if (mentionedBots.length > 1) {
      // Відповідає перший згаданий 
      results.push({
        bot: mentionedBots[0].bot,
        reason: 'перша_згадка_в_тексті',
        priority: 1
      });
      
      // Другий згаданий може також відповісти з малою вірогідністю
      if (Math.random() < SECONDARY_BOT_RESPONSE_PROBABILITY) {
        results.push({
          bot: mentionedBots[1].bot,
          reason: 'друга_згадка_в_тексті',
          priority: 2
        });
      }
      
      return results;
    }
    
    // 6. Правило 3: Якщо згадується кілька ботів лише у цитаті
    if (quotedInfo.botsInQuotedMessage.length > 0) {
      // Вибираємо випадково з тих, що згадані, з урахуванням їх персональної вірогідності
      const mentionedInQuote = quotedInfo.botsInQuotedMessage;
      
      // Вибираємо випадкового бота з урахуванням вірогідності
      const selectedBot = selectRandomBotWithProbability(mentionedInQuote);
      
      if (selectedBot) {
        results.push({
          bot: selectedBot,
          reason: 'згадка_в_цитаті',
          priority: 1
        });
      }
      
      return results;
    }
    
    // 7. Правило 4: Якщо це відповідь на повідомлення одного з ботів
    if (quotedInfo.isReplyToBot && quotedInfo.replyToBotId) {
      const replyBot = bots.find(bot => bot.id === quotedInfo.replyToBotId);
      
      if (replyBot) {
        results.push({
          bot: replyBot,
          reason: 'відповідь_на_повідомлення_бота',
          priority: 1
        });
        
        return results;
      }
    }
    
    // 8. Правило 5: Якщо не згадується жоден бот — випадкова відповідь від випадкового бота
    if (Math.random() < GLOBAL_RANDOM_RESPONSE_PROBABILITY) {
      // Вибираємо випадкового бота з урахуванням його вірогідності
      
      // Вибираємо випадкового бота з урахуванням вірогідності
      const selectedBot = selectRandomBotWithProbability(bots);
      
      if (selectedBot) {
        results.push({
          bot: selectedBot,
          reason: 'випадкова_відповідь',
          priority: 1
        });
      }
    }
    
    return results;
  } catch (error) {
    console.error('Помилка при аналізі цільових ботів:', error);
    return [];
  }
}

module.exports = {
  analyzeBotTargets
};
