/**
 * Головний файл системи Telegram ботів
 * Забезпечує завантаження, налаштування та запуск групи ботів
 */

const BotDispatcher = require('./bot-dispatcher');

// Ініціалізація диспетчера ботів
const dispatcher = new BotDispatcher();

// Функція запуску системи ботів
async function startBotSystem() {
  try {
    console.log('===== ЗАПУСК СИСТЕМИ TELEGRAM БОТІВ =====');
    
    // Завантаження конфігурацій ботів
    console.log('\n1. ЗАВАНТАЖЕННЯ КОНФІГУРАЦІЙ БОТІВ:');
    const botConfigs = await dispatcher.loadBotConfigs();
    
    if (botConfigs.length === 0) {
      console.error('Помилка: Не знайдено жодної конфігурації бота!');
      return false;
    }
    
    console.log(`Успішно завантажено ${botConfigs.length} конфігурацій ботів:`);
    botConfigs.forEach(bot => {
      console.log(`- ${bot.name} (ID: ${bot.id})`);
    });
    
    // Ініціалізація всіх ботів
    console.log('\n2. ІНІЦІАЛІЗАЦІЯ БОТІВ:');
    const initSuccess = await dispatcher.initBots();
    
    if (!initSuccess) {
      console.error('Попередження: Не всі боти були успішно ініціалізовані!');
    }
    
    // Налаштування обробників повідомлень
    console.log('\n3. НАЛАШТУВАННЯ ОБРОБНИКІВ ПОВІДОМЛЕНЬ:');
    dispatcher.setupHandlers();
    
    // Запуск ботів
    console.log('\n4. ЗАПУСК БОТІВ:');
    const startSuccess = await dispatcher.startBots();
    
    if (startSuccess) {
      console.log('\n===== СИСТЕМА БОТІВ УСПІШНО ЗАПУЩЕНА =====');
      console.log('Натисніть Ctrl+C для завершення роботи');
    } else {
      console.error('\n===== ПОМИЛКА ЗАПУСКУ СИСТЕМИ БОТІВ =====');
      console.error('Деякі боти не вдалося запустити. Перевірте логи для деталей.');
    }
    
    return startSuccess;
  } catch (error) {
    console.error('Критична помилка при запуску системи ботів:', error);
    return false;
  }
}

// Запуск системи ботів
startBotSystem().catch(error => {
  console.error('Невідома помилка при запуску системи ботів:', error);
  process.exit(1);
});
