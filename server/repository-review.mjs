const repositoryPattern = /^https:\/\/github\.com\/([A-Za-z0-9_.-]+)\/([A-Za-z0-9_.-]+)\/?$/

export async function reviewRepository(repositoryUrl, fetchImpl = fetch, githubToken = process.env.GITHUB_TOKEN) {
  const match = repositoryUrl.match(repositoryPattern)
  const breakdown = [
    { name: 'Доступность', score: 0, maxScore: 25 },
    { name: 'Структура', score: 0, maxScore: 30 },
    { name: 'README', score: 0, maxScore: 25 },
    { name: 'Содержимое', score: 0, maxScore: 20 },
  ]
  let feedback = 'Репозиторий не удалось проверить. Убедитесь, что он публичный.'

  if (!match) return { score: 0, breakdown, feedback }

  try {
    const headers = { 'user-agent': 'EDU-Review', accept: 'application/vnd.github+json' }
    if (githubToken) headers.authorization = `Bearer ${githubToken}`
    const owner = match[1]
    const repository = match[2]
    const options = { headers, signal: AbortSignal.timeout(10_000) }
    const response = await fetchImpl(`https://api.github.com/repos/${owner}/${repository}`, options)

    if (response.ok) {
      breakdown[0].score = 25
      const filesResponse = await fetchImpl(`https://api.github.com/repos/${owner}/${repository}/contents`, options)
      const files = filesResponse.ok ? await filesResponse.json() : []
      const names = Array.isArray(files) ? files.map(item => String(item.name).toLowerCase()) : []
      breakdown[1].score = Math.min(30, names.length * 6)
      breakdown[2].score = names.some(name => /^readme(\.|$)/.test(name)) ? 25 : 0
      breakdown[3].score = names.some(name =>
        /\.(js|jsx|ts|tsx|kt|go|py|html|css)$/.test(name) || ['src', 'app', 'lib'].includes(name),
      ) ? 20 : 0
      feedback = 'Автоматическая базовая проверка публичного репозитория. Содержимое решения пока не оценивается по смыслу.'
    }
  } catch {}

  return {
    score: breakdown.reduce((sum, item) => sum + item.score, 0),
    breakdown,
    feedback,
  }
}
