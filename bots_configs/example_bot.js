/**
 * Приклад конфігураційного файлу для Telegram бота
 */

module.exports = {
  id: 'example_bot',
  name: 'Приклад Бота',
  token: 'YOUR_TELEGRAM_BOT_TOKEN_HERE',
  webhookUrl: 'http://localhost:5678/webhook-test/your-webhook-id-here',
  nameVariations: [
    // Повні варіанти імені
    'Приклад Бота', 'Приклад',
    
    // Зменшувально-пестливі форми
    'Прикладик', 'Ботик',
    
    // Жартівливі варіанти
    'Ботяра', 'Прикладище',
    
    // Латинські варіанти
    'Example', 'Bot', 'Example_Bot',
    
    // Різний регістр
    'приклад бота', 'приклад',
    'example', 'bot', 'example_bot'
  ],
  randomResponseProbability: 0.1,
  tempFilesDir: './data/example-bot-temp-files',
  productionWebhookUrl: 'http://localhost:5678/webhook/your-webhook-id-here',
  testWebhookUrl: 'http://localhost:5678/webhook-test/your-webhook-id-here'
};
