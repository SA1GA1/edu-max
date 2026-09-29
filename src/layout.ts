const wrapOffset = (index: number, selected: number, count: number) => {
  return ((index - selected + count / 2) % count + count) % count - count / 2
}

export function wheelPlacement(index: number, position: number, count: number): { x: number; y: number; scale: number; opacity: number; animate: boolean }
export function wheelPlacement(index: number, position: number, previous: number, count: number): { x: number; y: number; scale: number; opacity: number; animate: boolean }
export function wheelPlacement(index: number, position: number, previousOrCount: number, legacyCount?: number) {
  const count = legacyCount ?? previousOrCount
  const offset = wrapOffset(index, position, count)
  const angle = offset * 0.42
  const previousOffset = legacyCount === undefined ? offset : wrapOffset(index, previousOrCount, count)
  return {
    x: Math.sin(angle) * 185,
    y: 24 + (1 - Math.cos(angle)) * 95,
    scale: Math.max(.78, 1 - Math.abs(offset) * .09),
    opacity: Math.abs(offset) > 2.5 ? 0 : 1,
    animate: Math.abs(offset - previousOffset) <= 1 && Math.abs(offset) <= 2 && Math.abs(previousOffset) <= 2,
  }
}

const positions = [92, 268, 92, 268, 92, 268]
const rowHeight = 118

export function roadmapGeometry(count: number, _expandedIndex: number | null) {
  const nodes = Array.from({ length: count }, (_, index) => ({
    x: positions[index % positions.length],
    y: 44 + index * rowHeight,
  }))
  const segments = nodes.slice(0, -1).map((from, index) => {
    const to = nodes[index + 1]
    const span = to.y - from.y
    return {
      path: `M ${from.x} ${from.y} C ${from.x} ${from.y + span * .64}, ${to.x} ${to.y - span * .64}, ${to.x} ${to.y}`,
    }
  })
  return { nodes, segments, height: count * rowHeight }
}
