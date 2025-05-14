/**
 * Модуль з обробниками повідомлень ботів
 */

const { analyzeBotTargets } = require('../utils/message-analyzer');
const { detectBotName } = require('../utils/bot-name-detector');
const { getQuotedMessageInfo } = require('../utils/quotes-handler');
const { sendMessageToN8N, prepareMessageData } = require('../api/n8n-api');

/**
 * Створює обробник текстових повідомлень для конкретного бота
 * @param {Object} botConfig - Конфігурація бота
 * @param {Array} bots - Список всіх ботів
 * @param {Object} botUsernames - Об'єкт з іменами ботів у Telegram
 * @returns {Function} - Функція-обробник
 */
function createTextMessageHandler(botConfig, bots, botUsernames) {
  return async (ctx) => {
    try {
      console.log(`\n===== ОТРИМАНО НОВЕ ТЕКСТОВЕ ПОВІДОМЛЕННЯ для ${botConfig.name} =====`);
      
      // Отримуємо основну інформацію про повідомлення
      const userId = ctx.from.id;
      const username = ctx.from.username || ctx.from.first_name;
      const messageText = ctx.message.text;
      
      console.log(`Від: ${username} (ID: ${userId})`);
      console.log(`Текст: ${messageText}`);
      
      // Ігноруємо команди
      if (messageText.startsWith('/')) return;
      
      // Аналізуємо повідомлення для визначення цільових ботів
      const targetBots = analyzeBotTargets(ctx, bots, botUsernames);
      
      // Перевірка, чи повинен даний бот відповідати
      const shouldThisBotRespond = targetBots.some(target => target.bot.id === botConfig.id);
      
      if (!shouldThisBotRespond) {
        console.log(`Бот ${botConfig.name} не повинен відповідати на це повідомлення`);
        return;
      }
      
      // Визначення, з яким пріоритетом цей бот повинен відповідати
      const target = targetBots.find(target => target.bot.id === botConfig.id);
      console.log(`Бот ${botConfig.name} відповідає на повідомлення (причина: ${target.reason}, пріоритет: ${target.priority})`);
      
      // Отримуємо інформацію про цитоване повідомлення
      const quotedInfo = getQuotedMessageInfo(ctx, bots);
      
      // Отримуємо інформацію про згадку імені бота
      const botNameDetection = detectBotName(messageText, ctx.message.entities, botConfig, botUsernames[botConfig.id]);
      
      // Підготовка даних для відправки до n8n
      const messageData = prepareMessageData(ctx, botConfig, quotedInfo, botNameDetection);
      
      // Показуємо індикатор набору тексту
      await ctx.telegram.sendChatAction(ctx.chat.id, 'typing');
      
      // Відправка запиту до n8n
      console.log(`Відправлення запиту до n8n для бота ${botConfig.name}...`);
      const response = await sendMessageToN8N(messageData);
      
      // Обробка відповіді
      if (response.success) {
        console.log(`Отримана відповідь від n8n для бота ${botConfig.name}`);
        console.log('Відповідь data:', JSON.stringify(response.data, null, 2));
        
        // Налаштування опцій відповіді
        const replyOptions = {
          reply_to_message_id: ctx.message.message_id,
          disable_notification: true
        };
        
        // Перевіряємо чи це форум (чат із темами)
        try {
          // Використовуємо message_thread_id тільки якщо ми впевнені, що це форум-чат
          if (ctx.message.message_thread_id && ctx.chat && ctx.chat.is_forum === true) {
            console.log(`Використовую message_thread_id: ${ctx.message.message_thread_id} в форумі`);
            replyOptions.message_thread_id = ctx.message.message_thread_id;
          } else {
            // Якщо це не форум, не використовуємо message_thread_id
            console.log('Не використовую message_thread_id, бо це не форум');
            delete replyOptions.message_thread_id;
          }
        } catch (error) {
          console.log('Помилка при перевірці типу чату:', error.message);
          // В разі помилки не використовуємо message_thread_id
          delete replyOptions.message_thread_id;
        }
        
        // Отримуємо текст відповіді з поля answer
        let messageText = '';
        
        if (response.data && response.data.answer && typeof response.data.answer === 'string' && response.data.answer.trim() !== '') {
          messageText = response.data.answer;
          console.log('Використовую текст з response.data.answer');
        }
        
        // Перевіряємо чи вдалося отримати текст
        if (!messageText || messageText.trim() === '') {
          console.log(`Не вдалося знайти текст у відповіді від n8n для бота ${botConfig.name}, відправляю стандартне повідомлення`);
          await ctx.reply('Вибачте, я не можу зараз надати відповідь. Спробуйте пізніше.', replyOptions);
        } else {
          // Відправляємо відповідь
          await ctx.reply(messageText, replyOptions);
          console.log(`Бот ${botConfig.name} успішно відправив відповідь`);
        }
      } else {
        console.error(`Помилка при отриманні відповіді від n8n для бота ${botConfig.name}:`, response.error);
        
        // Якщо відповідь з помилкою і бот має високий пріоритет (основний бот для відповіді)
        if (target.priority === 1) {
          await ctx.reply('Вибачте, сталася помилка при обробці вашого запиту. Спробуйте пізніше.', {
            reply_to_message_id: ctx.message.message_id
          });
        }
      }
    } catch (error) {
      console.error(`Помилка при обробці текстового повідомлення для бота ${botConfig.name}:`, error);
    }
  };
}

/**
 * Створює обробник файлових повідомлень для конкретного бота
 * @param {Object} botConfig - Конфігурація бота
 * @param {Array} bots - Список всіх ботів
 * @param {Object} botUsernames - Об'єкт з іменами ботів у Telegram
 * @returns {Function} - Функція-обробник
 */
function createFileMessageHandler(botConfig, bots, botUsernames) {
  return async (ctx) => {
    try {
      console.log(`\n===== ОТРИМАНО НОВЕ ФАЙЛОВЕ ПОВІДОМЛЕННЯ для ${botConfig.name} =====`);
      
      // Отримуємо основну інформацію про повідомлення
      const userId = ctx.from.id;
      const username = ctx.from.username || ctx.from.first_name;
      
      console.log(`Від: ${username} (ID: ${userId})`);
      console.log(`Тип файлу: ${ctx.message.document ? 'документ' : 'фото'}`);
      
      // Аналізуємо повідомлення для визначення цільових ботів
      const targetBots = analyzeBotTargets(ctx, bots, botUsernames);
      
      // Перевірка, чи повинен даний бот відповідати
      const shouldThisBotRespond = targetBots.some(target => target.bot.id === botConfig.id);
      
      if (!shouldThisBotRespond) {
        console.log(`Бот ${botConfig.name} не повинен відповідати на це повідомлення`);
        return;
      }
      
      // Визначення, з яким пріоритетом цей бот повинен відповідати
      const target = targetBots.find(target => target.bot.id === botConfig.id);
      console.log(`Бот ${botConfig.name} відповідає на повідомлення (причина: ${target.reason}, пріоритет: ${target.priority})`);
      
      // Інформуємо користувача, що файл отримано
      await ctx.reply(`Я отримав ваш файл, але поки що не можу обробляти файли. Будь ласка, надсилайте текстові повідомлення.`, {
        reply_to_message_id: ctx.message.message_id
      });
      
    } catch (error) {
      console.error(`Помилка при обробці файлового повідомлення для бота ${botConfig.name}:`, error);
    }
  };
}

/**
 * Налаштовує базові команди для бота
 * @param {Object} bot - Інстанс Telegraf бота
 * @param {Object} botConfig - Конфігурація бота
 */
function setupBasicCommands(bot, botConfig) {
  // Ідентифікатор бота для логування
  const botIdent = `${botConfig.name} (${botConfig.id})`;
  
  // Команда /start
  bot.start((ctx) => {
    console.log(`Бот ${botIdent} отримав команду /start від ${ctx.from.username || ctx.from.first_name}`);
    return ctx.reply(`Привіт! Я ${botConfig.name}. Чим можу допомогти?`);
  });
  
  // Команда /help
  bot.help((ctx) => {
    console.log(`Бот ${botIdent} отримав команду /help від ${ctx.from.username || ctx.from.first_name}`);
    return ctx.reply(`Я ${botConfig.name}. Я можу відповідати на ваші запитання та допомагати. Просто згадайте мене в тексті або відповідайте на мої повідомлення.`);
  });
}

module.exports = {
  createTextMessageHandler,
  createFileMessageHandler,
  setupBasicCommands
};
