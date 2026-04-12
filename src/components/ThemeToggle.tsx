import { useLayoutEffect, useState } from 'react'

type Theme = 'jade' | 'paper'

const STORAGE_KEY = 'miniichi-theme'

export default function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>(() => {
    return (localStorage.getItem(STORAGE_KEY) as Theme) ?? 'jade'
  })

  useLayoutEffect(() => {
    document.documentElement.dataset.theme = theme === 'paper' ? 'paper' : ''
    localStorage.setItem(STORAGE_KEY, theme)
  }, [theme])

  const toggle = () => setTheme(t => t === 'jade' ? 'paper' : 'jade')

  return (
    <button className="theme-toggle" onClick={toggle}>
      {theme === 'paper' ? '📜 Paper Theme' : '🌿 Jade Theme'}
    </button>
  )
}
