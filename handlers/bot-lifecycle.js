/**
 * Модуль для управління життєвим циклом ботів
 */

const fs = require('fs');
const path = require('path');
const { Telegraf } = require('telegraf');

/**
 * Ініціалізує Telegraf інстанси для всіх ботів
 * @param {Array} bots - Масив конфігурацій ботів
 * @param {Object} botInstances - Об'єкт для зберігання інстансів ботів
 * @param {Object} botUsernames - Об'єкт для зберігання імен ботів
 * @returns {Promise<boolean>} - True, якщо всі боти ініціалізовані успішно
 */
async function initBots(bots, botInstances, botUsernames) {
  try {
    console.log('Ініціалізація ботів...');
    
    // Ініціалізуємо кожен бот
    for (const botConfig of bots) {
      try {
        console.log(`Ініціалізація бота ${botConfig.name} (${botConfig.id})...`);
        
        // Створюємо інстанс Telegraf бота
        const botInstance = new Telegraf(botConfig.token);
        
        // Отримуємо інформацію про бота
        const botInfo = await botInstance.telegram.getMe();
        
        // Запам'ятовуємо ім'я бота
        botUsernames[botConfig.id] = botInfo.username;
        
        // Створюємо директорію для тимчасових файлів, якщо вона вказана
        if (botConfig.tempFilesDir) {
          const tempDir = path.resolve(process.cwd(), botConfig.tempFilesDir);
          if (!fs.existsSync(tempDir)) {
            fs.mkdirSync(tempDir, { recursive: true });
            console.log(`Створено директорію для тимчасових файлів: ${tempDir}`);
          }
        }
        
        // Зберігаємо інстанс бота
        botInstances[botConfig.id] = botInstance;
        
        console.log(`Бот ${botConfig.name} (${botConfig.id}) успішно ініціалізовано!`);
        console.log(`Ім'я бота в Telegram: @${botInfo.username}`);
      } catch (error) {
        console.error(`Помилка при ініціалізації бота ${botConfig.id}:`, error);
      }
    }
    
    // Перевіряємо, чи всі боти ініціалізовані
    const initializedCount = Object.keys(botInstances).length;
    console.log(`Успішно ініціалізовано ${initializedCount} з ${bots.length} ботів`);
    
    return initializedCount === bots.length;
  } catch (error) {
    console.error('Загальна помилка при ініціалізації ботів:', error);
    return false;
  }
}

/**
 * Запускає всіх ботів
 * @param {Array} bots - Масив конфігурацій ботів
 * @param {Object} botInstances - Об'єкт з інстансами ботів
 * @param {Function} setupShutdownHandlers - Функція для налаштування обробників завершення роботи
 * @returns {Promise<boolean>} - True, якщо всі боти успішно запущені
 */
async function startBots(bots, botInstances, setupShutdownHandlers) {
  try {
    console.log('Запуск ботів...');
    
    // Запускаємо всіх ботів
    const startPromises = [];
    for (const botId in botInstances) {
      const bot = botInstances[botId];
      const botConfig = bots.find(b => b.id === botId);
      
      if (!bot || !botConfig) continue;
      
      console.log(`Запуск бота ${botConfig.name} (${botId})...`);
      
      // Запускаємо бота
      startPromises.push(
        bot.launch()
          .then(() => {
            console.log(`Бот ${botConfig.name} (${botId}) успішно запущено!`);
            return true;
          })
          .catch((error) => {
            console.error(`Помилка при запуску бота ${botConfig.name} (${botId}):`, error);
            return false;
          })
      );
    }
    
    // Чекаємо на завершення запуску всіх ботів
    const results = await Promise.all(startPromises);
    const successCount = results.filter(result => result).length;
    
    console.log(`Успішно запущено ${successCount} з ${startPromises.length} ботів`);
    
    // Налаштовуємо обробку завершення роботи
    setupShutdownHandlers();
    
    return successCount === startPromises.length;
  } catch (error) {
    console.error('Загальна помилка при запуску ботів:', error);
    return false;
  }
}

/**
 * Зупиняє всіх ботів
 * @param {Array} bots - Масив конфігурацій ботів
 * @param {Object} botInstances - Об'єкт з інстансами ботів
 * @param {string} signal - Сигнал завершення роботи
 */
async function stopAllBots(bots, botInstances, signal) {
  console.log(`Отримано сигнал ${signal}, зупиняємо всіх ботів...`);
  
  for (const botId in botInstances) {
    try {
      const botConfig = bots.find(b => b.id === botId);
      console.log(`Зупинка бота ${botConfig ? botConfig.name : botId}...`);
      
      await botInstances[botId].stop(signal);
      console.log(`Бот ${botConfig ? botConfig.name : botId} успішно зупинено`);
    } catch (error) {
      console.error(`Помилка при зупинці бота ${botId}:`, error);
    }
  }
  
  console.log('Всі боти зупинено');
}

/**
 * Завантажує всі конфігурації ботів з вказаної директорії
 * @param {string} configDir - Шлях до директорії з конфігураціями
 * @returns {Promise<Array>} - Масив завантажених конфігурацій ботів
 */
async function loadBotConfigs(configDir) {
  try {
    console.log(`Завантаження конфігурацій ботів з: ${configDir}`);
    
    // Перевіряємо, чи існує директорія з конфігураціями
    const fullConfigDir = path.resolve(process.cwd(), configDir);
    if (!fs.existsSync(fullConfigDir)) {
      console.error(`Директорія з конфігураціями не знайдена: ${fullConfigDir}`);
      return [];
    }

    // Отримуємо всі .js файли в директорії
    const configFiles = fs.readdirSync(fullConfigDir)
      .filter(file => file.endsWith('.js'));
    
    console.log(`Знайдено ${configFiles.length} конфігураційних файлів`);
    
    // Завантажуємо кожну конфігурацію
    const bots = [];
    for (const file of configFiles) {
      try {
        const configPath = path.join(fullConfigDir, file);
        console.log(`Завантаження конфігурації з: ${configPath}`);
        
        // Очищаємо кеш Node.js для повторного завантаження
        delete require.cache[require.resolve(configPath)];
        
        // Завантажуємо конфігурацію
        const botConfig = require(configPath);
        
        // Перевіряємо обов'язкові поля
        if (!botConfig.id || !botConfig.token || !botConfig.webhookUrl) {
          console.error(`Помилка: відсутні обов'язкові поля в конфігурації ${file}`);
          continue;
        }
        
        bots.push(botConfig);
        console.log(`Успішно завантажено конфігурацію для бота: ${botConfig.name} (${botConfig.id})`);
      } catch (error) {
        console.error(`Помилка завантаження конфігурації ${file}:`, error);
      }
    }
    
    console.log(`Всього завантажено ${bots.length} конфігурацій ботів`);
    return bots;
  } catch (error) {
    console.error('Помилка при завантаженні конфігурацій ботів:', error);
    return [];
  }
}

module.exports = {
  initBots,
  startBots,
  stopAllBots,
  loadBotConfigs
};
