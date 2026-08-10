# Dental Clinic CRM

Система управления заявками на консультацию стоматологической клиники.
Принимает заявки от AI-агента YCloud (WhatsApp), предоставляет административный интерфейс для управления заявками.

## Архитектура

```
Пациент
 → WhatsApp
 → YCloud AI
 → YCloud Data Connector
 → POST /api/integrations/ycloud/consultation-requests
 → Next.js Backend (Route Handlers)
 → PostgreSQL (Prisma)
 → Панель администратора
 → Действие администратора
 → YCloud API
 → WhatsApp пациенту
```

## Стек

- **Next.js 14** (App Router) + TypeScript
- **PostgreSQL** + Prisma ORM
- **TanStack Query** для клиентского state
- **iron-session** (HTTP-only cookie sessions)
- **argon2** для хэширования паролей
- **AES-256-GCM** для шифрования ключей в БД
- **Tailwind CSS** + shadcn/ui компоненты

## Требования

- Node.js 20+
- Docker & Docker Compose
- (для локальной разработки без Docker) PostgreSQL 14+

## Быстрый старт

### 1. Клонировать и настроить окружение

```bash
cd dental-clinic
cp .env.example .env
```

Отредактируйте `.env` — установите:
- `SESSION_SECRET` — случайная строка, минимум 32 символа
- `ENCRYPTION_KEY` — другая случайная строка
- `YCLOUD_INBOUND_SECRET` — секрет для Data Connector (любая случайная строка)

### 2. Запустить базу данных

```bash
docker compose up -d db
```

### 3. Установить зависимости и накатить миграции

```bash
npm install
npx prisma migrate dev --name init
npm run db:seed
```

### 4. Запустить приложение

```bash
npm run dev
```

Приложение доступно на http://localhost:3000

### Полный запуск через Docker

```bash
cp .env.example .env
# Отредактируйте .env
docker compose up -d
# Выполнить миграции и seed:
docker compose exec app sh -c "npx prisma migrate deploy && npm run db:seed"
```

## Тестовые аккаунты

| Роль | Email | Пароль |
|------|-------|--------|
| OWNER | owner@example.com | ChangeMe123! |
| ADMIN | admin@example.com | ChangeMe123! |
| VIEWER | viewer@example.com | ChangeMe123! |

> ⚠️ **Измените пароли перед деплоем в production!**

## Миграции

```bash
# Создать новую миграцию
npx prisma migrate dev --name название_изменения

# Применить миграции в production
npx prisma migrate deploy

# Prisma Studio (браузерный UI для БД)
npm run db:studio
```

## Тесты

```bash
# Unit тесты
npm run test

# Запустить в watch-режиме
npm run test:watch

# E2E тесты (нужен запущенный сервер)
npm run test:e2e
```

## Настройка YCloud

Полная инструкция: [docs/YCLOUD_SETUP.md](docs/YCLOUD_SETUP.md)

Краткий пример:
```bash
curl -X POST http://localhost:3000/api/integrations/ycloud/consultation-requests \
  -H "Authorization: Bearer YOUR_YCLOUD_INBOUND_SECRET" \
  -H "Content-Type: application/json" \
  -H "Idempotency-Key: test-001" \
  -d '{"externalRequestId":"test-001","patient":{"fullName":"Тест","phone":"+996700123456"},"consultation":{"service":"Имплантация","preferredDate":"2026-08-01","preferredTime":"10:00","timezone":"Asia/Bishkek"}}'
```

## Переменные окружения

| Переменная | Обязательна | Описание |
|-----------|-------------|---------|
| `DATABASE_URL` | ✅ | PostgreSQL connection string |
| `SESSION_SECRET` | ✅ | Секрет сессий (32+ символа) |
| `ENCRYPTION_KEY` | ✅ | Ключ шифрования API-ключей |
| `YCLOUD_INBOUND_SECRET` | ✅ | Секрет Bearer для Data Connector |
| `YCLOUD_API_KEY` | нет* | YCloud API ключ (задаётся через интерфейс) |
| `YCLOUD_BUSINESS_PHONE` | нет* | Телефон бизнеса в YCloud |
| `CLINIC_NAME` | нет | Название клиники |
| `CLINIC_ADDRESS` | нет | Адрес клиники |
| `CLINIC_TIMEZONE` | нет | Временная зона (default: Asia/Bishkek) |

*можно задать через `Настройки → YCloud интеграция` в интерфейсе

## Роли пользователей

| Роль | Возможности |
|------|-------------|
| OWNER | Полный доступ: заявки, пациенты, настройки, пользователи |
| ADMIN | Заявки и пациенты (подтверждение, перенос, отклонение) |
| VIEWER | Только просмотр |

## Production деплой

1. Настройте PostgreSQL
2. Заполните `.env` реальными значениями (длинные случайные секреты)
3. `npx prisma migrate deploy`
4. `npm run build && npm start`
5. Настройте nginx/reverse proxy с SSL
6. Настройте YCloud Data Connector по инструкции

## Troubleshooting

**Заявка не появляется в интерфейсе:**
- Проверьте ответ curl — должен быть `201`
- При `401` — неверный `YCLOUD_INBOUND_SECRET`
- При `422` — проверьте поле `errors` в ответе
- Убедитесь, что `Idempotency-Key` уникален для каждого запроса

**WhatsApp-сообщение не отправляется:**
- В настройках проверьте, что API ключ YCloud сохранён
- Нажмите «Проверить подключение» в `Настройки → YCloud интеграция`
- Проверьте логи в `WhatsApp` → колонка статуса в истории заявки

**Не могу войти:**
- Проверьте, что `SESSION_SECRET` задан в `.env`
- Убедитесь, что seed выполнен: `npm run db:seed`
