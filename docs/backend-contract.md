# Контракт backend для EDU

Версия: `v1`. Этот документ фиксирует API, которое реализовано вместо локальных моков frontend. Все примеры JSON; кодировка UTF-8. Базовый путь: `/api/v1`. Успешные ответы возвращают ресурс напрямую, ошибки — `{ "error": { "code": "...", "message": "...", "fields": {} } }`. Для списков: `{ "items": [...], "nextCursor": null | "..." }`. Идентификаторы — непрозрачные строки. Время — ISO 8601 UTC, отображение дат делает клиент по локальному часовому поясу.

Реализация: `server/` на Node.js и SQLite. Для экранов frontend дополнительно предоставлен `GET /me/snapshot`: агрегированный снимок профиля, направлений, заданий, прогресса, проектов, мероприятий и видео в формате `AppState`. Ресурсные маршруты ниже доступны независимо от него. Вне MAX frontend API не вызывает и показывает экран входа.

## Авторизация и MAX

Frontend передаёт **сырую** строку `window.WebApp.initData` в заголовке `Authorization: MaxInit <initData>` на каждом запросе. Сервер проверяет подпись по токену бота, срок действия и извлекает `user.id`; `initDataUnsafe` не используется как доказательство личности. Токен бота никогда не попадает на клиент. В локальном браузерном демо API не вызывается. Алгоритм подписи — по [официальной документации MAX](https://dev.max.ru/docs/webapps/validation). Сама мини app запускается через HTTPS URL, привязанный к боту MAX: [подключение](https://dev.max.ru/docs/webapps/introduction).

`GET /me/bootstrap` — начальная загрузка после авторизации:

```json
{
  "profile": { "id": "u1", "name": "Александр Булатов", "username": "alex.dev", "handle": "@alex.dev", "avatarUrl": null, "level": 7, "xp": 742, "xpNext": 1000, "skills": { "frontend": 3, "backend": 5 }, "bio": "Учусь создавать полезные IT-продукты", "githubUrl": "https://github.com/alex-dev" },
  "settings": { "theme": "light", "notifications": { "deadlines": true, "comments": true, "projects": false, "events": false } }
}
```

`GET /users/{id}` возвращает публичный профиль (`id`, `name`, `username`, `handle`, `avatarUrl`, `level`, `skills`, `bio`, `githubUrl`, `completedTasks`, `projects`, `videos`, `maxProfileUrl`). Для чужого профиля приватные настройки и черновики не возвращаются. Данные MAX используются только при первом создании аккаунта; последующие изменения пользователя EDU не перезаписывает.

`PATCH /me/profile` частично обновляет `{ name?, username?, bio?, githubUrl? }`. Имя содержит 2–80 символов, bio — до 300. Username передаётся без `@`, содержит 3–24 символа из `[A-Za-z0-9._]` и уникален без учёта регистра. `githubUrl` принимает логин или HTTPS-ссылку на профиль `github.com/{login}`, нормализуется в полную ссылку; пустая строка или `null` удаляет ссылку. Ссылки на репозитории и другие домены отклоняются с `400 validation_error`. При конфликте username сервер отвечает `409` с кодом `username_taken`.

`PUT /me/avatar` принимает сырое тело JPEG, PNG или WebP размером до 5 МБ. Сервер проверяет сигнатуру файла и возвращает профиль с публичным неизменяемым `avatarUrl` вида `/profile-media/{uuid}.{ext}`. `DELETE /me/avatar` удаляет загруженный пользователем файл и возвращает профиль с `avatarUrl: null`; клиент показывает инициалы. Публичная раздача `/profile-media/*` не требует авторизации и использует `Cache-Control: public, max-age=31536000, immutable`.

`PATCH /me/settings` принимает `theme: light | system | dark` и/или `notifications` с четырьмя boolean-полями; возвращает обновлённые настройки.

## Обучение и задания

`GET /directions` возвращает список `{ id, title, longTitle, description, color, started, currentLevel, unlockedLevel }`. `GET /directions/{id}/roadmap` возвращает `{ direction, levels: [{ number, title, state: "completed" | "current" | "locked", tasks: [{ id, title, difficulty, xp, hours }] }] }`. Для каждого доступного уровня клиенту нужны три варианта задания; закрытый уровень не открывает задания.

`GET /tasks/{id}` возвращает полную карточку:

```json
{
  "id": "responsive-dashboard", "title": "Responsive Dashboard", "directionId": "frontend", "level": 3,
  "difficulty": "hard", "xp": 250, "estimatedHours": "6–8", "deadlineAt": "2026-09-26T18:00:00Z",
  "description": "Соберите адаптивный dashboard", "requirements": ["Семантический HTML"],
  "criteria": ["Работоспособность", "Качество кода"],
  "progress": { "status": "new", "repositoryUrl": null, "score": null, "liked": false }
}
```

Статусы: `new`, `active`, `checking`, `revision`, `completed`, `abandoned`. `GET /me/tasks?status=active|completed|liked|all&cursor=...` заполняет «Мои задания». Действия:

| Запрос | Тело | Результат |
| --- | --- | --- |
| `POST /tasks/{id}/accept` | пусто | `progress` со статусом `active` |
| `PATCH /tasks/{id}/progress` | `{ "repositoryUrl": "https://github.com/user/repo" }` | обновлённый `progress` |
| `POST /tasks/{id}/submit` | `{ "repositoryUrl": "..." }` | `{ "submissionId": "s1", "status": "checking" }` |
| `GET /submissions/{id}` | — | результат проверки или текущий статус |
| `POST /tasks/{id}/abandon` | пусто | `progress` со статусом `abandoned` |
| `PUT /tasks/{id}/like` | `{ "liked": true }` | `{ "liked": true }` |

`GET /submissions/{id}` при завершении возвращает `{ submissionId, taskId, status: "completed" | "revision", score, earnedXp, breakdown: [{ name, score, maxScore }], feedback, unlockedLevel }`. Сервер проверяет доступность задания и URL репозитория. Начисление XP, обновление навыка и открытие следующего уровня выполняются атомарно **один раз на submission**; повторный запрос не дублирует награду. Для `POST /tasks/{id}/submit` клиент передаёт `Idempotency-Key` (UUID), чтобы безопасно повторить запрос после тайм-аута. При `revision` XP не начисляется и разрешена повторная отправка. Клиент опрашивает результат раз в 2 секунды, пока статус `checking`.

## Групповые проекты

`GET /projects?q=&cursor=` — карточки с `id`, `title`, `description`, `roles`, `members`, `maxMembers`, `owner`, `liked`, `applicationStatus`. `GET /projects/{id}` добавляет `goal`, `duration`, `format`, `tags`, `team`, полные требования ролей. Роль: `{ "name": "Backend", "minLevel": 5, "requirement": "Go, REST API" }`.

`POST /projects` принимает `{ title, description, goal, duration, format: "remote" | "offline", maxMembers, tags: string[], roles: Role[] }`, возвращает проект с `201 Created`; автор автоматически входит в команду. `POST /projects/{id}/applications` принимает `{ "role": "Backend" }` и возвращает `{ id, status: "pending", role }`. Сервер проверяет уровень навыка, свободное место и отсутствие повторной заявки. `GET /me/projects` возвращает созданные проекты, членство и заявки. `PUT /projects/{id}/like` принимает `{ liked: boolean }`. Для превращения заявки в участника понадобится `PATCH /projects/{id}/applications/{applicationId}` с `{ status: "accepted" | "rejected" }` для автора проекта; после принятия `GET /me/projects` и команда проекта обновляются.

## Мероприятия

`GET /events?format=online|offline&kind=&cursor=` — список. `GET /events/{id}` — `{ id, title, dateAt, endAt, location, format, kind, description, organizer, tags, meetingUrl? }`. `POST /events/{id}/registrations` возвращает `{ eventId, status: "registered" }`; повторная запись возвращает тот же результат. `DELETE /events/{id}/registrations/me` отменяет запись. `PUT /events/{id}/like` принимает `{ liked: boolean }`. `GET /me/events` возвращает записи пользователя.

## Видео и сообщество

`GET /videos?cursor=&directionId=` возвращает ленту `{ id, author, caption, directionId, playbackUrl, posterUrl, likes, commentsCount, liked, createdAt }`. Ссылки для воспроизведения и обложек должны быть HTTPS. `POST /videos/uploads` принимает метаданные `{ fileName, mimeType, size }` и выдаёт `{ uploadId, uploadUrl, method, headers }`; клиент загружает файл на `uploadUrl`. `POST /videos` принимает `{ uploadId, caption, directionId, linkedTaskId?, linkedProjectId? }` и возвращает созданную публикацию. Видео в `processing` не попадает в общую ленту до готовности; `GET /videos/{id}` сообщает `processing | published | failed`.

Текущая локальная реализация принимает MP4/WebM до 100 МБ, сохраняет файл на диске и сразу переводит прошедший проверку формата файл в `published` без перекодирования. `uploadUrl` действует 10 минут и передаёт одноразовый токен в `headers`. Публичное воспроизведение поддерживает HTTP `Range`. В рабочем окружении `PUBLIC_BASE_URL` должен быть HTTPS.

`PUT /videos/{id}/like` принимает `{ liked: boolean }` и возвращает новый счётчик. `GET /videos/{id}/comments?cursor=` — комментарии с `id`, `author`, `text`, `parentId`, `createdAt`, `likes`, `liked`. `POST /videos/{id}/comments` принимает `{ text, parentId? }`; `PUT /videos/{id}/comments/{commentId}/like` принимает `{ liked: boolean }`. Сервер ограничивает длину подписи и комментария, проверяет доступность родительского комментария, а счётчики отдаёт актуальными. Шеринг текста и ссылки на публикацию выполняет MAX Bridge на клиенте; если потребуется шеринг медиа через бота, backend отдельно вернёт `mid` сообщения бота для `shareMaxContent` по [MAX Bridge](https://dev.max.ru/docs/webapps/bridge).

## Общие правила и ошибки

- `400` — неверный формат/обязательное поле (`validation_error`, `fields`), `401` — неверные или просроченные данные MAX, `403` — нет прав/недостаточный уровень, `404` — ресурс отсутствует, `409` — конфликт статуса или повторная заявка, `413` — видео слишком велико, `429` — лимит запросов, `5xx` — ошибка сервера.
- Для списков `nextCursor` передаётся обратно без изменений. Клиент показывает загрузку, пустой результат и действие «Повторить» при сетевой ошибке.
- Все мутации возвращают новое состояние ресурса, чтобы клиент не рассчитывал XP и счётчики как источник истины.
- Backend определяет пользователя только по проверенному `initData`. ID других пользователей в теле запросов не дают права действовать от их имени.

Базовая проверка GitHub-репозитория сейчас смотрит доступность, структуру, README и наличие исходных файлов; она не запускает присланный код и не оценивает смысл решения. Контракт будущего AI-анализатора — в [ai-review-contract.md](ai-review-contract.md).
