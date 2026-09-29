# EDU для MAX

EDU — мини-приложение в MAX для практического обучения IT-направлениям. Пользователь выбирает трек, проходит уровни с тремя вариантами заданий, получает опыт и собирает портфолио из ссылок на GitHub.

Открыть приложение: [MAX](https://max.ru/t187_hakaton_max_bot?startapp) · [веб-версия](https://edu-pf-tech.ru)

## Возможности

- шесть направлений: Frontend, Backend, Android, UI/UX, QA и Data Science;
- 7 уровней и 3 задания на каждом уровне;
- прогресс, XP, уровень и сетка навыков профиля;
- командные проекты и мероприятия;
- короткие видео сообщества;
- тема, которая учитывает настройку устройства;
- авторизация через данные запуска MAX, профиль и ссылка на GitHub;
- REST API, контракт которого описан в `docs/openapi.json`.

## Запуск

Требуется Node.js 24 или новее.

```bash
npm install
npm run dev
```

Для сервера создайте `.env` по примеру `.env.example`, укажите токен бота MAX и выполните:

```bash
npm run server:env
```

Проверка production-сборки:

```bash
npm run build
npm run preview
```

## Документация

- [Контракт backend API](docs/backend-contract.md)
- [OpenAPI](docs/openapi.json)
- [Архитектура](docs/architecture.md)
- [Трассировка требований](docs/requirements-traceability.md)
- [Контекст проекта](docs/PROJECT_CONTEXT.md)

## Команда

- Александр Булатов — product manager
- Александр Веселков — backend
- Олег Плохих — frontend

Лицензия: MIT.
