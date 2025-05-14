/**
 * Модуль для завантаження та управління конфігураціями ботів
 * Використовує модульну архітектуру з розділеними компонентами
 */

const { BOTS_CONFIG_DIR } = require('./global-config');
const { loadBotConfigs, initBots, startBots, stopAllBots } = require('./handlers/bot-lifecycle');
const { createTextMessageHandler, createFileMessageHandler, setupBasicCommands } = require('./handlers/bot-handlers');

class BotDispatcher {
  constructor() {
    this.bots = [];
    this.botInstances = {};
    this.botUsernames = {};
  }

  /**
   * Завантажує всі конфігурації ботів з вказаної директорії
   * @returns {Promise<Array>} - Масив завантажених конфігурацій ботів
   */
  async loadBotConfigs() {
    this.bots = await loadBotConfigs(BOTS_CONFIG_DIR);
    return this.bots;
  }

  /**
   * Ініціалізує Telegraf інстанси для всіх ботів
   * @returns {Promise<boolean>} - True, якщо всі боти ініціалізовані успішно
   */
  async initBots() {
    // Переконуємося, що конфігурації завантажені
    if (this.bots.length === 0) {
      await this.loadBotConfigs();
    }
    
    // Очищаємо існуючі інстанси
    this.botInstances = {};
    this.botUsernames = {};
    
    const result = await initBots(this.bots, this.botInstances, this.botUsernames);
    return result;
  }

  /**
   * Налаштовує обробники для всіх ботів
   */
  setupHandlers() {
    try {
      console.log('Налаштування обробників повідомлень...');
      
      // Для кожного бота налаштовуємо обробники
      for (const botId in this.botInstances) {
        const bot = this.botInstances[botId];
        const botConfig = this.bots.find(b => b.id === botId);
        
        if (!bot || !botConfig) continue;
        
        console.log(`Налаштування обробників для бота ${botConfig.name} (${botId})...`);
        
        // Налаштовуємо базові команди
        setupBasicCommands(bot, botConfig);
        
        // Обробка текстових повідомлень
        bot.on('text', createTextMessageHandler(botConfig, this.bots, this.botUsernames));
        
        // Обробка файлових повідомлень (документи, фото)
        bot.on(['document', 'photo'], createFileMessageHandler(botConfig, this.bots, this.botUsernames));
        
        console.log(`Обробники для бота ${botConfig.name} (${botId}) успішно налаштовані`);
      }
      
      console.log('Всі обробники повідомлень успішно налаштовані');
    } catch (error) {
      console.error('Помилка при налаштуванні обробників:', error);
    }
  }

  /**
   * Запускає всіх ботів
   * @returns {Promise<boolean>} - True, якщо всі боти успішно запущені
   */
  async startBots() {
    return await startBots(this.bots, this.botInstances, () => this.setupShutdownHandlers());
  }

  /**
   * Налаштовує обробники завершення роботи
   */
  setupShutdownHandlers() {
    process.once('SIGINT', () => this.stopAllBots('SIGINT'));
    process.once('SIGTERM', () => this.stopAllBots('SIGTERM'));
    
    console.log('Налаштовано обробники завершення роботи');
  }

  /**
   * Зупиняє всіх ботів
   * @param {string} signal - Сигнал завершення роботи
   */
  async stopAllBots(signal) {
    await stopAllBots(this.bots, this.botInstances, signal);
  }
}

module.exports = BotDispatcher;
