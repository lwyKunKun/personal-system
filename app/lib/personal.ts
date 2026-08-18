export const PERSONAL_STORAGE_KEY = "vibe:personal"

export type PersonalState = {
  recent: string[]
  favorites: string[]
  common: string[]
}

const EMPTY_STATE: PersonalState = { recent: [], favorites: [], common: [] }

export function getPersonalState(): PersonalState {
  if (typeof window === "undefined") {
    return EMPTY_STATE
  }

  try {
    const raw = localStorage.getItem(PERSONAL_STORAGE_KEY)
    if (!raw) return EMPTY_STATE

    const parsed = JSON.parse(raw) as Partial<PersonalState>
    return {
      recent: Array.isArray(parsed.recent) ? parsed.recent : [],
      favorites: Array.isArray(parsed.favorites) ? parsed.favorites : [],
      common: Array.isArray(parsed.common) ? parsed.common : [],
    }
  } catch (error) {
    console.warn("Failed to read personal state", error)
    return EMPTY_STATE
  }
}

export function savePersonalState(state: PersonalState) {
  if (typeof window === "undefined") return
  try {
    localStorage.setItem(PERSONAL_STORAGE_KEY, JSON.stringify(state))
  } catch (error) {
    console.warn("Failed to save personal state", error)
  }
}

export function addPersonalEntry(category: keyof PersonalState, value: string, limit = 12) {
  const next = getPersonalState()
  const current = next[category] ?? []
  const cleaned = value.trim()
  if (!cleaned) return next

  const merged = [cleaned, ...current.filter((item) => item !== cleaned)].slice(0, limit)
  const updated = { ...next, [category]: merged }
  savePersonalState(updated)
  return updated
}

export function removePersonalEntry(category: keyof PersonalState, value: string) {
  const next = getPersonalState()
  const current = next[category] ?? []
  const filtered = current.filter((item) => item !== value)
  const updated = { ...next, [category]: filtered }
  savePersonalState(updated)
  return updated
}

export function normalizePersonalPath(path: string) {
  const trimmed = path.trim()
  if (!trimmed) return "未命名"

  const map: Record<string, string> = {
    "/": "首页",
    "/settings": "设置",
    "/system/menus": "系统 · 菜单管理",
    "/system/routes": "系统 · 路由管理",
    "/system/permissions": "系统 · 权限管理",
    "/system/settings": "系统 · 设置",
    "/projects/stock": "项目 · 股票",
    "/projects/bookshelf": "项目 · 书架",
    "/projects/llm-wiki": "项目 · llm-wiki",
    "/projects/records": "项目 · 研究记录",
    "/projects/ai": "项目 · AI 算法",
    "/personal/recent": "个人 · 最近",
    "/personal/favorites": "个人 · 收藏",
    "/personal/common": "个人 · 常用",
  }

  return map[trimmed] ?? trimmed
}
