/**
 * Глобальна конфігурація для всіх ботів
 */

// Загальна вірогідність випадкової відповіді (якщо бота не згадано)
const GLOBAL_RANDOM_RESPONSE_PROBABILITY = 0.10;

// Вірогідність додаткової відповіді від другого бота (якщо згадано кілька ботів)
const SECONDARY_BOT_RESPONSE_PROBABILITY = 0.15;

// Мінімальна довжина слова для розгляду як частини імені бота
const MIN_NAME_PART_LENGTH = 4;

// Шлях до каталогу з конфігураціями ботів
const BOTS_CONFIG_DIR = './bots_configs';

module.exports = {
  GLOBAL_RANDOM_RESPONSE_PROBABILITY,
  SECONDARY_BOT_RESPONSE_PROBABILITY,
  MIN_NAME_PART_LENGTH,
  BOTS_CONFIG_DIR
};
