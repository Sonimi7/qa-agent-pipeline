# QA Agent MVP

Демопроект, показывающий «агентный» подход к тестированию:
- API smoke из OpenAPI (автовыбор безопасных операций)
- UI smoke авторизации на Playwright
- Allure-отчёт (локально и публикация в CI)

## Что показать техдиру за 3–5 минут
1) Клонирование и установка:
```bash
git clone https://github.com/Sonimi7/qa-agent-pipeline.git
cd qa-agent-pipeline
npm install
npx playwright install chromium
```

2) Запуск локальной демо-страницы логина и UI-прогон:
```bash
npm run serve              # поднимет http://localhost:5173
npm run test:ui -- --project=chromium
```
После прогона сгенерировать и открыть Allure-отчёт:
```bash
npm run allure:generate    # сгенерирует в public/allure-report
# открыть в браузере:
open http://localhost:5173/allure-report/
```

3) API smoke из OpenAPI (демо на публичном Petstore):
```bash
export OPENAPI_URL=https://petstore3.swagger.io/api/v3/openapi.json
export BASE_URL=https://petstore3.swagger.io/api/v3
export OPENAPI_ALLOWED_METHODS=GET   # безопасные методы
npm run agent:openapi
```

## Требования
- Node.js 20+
- macOS/Linux/Windows

## Переменные окружения (опционально через .env)
Создайте в корне `.env` при необходимости:
```bash
# OpenAPI → API smoke
OPENAPI_URL=
BASE_URL=
API_TOKEN=
OPENAPI_ALLOWED_METHODS=GET
OPENAPI_SMOKE_PER_TAG=2
OPENAPI_SMOKE_LIMIT=20

# UI login smoke
UI_BASE_URL=http://localhost:5173
UI_LOGIN_PATH=/login
UI_USERNAME=
UI_PASSWORD=
```

## Полезные npm-скрипты
```bash
npm run build                 # компиляция TypeScript
npm run serve                 # статический сервер public на 5173
npm run agent:openapi         # API smoke (из dist)
npm run test:ui -- --project=chromium   # UI smoke
npm run allure:generate       # HTML-отчёт Allure в public/allure-report
```

## CI (GitHub Actions)
Workflow `.github/workflows/ci.yml` делает следующее:
- Ставит зависимости и браузер Chromium
- Поднимает локальный статический сервер `serve public -l 5173`
- Прогоняет UI login smoke c `UI_BASE_URL=http://localhost:5173`
- Генерирует `allure-report/` и публикует отчёт на GitHub Pages

Секреты для расширенного сценария (если будете гонять внешние API):
- `OPENAPI_URL`, `BASE_URL`, `API_TOKEN`

## Как это работает
- Агент по OpenAPI выбирает операции без обязательных параметров/тел и выполняет GET-запросы, валидируя 2xx
- UI smoke использует эвристические локаторы для типовых полей логина (username/password/submit)

## Ссылки
- Репозиторий: `https://github.com/Sonimi7/qa-agent-pipeline`
- Allure локально: `http://localhost:5173/allure-report/`
