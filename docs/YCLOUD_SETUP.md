# Настройка YCloud Data Connector

## 1. Создание Data Connector в YCloud

1. Войдите в кабинет YCloud (app.ycloud.com)
2. Перейдите в раздел **AI Agents → Data Connectors**
3. Нажмите **Create Data Connector**

## 2. Параметры Data Connector

**Method:** `POST`

**URL:**
```
https://YOUR_DOMAIN/api/integrations/ycloud/consultation-requests
```
Замените `YOUR_DOMAIN` на ваш реальный домен (например, `dental.example.com`).

**Headers:**
```
Authorization: Bearer YOUR_YCLOUD_INBOUND_SECRET
Content-Type: application/json
Idempotency-Key: {{conversation_id}}-{{unique_id}}
X-YCloud-Source: ai-actionbook
```

> `YOUR_YCLOUD_INBOUND_SECRET` — это значение, которое вы задали в настройках приложения (`Настройки → YCloud интеграция → YCLOUD_INBOUND_SECRET`).
>
> `{{conversation_id}}` и `{{unique_id}}` — переменные из YCloud. Проверьте, какие именно переменные доступны в вашем Actionbook, и подставьте их в поле Idempotency-Key, чтобы обеспечить уникальность.

## 3. Request Body

```json
{
  "externalRequestId": "{{conversation_id}}",
  "patient": {
    "fullName": "{{patient_name}}",
    "phone": "{{patient_phone}}",
    "whatsappId": "{{whatsapp_contact_id}}",
    "district": "{{district}}",
    "preferredLanguage": "{{language}}"
  },
  "consultation": {
    "service": "{{service}}",
    "complaint": "{{complaint}}",
    "missingTeethCount": "{{missing_teeth_count}}",
    "jaw": "{{jaw}}",
    "missingDuration": "{{missing_duration}}",
    "rootsRemaining": "{{roots_remaining}}",
    "preferredDate": "{{preferred_date}}",
    "preferredTime": "{{preferred_time}}",
    "timezone": "Asia/Bishkek"
  },
  "ycloud": {
    "conversationId": "{{conversation_id}}",
    "contactId": "{{contact_id}}"
  }
}
```

> **Важно:** Имена переменных в двойных скобках (`{{...}}`) зависят от того, как они называются в вашем Actionbook. Откройте ваш Actionbook в YCloud и используйте именно те переменные, которые там доступны.

## 4. Добавление Data Connector в AI Actionbook

1. Перейдите в **AI Agents → AI Actionbook**
2. Откройте ваш Actionbook для стоматологической клиники
3. В нужном шаге (когда пациент подтвердил данные) добавьте **Action → HTTP Request**
4. Выберите созданный Data Connector
5. Настройте маппинг переменных из диалога на поля запроса

## 5. Тестирование

### curl-запрос для проверки:
```bash
curl -X POST https://YOUR_DOMAIN/api/integrations/ycloud/consultation-requests \
  -H "Authorization: Bearer YOUR_YCLOUD_INBOUND_SECRET" \
  -H "Content-Type: application/json" \
  -H "Idempotency-Key: test-001" \
  -d '{
    "externalRequestId": "test-conversation-001",
    "patient": {
      "fullName": "Тестовый Пациент",
      "phone": "+996700123456",
      "district": "Асанбай",
      "preferredLanguage": "ru"
    },
    "consultation": {
      "service": "Имплантация",
      "complaint": "Тест",
      "missingTeethCount": 1,
      "jaw": "lower",
      "preferredDate": "2026-08-01",
      "preferredTime": "10:00",
      "timezone": "Asia/Bishkek"
    }
  }'
```

**Ожидаемый ответ (201):**
```json
{
  "success": true,
  "requestId": "...",
  "status": "pending",
  "message": "Consultation request created and awaiting administrator confirmation"
}
```

### Повторный запрос (проверка идемпотентности):
Повторите тот же curl с тем же `Idempotency-Key`. Вы должны получить ответ `200` с `"duplicate": true`.

## 6. Диагностика ошибок

| Код | Причина |
|-----|---------|
| 401 | Неверный `YCLOUD_INBOUND_SECRET` в заголовке Authorization |
| 400 | Отсутствует заголовок `Idempotency-Key` |
| 415 | Неверный `Content-Type` (должен быть `application/json`) |
| 422 | Ошибка валидации — проверьте поля `errors` в ответе |
| 409 | Уже существует активная заявка с тем же телефоном и временем |
| 429 | Превышен лимит запросов (30/мин с одного IP) |
| 500 | Внутренняя ошибка — проверьте логи приложения |

## 7. Проверка в интерфейсе

После успешного запроса:
1. Войдите в приложение по адресу `https://YOUR_DOMAIN`
2. Перейдите в раздел **Заявки**
3. Новая заявка должна появиться со статусом **Ожидает**
4. Администраторы и владельцы получат внутреннее уведомление (обновляется каждые 15 секунд)
