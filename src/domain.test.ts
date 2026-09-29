import { describe, expect, it } from 'vitest'
import { createInitialState, reduceApp } from './domain'

describe('учебный сценарий', () => {
  it('принимает задание и начисляет XP только один раз после результата', () => {
    const initial = createInitialState()
    const accepted = reduceApp(initial, { type: 'acceptTask', taskId: 'responsive-dashboard' })
    expect(accepted.taskProgress['responsive-dashboard'].status).toBe('active')
    const completed = reduceApp(accepted, { type: 'completeTask', taskId: 'responsive-dashboard', score: 87 })
    expect(completed.taskProgress['responsive-dashboard'].status).toBe('completed')
    expect(completed.profile.xp).toBe(initial.profile.xp + 250)
    expect(completed.unlockedLevels.frontend).toBe(4)
    expect(reduceApp(completed, { type: 'completeTask', taskId: 'responsive-dashboard', score: 87 }).profile.xp).toBe(completed.profile.xp)
  })

  it('сохраняет заявку в проект и созданный проект в общем списке', () => {
    const initial = createInitialState()
    const applied = reduceApp(initial, { type: 'applyProject', projectId: 'campushub', role: 'Backend' })
    expect(applied.projectApplications.campushub).toBe('Backend')
    const created = reduceApp(applied, { type: 'createProject', project: { id: 'my-project', title: 'Мой проект', description: 'Идея', goal: 'MVP', duration: '2 месяца', format: 'remote', maxMembers: 4, roles: [{ name: 'Frontend', minLevel: 2, requirement: '' }], tags: ['React'] } })
    expect(created.projects[0].id).toBe('my-project')
    expect(created.projects[0].ownerId).toBe('me')
  })
})
