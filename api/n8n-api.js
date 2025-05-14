/**
 * Модуль для інтеграції з n8n через API
 */

const axios = require('axios');

/**
 * Відправляє повідомлення до N8N
 * @param {Object} messageData - Дані повідомлення для відправки
 * @returns {Object} - Результат запиту {success: boolean, text: string, data: object, error: string}
 */
async function sendMessageToN8N(messageData) {
  try {
    // Перевіряємо необхідні параметри
    if (!messageData) {
      return {
        success: false,
        text: '',
        data: {},
        error: 'Відсутні дані для відправки'
      };
    }
    
    // Перевіряємо наявність URL-адрес
    const testUrl = messageData.testWebhookUrl || messageData.webhookUrl;
    const productionUrl = messageData.productionWebhookUrl || messageData.webhookUrl;
    
    if (!testUrl && !productionUrl) {
      return {
        success: false,
        text: '',
        data: {},
        error: 'Відсутні URL-адреси вебхуків n8n'
      };
    }
    
    // Спочатку пробуємо тестовий URL
    if (testUrl) {
      try {
        console.log(`Відправляю запит до n8n за тестовим URL: ${testUrl}`);
        
        // Копіюємо дані для запиту та замінюємо URL
        const testRequestData = { ...messageData, webhookUrl: testUrl };
        
        // Виконуємо запит до n8n через axios
        const response = await axios.post(testUrl, testRequestData, {
          headers: {
            'Content-Type': 'application/json'
          },
          timeout: 60000 // 60 секунд таймаут
        });
        
        // Якщо запит успішний, повертаємо результат
        if (response.status === 200 && response.data) {
          console.log(`Отримана відповідь від n8n (тестовий URL):`, JSON.stringify(response.data, null, 2));
          console.log(`Текст відповіді:`, response.data.text);
          console.log(`Тип тексту:`, typeof response.data.text);
          return {
            success: true,
            text: response.data.text || '',
            data: response.data || {},
            error: ''
          };
        }
      } catch (testError) {
        // Якщо помилка 404, спробуємо продакшн URL
        if (testError.response && testError.response.status === 404) {
          console.log(`Тестовий URL повернув 404, пробую продакшн URL...`);
        } else {
          // Інші помилки логуємо, але все одно пробуємо продакшн URL
          console.error(`Помилка тестового URL: ${testError.message}, пробую продакшн URL...`);
        }
      }
    }
    
    // Якщо тестовий URL не спрацював або його немає, пробуємо продакшн URL
    if (productionUrl) {
      try {
        console.log(`Відправляю запит до n8n за продакшн URL: ${productionUrl}`);
        
        // Копіюємо дані для запиту та замінюємо URL
        const prodRequestData = { ...messageData, webhookUrl: productionUrl };
        
        // Виконуємо запит до n8n через axios
        const response = await axios.post(productionUrl, prodRequestData, {
          headers: {
            'Content-Type': 'application/json'
          },
          timeout: 60000 // 60 секунд таймаут
        });
        
        // Перевіряємо відповідь
        if (response.status === 200 && response.data) {
          console.log(`Отримана відповідь від n8n (продакшн URL):`, JSON.stringify(response.data, null, 2));
          console.log(`Текст відповіді:`, response.data.text);
          console.log(`Тип тексту:`, typeof response.data.text);
          return {
            success: true,
            text: response.data.text || '',
            data: response.data || {},
            error: ''
          };
        } else {
          return {
            success: false,
            text: '',
            data: {},
            error: `Помилка відповіді n8n: ${response.status} ${response.statusText}`
          };
        }
      } catch (prodError) {
        console.error('Помилка відправки до n8n (продакшн URL):', prodError.message);
        return {
          success: false,
          text: '',
          data: {},
          error: `Помилка запиту до n8n: ${prodError.message}`
        };
      }
    }
    
    // Якщо ми дійшли сюди, значить обидва URL не спрацювали
    return {
      success: false,
      text: '',
      data: {},
      error: 'Не вдалося зʼєднатися з n8n за жодним URL'
    };
  } catch (error) {
    console.error('Непередбачена помилка при відправці до n8n:', error.message);
    return {
      success: false,
      text: '',
      data: {},
      error: `Непередбачена помилка: ${error.message}`
    };
  }
}

/**
 * Підготовка даних повідомлення для відправки в n8n
 * @param {Object} ctx - Контекст Telegraf
 * @param {Object} bot - Конфігурація бота
 * @param {Object} quotedInfo - Інформація про цитоване повідомлення
 * @param {Object} botNameDetection - Результат визначення імені бота
 * @returns {Object} - Підготовлені дані для відправки
 */
function prepareMessageData(ctx, bot, quotedInfo, botNameDetection) {
  // Основна інформація про повідомлення
  const userId = ctx.from.id;
  const username = ctx.from.username || ctx.from.first_name;
  const chatId = ctx.chat.id;
  const messageText = ctx.message.text;
  const messageId = ctx.message.message_id;
  const threadId = ctx.message.message_thread_id;
  
  // Готуємо дані для відправки
  const messageData = {
    webhookUrl: bot.webhookUrl,
    testWebhookUrl: bot.testWebhookUrl,
    productionWebhookUrl: bot.productionWebhookUrl,
    sessionId: chatId.toString(),
    messageId: messageId.toString(),
    userId: userId.toString(),
    username: username,
    chatInput: messageText,
    source: 'telegram', // Джерело
    chatId: chatId,
    threadId: threadId,
    botId: bot.id,
    botName: bot.name,
    
    // Додаткова інформація про цитату - сумісність з n8n
    is_quoting: quotedInfo?.hasQuotedMessage || false,
    quoted_text: quotedInfo?.quotedMessage || '',
    quoted_username: quotedInfo?.quotedUsername || '',
    
    // Старі назви полів для зворотної сумісності
    quoteInfo: {
      hasQuotedMessage: quotedInfo?.hasQuotedMessage || false,
      isReplyToBot: quotedInfo?.isReplyToBot || false,
      quotedMessage: quotedInfo?.quotedMessage || '',
      quotedUsername: quotedInfo?.quotedUsername || ''
    },
    
    // Інформація про виявлення імені бота
    botNameInfo: {
      mentioned: botNameDetection?.mentioned || false,
      nameFound: botNameDetection?.nameFound || '',
      method: botNameDetection?.method || ''
    }
  };
  
  return messageData;
}

module.exports = {
  sendMessageToN8N,
  prepareMessageData
};
