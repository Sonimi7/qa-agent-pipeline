# QA Agent MVP

Набор для демонстрации подхода «агент-тестировщик»:
- API smoke из OpenAPI спецификации
- UI login smoke на Playwright
- Готовый CI workflow (GitHub Actions)

## Требования
- Node.js 20+
- macOS/Linux/Windows

## Установка

```bash
npm install
npx playwright install chromium
```

## Переменные окружения
Создайте файл `.env` в корне и укажите:

```bash
# OpenAPI → API smoke
OPENAPI_URL= # ссылка на спецификацию (json/yaml)
BASE_URL=     # базовый URL сервера API
API_TOKEN=    # Bearer токен (если нужен)
OPENAPI_SMOKE_PER_TAG=2
OPENAPI_SMOKE_LIMIT=20

# UI login smoke
UI_BASE_URL=
UI_LOGIN_PATH=/login
UI_USERNAME=
UI_PASSWORD=

# OpenAI (опционально)
OPENAI_API_KEY=
```

## Скрипты

```bash
# Сборка
npm run build

# API smoke (из OpenAPI)
npm run agent:openapi

# UI login smoke
npm run test:ui -- --project=chromium --reporter=list
```

## CI
В `.github/workflows/ci.yml` настроены два шага: API smoke и UI smoke.
Секреты для CI:
- `OPENAPI_URL`, `BASE_URL`, `API_TOKEN`
- `UI_BASE_URL`, `UI_LOGIN_PATH`, `UI_USERNAME`, `UI_PASSWORD`

## Примечания
- Агент по OpenAPI выбирает ограниченный набор операций (по тэгам) и проверяет 2xx ответы.
- UI smoke использует эвристические локаторы для типовых форм логина.
