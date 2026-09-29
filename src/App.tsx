import { useEffect, useMemo, useState, type CSSProperties } from 'react'
import { BookOpen, BriefcaseBusiness, Check, ChevronRight, CircleUserRound, Clapperboard, Compass, Heart, Plus, Settings, Users } from 'lucide-react'
import { createInitialState, reduceApp, seedTasks, type AppState, type Direction, type Task } from './domain'
import { maxBridge } from './max'

type Page = 'home' | 'roadmap' | 'tasks' | 'projects' | 'videos' | 'profile' | 'settings'
const icons = { frontend: '◫', backend: '⌘', android: '◉', uiux: '✦', qa: '✓', datascience: '⌁' } as Record<string, string>

function Avatar({ state, large = false }: { state: AppState; large?: boolean }) {
  const profile = state.profile
  return <div className={`avatar ${large ? 'avatar-large' : ''}`} aria-label={profile.name}>{profile.avatarUrl ? <img src={profile.avatarUrl} alt="" /> : profile.initials}<span>{profile.level}</span></div>
}

function DirectionCard({ direction, active, onSelect }: { direction: Direction; active: boolean; onSelect: () => void }) {
  return <button className={`direction-card ${active ? 'active' : ''}`} style={{ '--accent': direction.color, '--tint': direction.tint } as CSSProperties} onClick={onSelect}>
    <span className="direction-icon">{icons[direction.id]}</span><strong>{direction.title}</strong><small>Уровень {direction.currentLevel} из 7</small>
  </button>
}

function Home({ state, direction, choose }: { state: AppState; direction: Direction; choose: (id: string) => void }) {
  const index = state.directions.findIndex(item => item.id === direction.id)
  return <section className="screen home"><header className="topbar"><b>EDU</b><Avatar state={state} /></header><div className="hero"><p>Твой путь в IT</p><h1>Учись через практику и собирай портфолио</h1></div><div className="wheel" aria-label="Направления обучения">{state.directions.map(item => <DirectionCard key={item.id} direction={item} active={item.id === direction.id} onSelect={() => choose(item.id)} />)}</div><div className="dots">{state.directions.map((item, itemIndex) => <i key={item.id} className={itemIndex === index ? 'on' : ''} />)}</div><article className="direction-summary" style={{ borderColor: direction.color }}><div><span className="eyebrow">НАПРАВЛЕНИЕ</span><h2>{direction.longTitle}</h2><p>{direction.description}</p></div><span className="summary-level">{direction.currentLevel}<small>уровень</small></span></article></section>
}

function Roadmap({ state, direction, openTask }: { state: AppState; direction: Direction; openTask: (task: Task) => void }) {
  const [expanded, setExpanded] = useState<number | null>(null)
  const tasksByLevel = useMemo(() => direction.levels.map((_, index) => seedTasks.filter(task => task.directionId === direction.id && task.level === index + 1)), [direction])
  return <section className="screen roadmap"><header className="page-heading"><span>Путь обучения</span><h1>{direction.title}</h1></header><div className="road">{tasksByLevel.map((tasks, index) => { const isOpen = expanded === index; const unlocked = index + 1 <= (state.unlockedLevels[direction.id] ?? 1); return <div className={`road-level ${isOpen ? 'expanded' : ''} ${unlocked ? '' : 'locked'}`} key={index}><div className="road-line" /><button className="level-node" style={{ '--accent': direction.color } as CSSProperties} onClick={() => unlocked && setExpanded(isOpen ? null : index)}><b>{index + 1}</b>{state.taskProgress[tasks[0]?.id]?.status === 'completed' && <Check />}</button>{isOpen && <div className="task-choice">{tasks.map((task, taskIndex) => <button key={task.id} className={taskIndex === 1 ? 'selected' : ''} onClick={() => openTask(task)}><small>{task.difficulty} · {task.xp} XP</small><strong>{task.title}</strong><ChevronRight /></button>)}</div>}<p>{direction.levels[index]}</p></div> })}</div></section>
}

function TaskPage({ state, task, close }: { state: AppState; task: Task; close: () => void }) {
  const progress = state.taskProgress[task.id]
  return <section className="screen"><button className="text-button" onClick={close}>‹ К пути</button><span className="eyebrow">УРОВЕНЬ {task.level} · {task.difficulty}</span><h1>{task.title}</h1><p className="lead">{task.description}</p><div className="stat-row"><b>{task.xp} XP</b><span>{task.hours}</span><span>до {new Date(task.deadline).toLocaleDateString('ru-RU')}</span></div><article className="card"><h2>Что сделать</h2><ul>{task.requirements.map(item => <li key={item}>{item}</li>)}</ul></article><article className="card"><h2>Как проверим</h2><p>Прикрепи публичную ссылку на GitHub. В будущем решение проверит автоматический ревьюер.</p></article><button className="primary" onClick={close}>{progress?.status === 'active' ? 'Продолжить задание' : 'Взять задание'}</button></section>
}

function Projects({ state }: { state: AppState }) { return <section className="screen"><header className="page-heading"><span>Команда и практика</span><h1>Проекты</h1></header><button className="create"><Plus /> Создать проект</button>{state.projects.map(project => <article className="project-card" key={project.id}><button className="like"><Heart fill={project.liked ? 'currentColor' : 'none'} /></button><h2>{project.title}</h2><p>{project.description}</p><div className="tags">{project.tags.map(tag => <span key={tag}>{tag}</span>)}</div><footer><span><Users /> {project.members}/{project.maxMembers}</span><span>{project.duration}</span></footer></article>)}</section> }

function Videos({ state }: { state: AppState }) { const [current, setCurrent] = useState(0); const video = state.videos[current]; return <section className="video-screen" onWheel={event => { if (event.deltaY > 0) setCurrent(value => Math.min(state.videos.length - 1, value + 1)); if (event.deltaY < 0) setCurrent(value => Math.max(0, value - 1)) }}><div className="video-art" style={{ background: video.poster }}><span className="video-number">{current + 1} / {state.videos.length}</span><div className="video-copy"><b>{state.users.find(user => user.id === video.userId)?.name}</b><p>{video.caption}</p></div><aside><button><Heart /> {video.likes}</button><button>◌</button><button>↗</button></aside></div></section> }

function Profile({ state, openSettings }: { state: AppState; openSettings: () => void }) { const profile = state.profile; return <section className="screen profile"><button className="settings-button" onClick={openSettings}><Settings /></button><Avatar state={state} large /><h1>{profile.name}</h1><p>{profile.handle}</p><p className="bio">{profile.bio}</p><div className="xp"><span style={{ width: `${profile.xp / profile.xpNext * 100}%` }} /><b>{profile.xp} / {profile.xpNext} XP</b></div><article className="card"><h2>Навыки</h2><div className="skills">{Object.entries(profile.skills).map(([name, level]) => <div key={name}><span>{name}</span><b style={{ width: `${level / 7 * 100}%` }} /></div>)}</div></article><article className="card"><h2>Завершённые задания</h2>{Object.entries(state.taskProgress).filter(([, progress]) => progress.status === 'completed').map(([id]) => <p key={id}>{state.tasks.find(task => task.id === id)?.title}</p>)}</article></section> }

function SettingsPage({ state, setTheme }: { state: AppState; setTheme: (theme: AppState['settings']['theme']) => void }) { return <section className="screen"><header className="page-heading"><span>Внешний вид</span><h1>Настройки</h1></header><article className="card"><h2>Тема</h2>{(['system', 'light', 'dark'] as const).map(theme => <button className={`setting-option ${state.settings.theme === theme ? 'chosen' : ''}`} onClick={() => setTheme(theme)} key={theme}>{theme === 'system' ? 'Как на устройстве' : theme === 'light' ? 'Светлая' : 'Тёмная'}<Check /></button>)}</article><article className="card"><h2>Уведомления</h2><p>Напоминания о сроках и ответы на комментарии.</p></article></section> }

export default function App() {
  const [state, setState] = useState(createInitialState)
  const [page, setPage] = useState<Page>('home')
  const [directionId, setDirectionId] = useState('frontend')
  const [task, setTask] = useState<Task | null>(null)
  const direction = state.directions.find(item => item.id === directionId) ?? state.directions[0]
  useEffect(() => { document.documentElement.dataset.theme = state.settings.theme }, [state.settings.theme])
  useEffect(() => maxBridge.backButton(page !== 'home', () => { setTask(null); setPage('home') }), [page])
  const navigate = (next: Page) => { setTask(null); setPage(next) }
  const content = task ? <TaskPage state={state} task={task} close={() => { setTask(null); setPage('roadmap') }} /> : page === 'home' ? <Home state={state} direction={direction} choose={setDirectionId} /> : page === 'roadmap' ? <Roadmap state={state} direction={direction} openTask={item => setTask(item)} /> : page === 'projects' ? <Projects state={state} /> : page === 'videos' ? <Videos state={state} /> : page === 'profile' ? <Profile state={state} openSettings={() => navigate('settings')} /> : page === 'settings' ? <SettingsPage state={state} setTheme={theme => setState(value => reduceApp(value, { type: 'theme', theme }))} /> : <Roadmap state={state} direction={direction} openTask={item => setTask(item)} />
  return <main className="app-shell">{content}{!task && <nav className="bottom-nav"><button className={page === 'home' ? 'active' : ''} onClick={() => navigate('home')}><Compass />Главная</button><button className={page === 'roadmap' || page === 'tasks' ? 'active' : ''} onClick={() => navigate('roadmap')}><BookOpen />Путь</button><button className={page === 'projects' ? 'active' : ''} onClick={() => navigate('projects')}><BriefcaseBusiness />Проекты</button><button className={page === 'videos' ? 'active' : ''} onClick={() => navigate('videos')}><Clapperboard />Видео</button><button className={page === 'profile' ? 'active' : ''} onClick={() => navigate('profile')}><CircleUserRound />Профиль</button></nav>}</main>
}
