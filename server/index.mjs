import { createApp } from './app.mjs'

if (!process.env.MAX_BOT_TOKEN) {
  console.error('MAX_BOT_TOKEN обязателен')
  process.exit(1)
}

const port = Number(process.env.PORT ?? 3001)
const host = process.env.HOST ?? '0.0.0.0'
const { server } = createApp()
server.listen(port, host, () => console.log(`EDU API слушает ${host}:${port}`))
