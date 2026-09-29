import { describe, expect, it } from 'vitest'
import { roadmapGeometry, wheelPlacement } from './layout'

describe('расположение направлений', () => {
  it('не анимирует скрытую иконку через весь барабан при переходе с последнего направления на первое', () => {
    expect(wheelPlacement(2, 0, 5, 6).animate).toBe(false)
    expect(wheelPlacement(0, 0, 5, 6).animate).toBe(true)
    expect(wheelPlacement(1, 0, 5, 6).x).toBeGreaterThan(0)
  })
})

describe('дорога roadmap', () => {
  it('извивается через центры узлов и не меняет их положение при раскрытии уровня', () => {
    const normal = roadmapGeometry(4, null)
    const expanded = roadmapGeometry(4, 2)
    expect(normal.nodes.map(node => node.x)).toEqual([92, 268, 92, 268])
    expect(expanded.nodes).toEqual(normal.nodes)
    expect(expanded.height).toBe(normal.height)
    expect(expanded.segments).toHaveLength(3)
    expect(expanded.segments[0].path).toContain('C')
  })
})
