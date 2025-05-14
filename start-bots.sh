#!/bin/bash

# Скрипт для запуску системи Telegram ботів

# Отримати шлях до скрипту
SCRIPT_PATH="$(dirname "$(readlink -f "$0")")"
cd "$SCRIPT_PATH"

# Перевірити наявність необхідних каталогів
if [ ! -d "./bots_configs" ]; then
  echo "Помилка: Каталог з конфігураціями ботів не знайдено!"
  exit 1
fi

# Перевірити наявність node.js
if ! command -v node &> /dev/null; then
  echo "Помилка: Node.js не встановлено!"
  exit 1
fi

# Запустити систему ботів
echo "Запускаю систему Telegram ботів..."
node index.js

# Завершення роботи
echo "Систему ботів завершено."
