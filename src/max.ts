type MaxWebApp = {
  initData?: string
  initDataUnsafe?: { start_param?: string }
  platform?: string
  getViewportSize?: () => Promise<{ height: string; width: string }>
  openLink?: (url: string) => void
  openMaxLink?: (url: string) => void
  shareMaxContent?: (params: { text?: string; link?: string }) => void
  BackButton?: { show: () => void; hide: () => void; onClick: (cb: () => void) => void; offClick: (cb: () => void) => void }
}

declare global { interface Window { WebApp?: MaxWebApp } }

export const maxBridge = {
  get initData() { return window.WebApp?.initData || new URLSearchParams(window.location.hash.slice(1)).get('WebAppData') || '' },
  get startParam() {
    const query = new URLSearchParams(window.location.search)
    const hash = new URLSearchParams(window.location.hash.slice(1))
    return window.WebApp?.initDataUnsafe?.start_param
      || query.get('WebAppStartParam')
      || query.get('startapp')
      || hash.get('WebAppStartParam')
      || ''
  },
  link(type: 'video' | 'project' | 'task', id: string) {
    const safeId = id.replace(/[^A-Za-z0-9_-]/g, '')
    return `https://max.ru/t187_hakaton_max_bot?startapp=${type}_${safeId}`
  },
  backButton(active: boolean, handler: () => void) {
    const button = window.WebApp?.BackButton
    if (!button) return () => {}
    if (active) { button.show(); button.onClick(handler) } else button.hide()
    return () => { if (active) button.offClick(handler) }
  },
  open(url: string) {
    if (window.WebApp) {
      if (url.startsWith('https://max.ru/')) window.WebApp.openMaxLink?.(url)
      else window.WebApp.openLink?.(url)
    } else window.open(url, '_blank', 'noopener,noreferrer')
  },
  async share(text: string, link?: string) {
    if (window.WebApp?.shareMaxContent) window.WebApp.shareMaxContent({ text, link })
    else if (navigator.share) await navigator.share({ text, url: link })
    else if (navigator.clipboard) await navigator.clipboard.writeText(`${text}${link ? ` ${link}` : ''}`)
  },
}
