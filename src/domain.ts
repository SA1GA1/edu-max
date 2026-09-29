export type TaskStatus = 'new' | 'active' | 'checking' | 'completed' | 'abandoned' | 'revision'
export type Role = { name: string; minLevel: number; requirement: string }
export type Task = { id: string; title: string; directionId: string; level: number; difficulty: 'Легко' | 'Средне' | 'Сложно'; xp: number; hours: string; deadline: string; description: string; requirements: string[]; criteria: string[] }
export type Project = { id: string; title: string; description: string; goal: string; duration: string; format: 'remote' | 'offline'; maxMembers: number; roles: Role[]; tags: string[]; members: number; ownerId: string; memberIds: string[]; liked: boolean; applications?: { id: string; user_id: string; role: string; status: string }[] }
export type Event = { id: string; title: string; date: string; time: string; location: string; format: 'online' | 'offline'; kind: string; description: string; tags: string[]; liked: boolean }
export type Comment = { id: string; userId: string; text: string; date: string; parentId?: string; likes: number; liked: boolean }
export type Video = { id: string; userId: string; caption: string; directionId: string; likes: number; liked: boolean; poster: string; src?: string; comments: Comment[] }
export type User = { id: string; name: string; username?: string; handle: string; avatarUrl?: string | null; initials: string; level: number; xp: number; xpNext: number; skills: Record<string, number>; bio: string; maxUrl?: string; githubUrl?: string | null }
export type Direction = { id: string; title: string; longTitle: string; color: string; tint: string; description: string; levels: string[]; currentLevel: number; started: boolean }
export type TaskProgress = { status: TaskStatus; repo?: string; score?: number; liked?: boolean }
export type AppState = {
  profile: User; users: User[]; directions: Direction[]; tasks: Task[]; taskProgress: Record<string, TaskProgress>;
  unlockedLevels: Record<string, number>; projects: Project[]; projectApplications: Record<string, string>; events: Event[];
  registeredEvents: string[]; videos: Video[]; settings: { theme: 'light' | 'system' | 'dark'; notifications: Record<string, boolean> }
}

const date = (days: number, hour = 21) => { const d = new Date(); d.setDate(d.getDate() + days); d.setHours(hour, 0, 0, 0); return d.toISOString() }
const user: User = { id: 'me', name: 'Александр Булатов', handle: '@alex.dev', initials: 'АБ', level: 7, xp: 742, xpNext: 1000, bio: 'Учусь создавать полезные IT-продукты', skills: { frontend: 3, backend: 5, android: 2, uiux: 1, qa: 2, datascience: 1 } }
type CurriculumTask = { id?: string; title: string; description: string; requirements: string[]; xp?: number; hours?: string }
type CurriculumLevel = { title: string; tasks: [CurriculumTask, CurriculumTask, CurriculumTask] }

const curricula: Record<string, CurriculumLevel[]> = {
  frontend: [
    { title: 'HTML и семантика', tasks: [
      { id: 'html-portfolio', title: 'Семантическое портфолио', description: 'Соберите одностраничное портфолио с правильной структурой документа и доступной навигацией.', requirements: ['Семантические теги HTML', 'Навигация по секциям', 'README со структурой страницы'], xp: 100, hours: '2–3 часа' },
      { title: 'Страница статьи', description: 'Сверстайте длинную техническую статью с оглавлением, цитатами и блоками кода.', requirements: ['Иерархия заголовков', 'Оглавление с якорями', 'Доступная разметка кода'] },
      { title: 'Каталог мероприятий', description: 'Создайте HTML-каталог мероприятий с карточками, фильтрами формы и подробной страницей события.', requirements: ['Форма с корректными label', 'Карточки через article', 'Валидная HTML-разметка'] },
    ]},
    { title: 'CSS и визуальный стиль', tasks: [
      { title: 'Набор адаптивных карточек', description: 'Оформите библиотеку карточек курса с состояниями наведения, фокуса и недоступности.', requirements: ['CSS custom properties', 'Состояния hover и focus-visible', 'Единая система отступов'] },
      { title: 'Промостраница продукта', description: 'Создайте выразительную промостраницу с типографической шкалой и несколькими цветовыми темами.', requirements: ['Типографическая шкала', 'Светлая и тёмная темы', 'Контраст по WCAG'] },
      { title: 'CSS-иллюстрация рабочего места', description: 'Нарисуйте интерактивную сцену только средствами HTML и CSS.', requirements: ['Без растровых изображений', 'Не менее пяти объектов', 'CSS-анимация с prefers-reduced-motion'] },
    ]},
    { title: 'Адаптивная вёрстка', tasks: [
      { id: 'landing-page', title: 'Адаптивный лендинг', description: 'Сверстайте лендинг, который сохраняет композицию на телефоне, планшете и десктопе.', requirements: ['Макеты 375, 768 и 1280 px', 'Мобильное меню', 'Без горизонтальной прокрутки'], xp: 120 },
      { id: 'portfolio-page', title: 'Адаптивное портфолио', description: 'Создайте портфолио с перестраиваемой сеткой проектов и отзывчивой галереей.', requirements: ['CSS Grid', 'Адаптивные изображения', 'Управление с клавиатуры'], xp: 180, hours: '4–6 часов' },
      { id: 'responsive-dashboard', title: 'Адаптивный dashboard', description: 'Соберите панель аналитики с таблицей, графиками и мобильным представлением.', requirements: ['Три контрольные ширины', 'Grid или Flexbox', 'Доступная таблица данных'], xp: 250, hours: '6–8 часов' },
    ]},
    { title: 'JavaScript и состояние', tasks: [
      { title: 'Калькулятор бюджета', description: 'Реализуйте калькулятор доходов и расходов с сохранением введённых операций.', requirements: ['Добавление и удаление операций', 'Расчёт итогов', 'Сохранение в localStorage'] },
      { id: 'javascript-widget', title: 'Виджет расписания', description: 'Создайте интерактивное расписание с выбором дня и раскрытием деталей занятия.', requirements: ['Обработка событий', 'Состояние без перезагрузки', 'Клавиатурная навигация'], xp: 200, hours: '4–5 часов' },
      { title: 'Поиск по каталогу', description: 'Реализуйте поиск, фильтрацию и сортировку набора карточек на чистом JavaScript.', requirements: ['Комбинирование фильтров', 'Debounce поиска', 'Пустое состояние'] },
    ]},
    { title: 'DOM и браузерные API', tasks: [
      { title: 'Drag-and-drop канбан', description: 'Создайте доску задач с переносом карточек между колонками.', requirements: ['HTML Drag and Drop API', 'Сохранение порядка', 'Альтернатива для клавиатуры'] },
      { title: 'Галерея с загрузкой файлов', description: 'Сделайте локальную галерею с предпросмотром выбранных изображений и валидацией.', requirements: ['File API', 'Проверка типа и размера', 'Удаление превью'] },
      { title: 'Офлайн-заметки', description: 'Разработайте заметки, которые продолжают работать без сети после первой загрузки.', requirements: ['Service Worker', 'Cache API', 'Индикатор сетевого состояния'] },
    ]},
    { title: 'React и компоненты', tasks: [
      { title: 'Библиотека React-компонентов', description: 'Создайте набор переиспользуемых кнопок, полей, модальных окон и уведомлений.', requirements: ['Типизированные props', 'Контролируемые состояния', 'Документация компонентов'] },
      { title: 'Каталог курсов на React', description: 'Соберите каталог с поиском, фильтрами и отдельной страницей курса.', requirements: ['Компонентная декомпозиция', 'Маршрутизация', 'Синхронизация фильтров с URL'] },
      { title: 'React dashboard', description: 'Создайте панель прогресса с асинхронной загрузкой и несколькими состояниями интерфейса.', requirements: ['Loading, error и empty states', 'Кеширование запроса', 'Оптимизация лишних рендеров'] },
    ]},
    { title: 'Production frontend', tasks: [
      { title: 'PWA-трекер привычек', description: 'Подготовьте устанавливаемое PWA с офлайн-режимом и синхронизацией данных.', requirements: ['Web App Manifest', 'Офлайн-сценарий', 'Аудит Lighthouse'] },
      { title: 'Доступный интернет-магазин', description: 'Соберите пользовательский путь от каталога до подтверждения тестового заказа.', requirements: ['WCAG 2.2 AA для ключевого пути', 'Корзина и форма заказа', 'Обработка ошибок'] },
      { title: 'Командный frontend-проект', description: 'Создайте полноценный frontend сервиса по открытому API и оформите процесс разработки команды.', requirements: ['Интеграция с API', 'CI с проверкой сборки', 'Архитектурное описание и демо'] },
    ]},
  ],
  backend: [
    { title: 'Основы серверной разработки', tasks: [
      { title: 'CLI-менеджер задач', description: 'Создайте консольное приложение для управления задачами и сохранения их в файл.', requirements: ['CRUD-команды', 'Валидация ввода', 'JSON-хранилище'] },
      { title: 'Анализатор логов', description: 'Напишите утилиту, которая читает серверные логи и строит сводку ошибок.', requirements: ['Потоковое чтение', 'Группировка по статусам', 'Отчёт в JSON'] },
      { title: 'TCP-чат', description: 'Реализуйте простой многопользовательский чат поверх TCP.', requirements: ['Несколько соединений', 'Корректное отключение клиента', 'Логирование событий'] },
    ]},
    { title: 'SQL и базы данных', tasks: [
      { title: 'Схема учебной платформы', description: 'Спроектируйте реляционную модель пользователей, курсов и прогресса.', requirements: ['Нормализованная схема', 'Ограничения целостности', 'Миграция создания таблиц'] },
      { title: 'Аналитика заказов SQL', description: 'Подготовьте набор запросов для анализа тестовой базы заказов.', requirements: ['JOIN и агрегаты', 'Оконная функция', 'Обоснование индексов'] },
      { title: 'Сервис миграций', description: 'Реализуйте применение и откат версионированных миграций базы данных.', requirements: ['Таблица версий', 'Up и down операции', 'Транзакционность'] },
    ]},
    { title: 'HTTP и REST', tasks: [
      { title: 'API заметок', description: 'Создайте REST API заметок с валидацией и единым форматом ошибок.', requirements: ['CRUD endpoints', 'Корректные HTTP-коды', 'OpenAPI-описание'] },
      { title: 'API каталога книг', description: 'Реализуйте каталог с пагинацией, поиском и сортировкой.', requirements: ['Cursor или offset pagination', 'Фильтрация параметрами', 'Интеграционные примеры'] },
      { title: 'Webhook-приёмник', description: 'Создайте надёжный приёмник внешних событий с проверкой подписи.', requirements: ['Проверка HMAC', 'Идемпотентность', 'Повторная обработка ошибок'] },
    ]},
    { title: 'Сервисная архитектура', tasks: [
      { title: 'Сервис сокращения ссылок', description: 'Реализуйте короткие ссылки со статистикой переходов и сроком действия.', requirements: ['Уникальная генерация ключей', 'Редирект и статистика', 'TTL ссылок'] },
      { title: 'Очередь фоновых задач', description: 'Создайте обработчик фоновых заданий с повторными попытками.', requirements: ['Очередь и worker', 'Backoff повторов', 'Dead-letter состояние'] },
      { title: 'Агрегатор внешних API', description: 'Объедините данные нескольких API в один устойчивый endpoint.', requirements: ['Тайм-ауты запросов', 'Частичный результат', 'Кеширование'] },
    ]},
    { title: 'Авторизация и безопасность', tasks: [
      { title: 'Сессии пользователей', description: 'Добавьте безопасную регистрацию, вход и завершение сессий.', requirements: ['Хеширование паролей', 'HttpOnly cookie', 'Защита от перебора'] },
      { id: 'go-api', title: 'REST API с ролями', description: 'Соберите API каталога задач с разграничением прав пользователя и администратора.', requirements: ['CRUD-маршруты', 'Role-based access', 'README и OpenAPI'], xp: 220, hours: '5–7 часов' },
      { title: 'Аудит безопасности API', description: 'Найдите и устраните типовые уязвимости в демонстрационном сервисе.', requirements: ['Threat model', 'Проверка входных данных', 'Отчёт с исправлениями'] },
    ]},
    { title: 'Надёжность и наблюдаемость', tasks: [
      { title: 'Структурированные логи', description: 'Внедрите correlation ID и структурированные события в существующий API.', requirements: ['JSON-логи', 'Correlation ID', 'Маскирование секретов'] },
      { title: 'Метрики сервиса', description: 'Добавьте метрики запросов, ошибок и задержек с dashboard.', requirements: ['RED-метрики', 'Health endpoints', 'Описание алертов'] },
      { title: 'Отказоустойчивый клиент', description: 'Разработайте клиент внешнего API с тайм-аутами, retry и circuit breaker.', requirements: ['Ограниченные повторы', 'Circuit breaker', 'Fallback-поведение'] },
    ]},
    { title: 'Production backend', tasks: [
      { title: 'Контейнеризация API', description: 'Подготовьте production Docker-образ и локальный compose-стенд.', requirements: ['Multi-stage build', 'Непривилегированный пользователь', 'Healthcheck'] },
      { title: 'Высоконагруженный счётчик', description: 'Спроектируйте сервис счётчиков с конкурентными обновлениями и нагрузочным сценарием.', requirements: ['Без потери обновлений', 'Нагрузочный тест', 'Описание пределов системы'] },
      { title: 'Командный backend-проект', description: 'Создайте законченный backend продукта с API, базой, очередью и наблюдаемостью.', requirements: ['Миграции и OpenAPI', 'CI и автоматические проверки', 'Архитектурная схема и демо'] },
    ]},
  ],
  android: [
    { title: 'Kotlin и основы Android', tasks: [
      { title: 'Консольный трекер расходов', description: 'Закрепите Kotlin на приложении с категориями расходов и итогами.', requirements: ['Data classes', 'Коллекции и функции', 'Обработка неверного ввода'] },
      { title: 'Генератор учебных карточек', description: 'Создайте модель карточек и алгоритм интервального повторения на Kotlin.', requirements: ['Sealed class состояния', 'Алгоритм следующего показа', 'Сохранение прогресса в файл'] },
      { title: 'Парсер расписания', description: 'Преобразуйте JSON-расписание в типизированную модель и сформируйте сводку.', requirements: ['Kotlin serialization', 'Обработка отсутствующих полей', 'Группировка по дням'] },
    ]},
    { title: 'Compose-интерфейсы', tasks: [
      { title: 'Экран профиля', description: 'Соберите адаптивный экран профиля на Jetpack Compose.', requirements: ['Material 3', 'Preview для состояний', 'Поддержка тёмной темы'] },
      { id: 'weather-app', title: 'Экран прогноза погоды', description: 'Создайте интерфейс прогноза с почасовой лентой и недельным списком.', requirements: ['Состояния загрузки и ошибки', 'Адаптивная компоновка', 'Доступные contentDescription'], xp: 150, hours: '3–5 часов' },
      { title: 'Каталог с деталями', description: 'Реализуйте список карточек и экран подробностей с общей анимацией перехода.', requirements: ['LazyColumn', 'Навигация Compose', 'Сохранение позиции списка'] },
    ]},
    { title: 'Состояние и навигация', tasks: [
      { title: 'Многошаговая анкета', description: 'Создайте анкету с несколькими экранами и восстановлением введённых данных.', requirements: ['Navigation Compose', 'ViewModel', 'Валидация каждого шага'] },
      { title: 'Трекер привычек', description: 'Реализуйте добавление привычек, отметку выполнения и дневную статистику.', requirements: ['StateFlow', 'Однонаправленный поток данных', 'Состояния пустого списка'] },
      { title: 'Deep link в карточку', description: 'Настройте открытие нужного экрана приложения по внешней ссылке.', requirements: ['Deep link route', 'Проверка параметров', 'Fallback при неверной ссылке'] },
    ]},
    { title: 'Сеть и локальные данные', tasks: [
      { title: 'Клиент новостей', description: 'Загрузите новости из API и покажите кеш при отсутствии сети.', requirements: ['HTTP-клиент', 'Room cache', 'Offline-first чтение'] },
      { title: 'Пагинация каталога', description: 'Реализуйте бесконечную ленту с серверной пагинацией и повтором ошибки.', requirements: ['Paging 3', 'RemoteMediator или эквивалент', 'Retry UI'] },
      { title: 'Синхронизация заметок', description: 'Синхронизируйте локальные изменения с тестовым сервером после восстановления сети.', requirements: ['WorkManager', 'Очередь локальных изменений', 'Разрешение конфликтов'] },
    ]},
    { title: 'Возможности устройства', tasks: [
      { title: 'Сканер документов', description: 'Создайте сценарий съёмки документа с предпросмотром и подтверждением.', requirements: ['CameraX', 'Разрешения во время выполнения', 'Безопасное хранение файла'] },
      { title: 'Карта полезных мест', description: 'Покажите точки на карте и расстояние до выбранного объекта.', requirements: ['Карта и маркеры', 'Разрешение геолокации', 'Состояние отказа в доступе'] },
      { title: 'Напоминания о занятиях', description: 'Добавьте локальные уведомления по расписанию пользователя.', requirements: ['AlarmManager или WorkManager', 'Notification channels', 'Изменение и отмена напоминания'] },
    ]},
    { title: 'Архитектура и качество', tasks: [
      { title: 'Модульная архитектура', description: 'Разделите учебное приложение на независимые feature и core-модули.', requirements: ['Ясные зависимости модулей', 'Dependency injection', 'Документ архитектуры'] },
      { title: 'Тестируемый экран поиска', description: 'Реализуйте поиск с debounce и покройте основную логику модульными тестами.', requirements: ['Разделение UI и логики', 'Детерминированные состояния', 'Проверка ошибок и пустого результата'] },
      { title: 'Оптимизация производительности', description: 'Найдите и устраните тормоза прокрутки и лишние recomposition.', requirements: ['Baseline profiling', 'Исправление минимум двух проблем', 'Отчёт до и после'] },
    ]},
    { title: 'Публикация Android-продукта', tasks: [
      { title: 'Доступность приложения', description: 'Проведите аудит TalkBack и исправьте ключевой пользовательский путь.', requirements: ['TalkBack-прохождение', 'Масштабирование шрифта', 'Контраст и touch targets'] },
      { title: 'Подготовка release-сборки', description: 'Настройте подписанную release-сборку и автоматическую проверку качества.', requirements: ['Build variants', 'R8 и правила', 'CI-сборка APK/AAB'] },
      { title: 'Командное Android-приложение', description: 'Создайте законченное приложение с сетью, офлайн-режимом и аналитикой ошибок.', requirements: ['Основной сценарий от начала до результата', 'Offline-first данные', 'Архитектура, CI и демонстрация'] },
    ]},
  ],
  uiux: [
    { title: 'Основы UX', tasks: [
      { title: 'Разбор пользовательского пути', description: 'Опишите текущий путь пользователя в выбранном цифровом сервисе и найдите барьеры.', requirements: ['Карта As Is', 'Не менее пяти наблюдений', 'Приоритетная точка улучшения'] },
      { id: 'design-system', title: 'Базовая дизайн-система', description: 'Соберите набор цветов, типографики и основных интерфейсных компонентов.', requirements: ['Цветовые токены', 'Типографическая шкала', 'Не менее восьми компонентов'], xp: 160, hours: '3–4 часа' },
      { title: 'Эвристический аудит', description: 'Проведите аудит интерфейса по эвристикам и предложите исправления.', requirements: ['Список проблем с приоритетами', 'Обоснование эвристик', 'Макеты трёх исправлений'] },
    ]},
    { title: 'Исследование пользователей', tasks: [
      { title: 'Гайд интервью', description: 'Подготовьте и апробируйте сценарий проблемного интервью.', requirements: ['Цель и гипотезы', 'Открытые вопросы', 'Выводы минимум из трёх интервью'] },
      { title: 'Карта сегментов', description: 'Разделите аудиторию продукта на сегменты по задачам и контексту.', requirements: ['Критерии сегментации', 'Jobs-to-be-done', 'Выбор приоритетного сегмента'] },
      { title: 'Проверка проблемы', description: 'Сопоставьте интервью, аналитику и конкурентные решения для одной проблемы.', requirements: ['Три типа свидетельств', 'Факты отдельно от гипотез', 'Решение о продолжении исследования'] },
    ]},
    { title: 'Информационная архитектура', tasks: [
      { title: 'Card sorting каталога', description: 'Проведите сортировку карточек и предложите структуру большого каталога.', requirements: ['Набор карточек', 'Результаты участников', 'Итоговая иерархия'] },
      { title: 'Навигация приложения', description: 'Спроектируйте навигационную модель для многораздельного мобильного приложения.', requirements: ['Карта экранов', 'Основные и обратные переходы', 'Проверка тупиков'] },
      { title: 'Поиск и фильтры', description: 'Спроектируйте сценарий поиска с фильтрами, подсказками и пустыми результатами.', requirements: ['Состояния поиска', 'Логика фильтров', 'Прототип ключевого сценария'] },
    ]},
    { title: 'Прототипирование', tasks: [
      { title: 'Кликабельный onboarding', description: 'Создайте прототип первого запуска, который приводит к первому полезному результату.', requirements: ['Не более пяти шагов', 'Пропуск необязательных этапов', 'Кликабельный прототип'] },
      { title: 'Сложная форма', description: 'Спроектируйте многошаговую форму с понятными ошибками и восстановлением данных.', requirements: ['Группировка полей', 'Inline-валидация', 'Состояния ошибки и успеха'] },
      { title: 'Сервисный сценарий', description: 'Прототипируйте полный путь записи на услугу и управления записью.', requirements: ['Выбор времени', 'Подтверждение', 'Перенос и отмена'] },
    ]},
    { title: 'UI и визуальная система', tasks: [
      { title: 'Тёмная тема продукта', description: 'Разработайте тёмную тему существующего интерфейса без потери иерархии.', requirements: ['Семантические цвета', 'Контраст WCAG', 'Состояния компонентов'] },
      { title: 'Responsive design system', description: 'Расширьте дизайн-систему правилами для телефона, планшета и десктопа.', requirements: ['Grid и breakpoints', 'Responsive-компоненты', 'Документация поведения'] },
      { title: 'Визуальный язык бренда', description: 'Создайте визуальную концепцию продукта и примените её к ключевым экранам.', requirements: ['Принципы стиля', 'Иллюстрации или графика', 'Не менее пяти согласованных экранов'] },
    ]},
    { title: 'Тестирование интерфейсов', tasks: [
      { title: 'Коридорный тест', description: 'Проведите короткий usability-тест прототипа и исправьте основные проблемы.', requirements: ['Сценарий и критерий успеха', 'Не менее пяти участников', 'Изменения до и после'] },
      { title: 'Аудит доступности макета', description: 'Проверьте дизайн на контраст, масштабирование, фокус и понятность элементов.', requirements: ['Чек-лист WCAG', 'Проблемы с приоритетами', 'Исправленные компоненты'] },
      { title: 'A/B-концепции', description: 'Разработайте две версии ключевого экрана и план проверки гипотезы.', requirements: ['Одна измеримая гипотеза', 'Две сопоставимые версии', 'Метрика и план эксперимента'] },
    ]},
    { title: 'Продуктовый дизайн', tasks: [
      { title: 'Редизайн по метрикам', description: 'Предложите редизайн сценария на основе заданной воронки и качественных данных.', requirements: ['Диагностика причины', 'Новая схема пути', 'Ожидаемое влияние на метрику'] },
      { title: 'Передача дизайна в разработку', description: 'Подготовьте макеты, спецификации и состояния для реализации командой.', requirements: ['Полный набор состояний', 'Токены и размеры', 'Чек-лист приёмки'] },
      { title: 'Командный продуктовый кейс', description: 'Пройдите путь от исследования проблемы до проверенного интерактивного прототипа.', requirements: ['Подтверждение проблемы', 'Прототип основного сценария', 'Тестирование и итерация'] },
    ]},
  ],
  qa: [
    { title: 'Основы тестирования', tasks: [
      { title: 'Чек-лист формы регистрации', description: 'Подготовьте проверки функциональности, удобства и ошибок формы регистрации.', requirements: ['Позитивные и негативные проверки', 'Граничные значения', 'Приоритеты проверок'] },
      { title: 'Исследовательское тестирование', description: 'Проведите тестовую сессию веб-приложения и оформите найденные дефекты.', requirements: ['Charter сессии', 'Не менее пяти находок', 'Итоговый отчёт'] },
      { title: 'Матрица рисков', description: 'Оцените риски релиза продукта и предложите глубину тестирования.', requirements: ['Вероятность и влияние', 'Приоритет областей', 'Стратегия снижения рисков'] },
    ]},
    { title: 'Тест-дизайн', tasks: [
      { title: 'Классы эквивалентности', description: 'Спроектируйте тесты для сложного поля ввода с несколькими правилами.', requirements: ['Классы валидных данных', 'Граничные значения', 'Минимальный набор тестов'] },
      { title: 'Таблица решений', description: 'Постройте таблицу решений для скидок с несколькими условиями.', requirements: ['Полный набор комбинаций', 'Исключение невозможных случаев', 'Тест-кейсы по правилам'] },
      { title: 'State transition testing', description: 'Протестируйте жизненный цикл заявки через модель переходов состояний.', requirements: ['Диаграмма состояний', 'Позитивные переходы', 'Запрещённые переходы'] },
    ]},
    { title: 'API-тестирование', tasks: [
      { title: 'Коллекция проверок REST API', description: 'Создайте воспроизводимую коллекцию запросов для CRUD API.', requirements: ['Проверка статусов и схем', 'Переменные окружения', 'Негативные сценарии'] },
      { title: 'Контрактное тестирование', description: 'Сверьте реализацию API с OpenAPI и найдите несовместимости.', requirements: ['Проверка обязательных полей', 'Форматы ошибок', 'Отчёт о расхождениях'] },
      { title: 'Проверка авторизации API', description: 'Исследуйте доступ к ресурсам для разных ролей и владельцев данных.', requirements: ['Матрица ролей', 'Проверки 401 и 403', 'Попытки доступа к чужим объектам'] },
    ]},
    { title: 'Web UI-автоматизация', tasks: [
      { title: 'Smoke-набор интерфейса', description: 'Автоматизируйте критический путь пользователя в браузере.', requirements: ['Стабильные локаторы', 'Независимые тестовые данные', 'Скриншот при ошибке'] },
      { title: 'Page Object-модель', description: 'Переработайте набор UI-тестов с выделением страниц и компонентов.', requirements: ['Page objects', 'Повторно используемые действия', 'Отсутствие дублирования селекторов'] },
      { title: 'Кроссбраузерная проверка', description: 'Настройте запуск ключевых UI-сценариев в нескольких браузерах.', requirements: ['Не менее трёх движков', 'Параллельный запуск', 'Единый HTML-отчёт'] },
    ]},
    { title: 'Нагрузочное тестирование', tasks: [
      { title: 'Нагрузочный профиль API', description: 'Смоделируйте типичную пользовательскую нагрузку и измерьте задержки.', requirements: ['Профиль запросов', 'p50, p95 и error rate', 'Вывод о пределе нагрузки'] },
      { title: 'Spike-тест', description: 'Проверьте поведение сервиса при резком росте трафика и восстановлении.', requirements: ['Сценарий скачка', 'Мониторинг ресурсов', 'Время восстановления'] },
      { title: 'Поиск узкого места', description: 'Сопоставьте результаты нагрузки с метриками приложения и базы.', requirements: ['Метрики всех слоёв', 'Подтверждённая гипотеза', 'Сравнение после исправления'] },
    ]},
    { title: 'CI и качество релиза', tasks: [
      { title: 'Pipeline автоматических проверок', description: 'Настройте запуск API и UI-проверок на каждый pull request.', requirements: ['Быстрый smoke gate', 'Артефакты отчёта', 'Понятный статус проверки'] },
      { title: 'Стратегия регрессии', description: 'Сформируйте набор регрессии и правила его обновления для продукта.', requirements: ['Связь тестов с рисками', 'Уровни smoke и full', 'Критерии включения теста'] },
      { title: 'Release checklist', description: 'Создайте процесс приёмки релиза с планом отката и проверкой после выкладки.', requirements: ['Entry и exit criteria', 'Rollback-проверки', 'Ответственные роли'] },
    ]},
    { title: 'QA-лидерство', tasks: [
      { title: 'Тестовая стратегия продукта', description: 'Подготовьте стратегию качества для продукта с web, mobile и API.', requirements: ['Риски и уровни тестирования', 'Окружения и данные', 'Метрики качества'] },
      { title: 'Разбор инцидента', description: 'Проведите root cause analysis модельного production-инцидента.', requirements: ['Хронология', 'Пять почему или fault tree', 'Корректирующие действия'] },
      { title: 'Командный QA-проект', description: 'Организуйте полный цикл качества тестового релиза и представьте результаты.', requirements: ['Стратегия и тест-дизайн', 'Автоматизация критического пути', 'Отчёт о качестве и решение по релизу'] },
    ]},
  ],
  datascience: [
    { title: 'Python для данных', tasks: [
      { title: 'Анализ расходов', description: 'Обработайте таблицу личных расходов и найдите основные категории затрат.', requirements: ['Чтение CSV', 'Очистка значений', 'Итоговая таблица и выводы'] },
      { title: 'Статистика текстов', description: 'Исследуйте корпус текстов и определите частотные слова и длины документов.', requirements: ['Нормализация текста', 'Частотный анализ', 'Визуализация распределения'] },
      { title: 'Симуляция эксперимента', description: 'Смоделируйте случайный эксперимент и сравните результат с теорией.', requirements: ['Воспроизводимый random seed', 'Не менее 10 000 итераций', 'Интерпретация отклонения'] },
    ]},
    { title: 'Подготовка данных', tasks: [
      { title: 'Очистка каталога', description: 'Очистите набор товаров от дублей, пропусков и некорректных значений.', requirements: ['Профиль качества данных', 'Обоснованные правила очистки', 'Отчёт до и после'] },
      { title: 'Объединение источников', description: 'Соедините несколько таблиц с разными ключами в единый аналитический датасет.', requirements: ['Проверка кардинальности JOIN', 'Обработка несовпадений', 'Контроль итогового числа строк'] },
      { title: 'Pipeline признаков', description: 'Создайте воспроизводимую подготовку числовых и категориальных признаков.', requirements: ['Защита от leakage', 'Кодирование категорий', 'Сохранённый pipeline'] },
    ]},
    { title: 'Визуализация и EDA', tasks: [
      { title: 'История продаж в графиках', description: 'Проведите разведочный анализ продаж и сформулируйте наблюдения для бизнеса.', requirements: ['Не менее четырёх типов графиков', 'Подписи и единицы измерения', 'Три обоснованных вывода'] },
      { title: 'Интерактивный dashboard', description: 'Соберите интерактивную панель по открытому набору данных.', requirements: ['Фильтры', 'Связанные визуализации', 'Описание источника и ограничений'] },
      { title: 'Аудит вводящей в заблуждение визуализации', description: 'Найдите проблемы в графиках и создайте корректные версии.', requirements: ['Не менее пяти проблем', 'Исправленные графики', 'Объяснение влияния ошибок'] },
    ]},
    { title: 'Классическое машинное обучение', tasks: [
      { title: 'Прогноз оттока', description: 'Обучите модель классификации оттока и объясните выбранную метрику.', requirements: ['Train/validation split', 'Baseline и улучшенная модель', 'Матрица ошибок'] },
      { title: 'Оценка стоимости', description: 'Постройте регрессионную модель и проанализируйте её ошибки.', requirements: ['Baseline', 'Кросс-валидация', 'Анализ остатков'] },
      { title: 'Сегментация пользователей', description: 'Выделите группы пользователей без учителя и опишите каждый сегмент.', requirements: ['Подготовка признаков', 'Выбор числа кластеров', 'Интерпретация сегментов'] },
    ]},
    { title: 'Оценка и улучшение моделей', tasks: [
      { title: 'Сравнение классификаторов', description: 'Сравните несколько алгоритмов на одинаковом разбиении данных.', requirements: ['Единый pipeline', 'Несколько метрик', 'Статистически осторожный вывод'] },
      { title: 'Подбор гиперпараметров', description: 'Настройте модель без утечки информации из тестовой выборки.', requirements: ['Cross-validation', 'Поиск параметров', 'Отдельная финальная оценка'] },
      { title: 'Интерпретация модели', description: 'Объясните глобальные и локальные предсказания модели заинтересованной стороне.', requirements: ['Feature importance или SHAP', 'Примеры локальных объяснений', 'Ограничения интерпретации'] },
    ]},
    { title: 'Прикладные модели', tasks: [
      { title: 'Классификация отзывов', description: 'Постройте модель тональности пользовательских отзывов.', requirements: ['Текстовый baseline', 'Обработка дисбаланса', 'Анализ ошибочных примеров'] },
      { title: 'Рекомендации контента', description: 'Создайте прототип рекомендательной системы для учебных материалов.', requirements: ['Baseline популярности', 'Персональная модель', 'Offline-метрика рекомендаций'] },
      { title: 'Прогноз временного ряда', description: 'Спрогнозируйте показатель на будущий период с учётом сезонности.', requirements: ['Временное разбиение', 'Наивный baseline', 'График прогноза с ошибкой'] },
    ]},
    { title: 'Production Data Science', tasks: [
      { title: 'API для модели', description: 'Оберните обученную модель в HTTP API с валидацией данных.', requirements: ['Endpoint предсказания', 'Версия модели', 'Логирование без чувствительных данных'] },
      { title: 'Мониторинг качества модели', description: 'Спроектируйте контроль drift данных и деградации метрики.', requirements: ['Набор мониторинговых показателей', 'Пороговые значения', 'План переобучения'] },
      { title: 'Командный ML-продукт', description: 'Создайте воспроизводимый путь от данных до работающей модели и демонстрации.', requirements: ['Версионирование данных и модели', 'Воспроизводимое обучение', 'API, мониторинг и model card'] },
    ]},
  ],
}

const directionMeta: Record<string, Omit<Direction, 'levels'>> = {
  frontend: { id: 'frontend', title: 'Frontend', longTitle: 'Frontend-разработка', color: '#236bff', tint: '#e8efff', description: 'Создавайте интерфейсы, которыми люди пользуются каждый день. Начните с HTML и CSS, научитесь делать адаптивные страницы, а затем соберите интерактивные продукты на JavaScript и React.', currentLevel: 3, started: true },
  backend: { id: 'backend', title: 'Backend', longTitle: 'Backend-разработка', color: '#806aff', tint: '#f0edff', description: 'Разберитесь, как устроена невидимая часть приложений. Спроектируйте API, сохраните данные в базе и соберите сервис, который надёжно отвечает на запросы пользователей.', currentLevel: 5, started: true },
  android: { id: 'android', title: 'Android', longTitle: 'Android-разработка', color: '#17b890', tint: '#e5f9f1', description: 'Создавайте приложения для смартфонов на Kotlin. Пройдите путь от первого экрана и навигации до получения данных из сети и готового мобильного проекта.', currentLevel: 2, started: true },
  uiux: { id: 'uiux', title: 'UI/UX', longTitle: 'UI/UX-дизайн', color: '#ff705e', tint: '#ffebe7', description: 'Научитесь понимать задачи пользователей и превращать идеи в удобные интерфейсы. Исследуйте сценарии, собирайте прототипы и создавайте собственную дизайн-систему.', currentLevel: 1, started: false },
  qa: { id: 'qa', title: 'QA', longTitle: 'Тестирование', color: '#e8a600', tint: '#fff6df', description: 'Помогайте команде выпускать надёжные продукты. Освойте тест-кейсы, научитесь находить ошибки, проверять API и автоматизировать повторяющиеся проверки.', currentLevel: 2, started: false },
  datascience: { id: 'datascience', title: 'Data Science', longTitle: 'Data Science', color: '#a35ce4', tint: '#f6efff', description: 'Ищите закономерности в данных и превращайте их в понятные выводы. Начните с Python, освоите визуализацию и попробуете обучить первую модель.', currentLevel: 1, started: false },
}

export const seedDirections: Direction[] = Object.entries(curricula).map(([id, levels]) => ({ ...directionMeta[id], levels: levels.map(level => level.title) }))

const difficulty: Task['difficulty'][] = ['Легко', 'Средне', 'Сложно']
export const seedTasks: Task[] = Object.entries(curricula).flatMap(([directionId, levels]) => levels.flatMap((level, levelIndex) => level.tasks.map((spec, taskIndex) => ({
  id: spec.id ?? `${directionId}-${levelIndex + 1}-${taskIndex + 1}`,
  title: spec.title,
  directionId,
  level: levelIndex + 1,
  difficulty: difficulty[taskIndex],
  xp: spec.xp ?? 120 + levelIndex * 25 + taskIndex * 55,
  hours: spec.hours ?? `${2 + Math.floor(levelIndex / 2) + taskIndex}–${4 + levelIndex + taskIndex * 2} часов`,
  deadline: date(7 + levelIndex * 2),
  description: spec.description,
  requirements: [...spec.requirements, 'Публичный GitHub-репозиторий', 'README с инструкцией запуска'],
  criteria: ['Работоспособность решения', 'Выполнение требований задания', 'Структура и качество реализации'],
}))))

const users: User[] = [
  user,
  { id: 'anna', name: 'Анна Крылова', handle: '@anna.dev', initials: 'АК', level: 8, xp: 860, xpNext: 1000, bio: 'Backend, Go и проекты для начинающих', maxUrl: 'https://max.ru/anna.dev', skills: { frontend: 2, backend: 6, android: 1, uiux: 1, qa: 3, datascience: 2 } },
  { id: 'max', name: 'Максим Орлов', handle: '@max.frontend', initials: 'МО', level: 6, xp: 510, xpNext: 1000, bio: 'Собираю интерфейсы на React', skills: { frontend: 6, backend: 2, android: 1, uiux: 3, qa: 1, datascience: 1 } },
  { id: 'kate', name: 'Екатерина Миронова', handle: '@kate.design', initials: 'ЕМ', level: 7, xp: 630, xpNext: 1000, bio: 'Дизайнер цифровых продуктов', skills: { frontend: 2, backend: 1, android: 1, uiux: 7, qa: 2, datascience: 1 } },
]

export function createInitialState(): AppState {
  return {
    profile: structuredClone(user), users: structuredClone(users), directions: structuredClone(seedDirections), tasks: structuredClone(seedTasks),
    taskProgress: { 'go-api': { status: 'active' }, 'weather-app': { status: 'active' }, 'html-portfolio': { status: 'completed', score: 94 }, 'design-system': { status: 'new' } },
    unlockedLevels: { frontend: 3, backend: 5, android: 2, uiux: 1, qa: 2, datascience: 1 },
    projects: [
      { id: 'campushub', title: 'CampusHub', description: 'Сервис для поиска студенческих мероприятий и команд.', goal: 'Помочь студентам найти команду и события рядом', duration: '2 месяца', format: 'remote', maxMembers: 6, roles: [{ name: 'Backend', minLevel: 5, requirement: 'Go, REST API' }, { name: 'Android', minLevel: 4, requirement: 'Kotlin' }, { name: 'UI/UX', minLevel: 3, requirement: 'Figma' }], tags: ['Kotlin', 'Go', 'PostgreSQL', 'Figma'], members: 3, ownerId: 'anna', memberIds: ['anna', 'max', 'kate'], liked: true },
      { id: 'codemate', title: 'CodeMate', description: 'AI-помощник для разбора учебных задач.', goal: 'Сделать практику доступнее', duration: '3 месяца', format: 'remote', maxMembers: 5, roles: [{ name: 'Frontend', minLevel: 4, requirement: 'React' }, { name: 'Backend', minLevel: 6, requirement: 'API' }, { name: 'Data Science', minLevel: 5, requirement: 'Python' }], tags: ['React', 'AI', 'Python'], members: 2, ownerId: 'max', memberIds: ['max', 'anna'], liked: false },
      { id: 'ecotrack', title: 'EcoTrack', description: 'Приложение для отслеживания экологических привычек.', goal: 'Помочь выработать полезные привычки', duration: '6 недель', format: 'remote', maxMembers: 4, roles: [{ name: 'Android', minLevel: 3, requirement: 'Kotlin' }, { name: 'Backend', minLevel: 4, requirement: 'REST' }], tags: ['Android', 'Экология'], members: 2, ownerId: 'kate', memberIds: ['kate', 'max'], liked: false },
    ], projectApplications: {},
    events: [
      { id: 'max-hackathon', title: 'MAX IT Hackathon', date: date(7, 10), time: '10:00–20:00', location: 'Казань', format: 'offline', kind: 'Хакатон', description: 'Хакатон по созданию мини приложений и образовательных продуктов.', tags: ['Frontend', 'Backend', 'UI/UX'], liked: true },
      { id: 'go-meetup', title: 'Go Meetup', date: date(10, 19), time: '19:00', location: 'Онлайн', format: 'online', kind: 'Митап', description: 'Доклады о Go backend и высоконагруженных системах.', tags: ['Backend', 'Go'], liked: false },
      { id: 'android-night', title: 'Android Dev Night', date: date(14, 18), time: '18:30', location: 'Москва', format: 'offline', kind: 'Митап', description: 'Встреча Android-разработчиков.', tags: ['Android', 'Kotlin'], liked: false },
    ], registeredEvents: [],
    videos: [
      { id: 'video-1', userId: 'anna', caption: 'Сделала свой первый REST API на Go 🚀', directionId: 'backend', likes: 128, liked: false, poster: 'linear-gradient(140deg,#142d6e,#417ee2 52%,#c5d7ff)', comments: [{ id: 'comment-1', userId: 'max', text: 'Очень круто. А какой router использовала?', date: date(-1), likes: 8, liked: false }, { id: 'comment-2', userId: 'anna', text: 'chi, понравился своей простотой', date: date(-1), parentId: 'comment-1', likes: 4, liked: false }] },
      { id: 'video-2', userId: 'max', caption: 'Моя первая анимация на React', directionId: 'frontend', likes: 246, liked: true, poster: 'linear-gradient(155deg,#0f1638,#724de3 58%,#eb9cdb)', comments: [] },
      { id: 'video-3', userId: 'kate', caption: 'Редизайн приложения за 2 часа', directionId: 'uiux', likes: 312, liked: false, poster: 'linear-gradient(155deg,#37184e,#d6709f 55%,#ffb98a)', comments: [] },
    ],
    settings: { theme: 'light', notifications: { deadlines: true, comments: true, projects: false, events: false } },
  }
}

export type Action =
  | { type: 'acceptTask'; taskId: string } | { type: 'abandonTask'; taskId: string } | { type: 'saveRepo'; taskId: string; repo: string } | { type: 'completeTask'; taskId: string; score: number } | { type: 'revisionTask'; taskId: string }
  | { type: 'toggleTaskLike'; taskId: string } | { type: 'toggleProjectLike'; projectId: string } | { type: 'applyProject'; projectId: string; role: string }
  | { type: 'createProject'; project: Pick<Project, 'id' | 'title' | 'description' | 'goal' | 'duration' | 'format' | 'maxMembers' | 'roles' | 'tags'> }
  | { type: 'toggleEventLike'; eventId: string } | { type: 'registerEvent'; eventId: string } | { type: 'toggleVideoLike'; videoId: string }
  | { type: 'addComment'; videoId: string; text: string; parentId?: string } | { type: 'toggleCommentLike'; videoId: string; commentId: string }
  | { type: 'publishVideo'; video: Pick<Video, 'id' | 'caption' | 'directionId' | 'poster' | 'src'> }
  | { type: 'theme'; theme: AppState['settings']['theme'] } | { type: 'notification'; key: string }

export function reduceApp(state: AppState, action: Action): AppState {
  const next = structuredClone(state)
  switch (action.type) {
    case 'acceptTask': next.taskProgress[action.taskId] = { status: 'active' }; break
    case 'abandonTask': next.taskProgress[action.taskId] = { status: 'abandoned' }; break
    case 'saveRepo': next.taskProgress[action.taskId] = { ...(next.taskProgress[action.taskId] ?? { status: 'active' }), repo: action.repo }; break
    case 'revisionTask': next.taskProgress[action.taskId] = { ...(next.taskProgress[action.taskId] ?? { status: 'active' }), status: 'revision' }; break
    case 'completeTask': {
      if (next.taskProgress[action.taskId]?.status === 'completed') break
      const task = next.tasks.find(t => t.id === action.taskId)
      if (!task) break
      next.taskProgress[action.taskId] = { ...(next.taskProgress[action.taskId] ?? {}), status: 'completed', score: action.score }
      next.profile.xp += task.xp
      while (next.profile.xp >= next.profile.xpNext) { next.profile.xp -= next.profile.xpNext; next.profile.level += 1 }
      const lastLevel = next.directions.find(direction => direction.id === task.directionId)?.levels.length ?? task.level
      next.unlockedLevels[task.directionId] = Math.max(next.unlockedLevels[task.directionId] ?? 1, Math.min(task.level + 1, lastLevel))
      next.profile.skills[task.directionId] = Math.max(next.profile.skills[task.directionId] ?? 1, Math.min(task.level + 1, lastLevel))
      break
    }
    case 'toggleTaskLike': { const progress = next.taskProgress[action.taskId] ?? { status: 'new' }; next.taskProgress[action.taskId] = { ...progress, liked: !progress.liked }; break }
    case 'toggleProjectLike': { const project = next.projects.find(p => p.id === action.projectId); if (project) project.liked = !project.liked; break }
    case 'applyProject': next.projectApplications[action.projectId] = action.role; break
    case 'createProject': next.projects.unshift({ ...action.project, members: 1, ownerId: 'me', memberIds: ['me'], liked: false }); break
    case 'toggleEventLike': { const event = next.events.find(e => e.id === action.eventId); if (event) event.liked = !event.liked; break }
    case 'registerEvent': if (!next.registeredEvents.includes(action.eventId)) next.registeredEvents.push(action.eventId); break
    case 'toggleVideoLike': { const video = next.videos.find(v => v.id === action.videoId); if (video) { video.liked = !video.liked; video.likes += video.liked ? 1 : -1 } break }
    case 'addComment': { const video = next.videos.find(v => v.id === action.videoId); if (video && action.text.trim()) video.comments.push({ id: crypto.randomUUID(), userId: 'me', text: action.text.trim(), date: new Date().toISOString(), parentId: action.parentId, likes: 0, liked: false }); break }
    case 'toggleCommentLike': { const comment = next.videos.find(v => v.id === action.videoId)?.comments.find(c => c.id === action.commentId); if (comment) { comment.liked = !comment.liked; comment.likes += comment.liked ? 1 : -1 } break }
    case 'publishVideo': next.videos.unshift({ ...action.video, userId: 'me', likes: 0, liked: false, comments: [] }); break
    case 'theme': next.settings.theme = action.theme; break
    case 'notification': next.settings.notifications[action.key] = !next.settings.notifications[action.key]; break
  }
  return next
}
