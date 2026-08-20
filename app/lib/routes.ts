// app/lib/routes.ts
// 路由注册表：系统中所有可导航的路由定义
export type RouteType = "builtin" | "page" | "link" | "iframe"

export interface RouteButton {
  key: string
  name: string
}

export interface RouteDefinition {
  id: string
  path: string
  type: RouteType
  title: string
  iconName?: string
  icon?: string
  group?: "system" | "project" | "personal"
  roles?: string[]
  visible?: boolean
  target?: "_self" | "_blank"
  url?: string
  builtin?: boolean
  description?: string
  buttons?: RouteButton[]
  createdAt?: number
  updatedAt?: number
}

export const ROUTES_STORAGE_KEY = "vibe:routes"
export const ROUTES_VERSION = 2

export const DEFAULT_ROUTES: RouteDefinition[] = [
  { id: "system-menus", path: "/system/menus", type: "builtin", title: "菜单管理", iconName: "PanelTop", group: "system", builtin: true, visible: true, description: "配置导航结构、分组、排序与权限", buttons: [{ key: "create", name: "新增菜单" }, { key: "edit", name: "编辑菜单" }, { key: "delete", name: "删除菜单" }] },
  { id: "system-routes", path: "/system/routes", type: "builtin", title: "路由管理", iconName: "Route", group: "system", builtin: true, visible: true, description: "管理页面映射与入口定义", buttons: [{ key: "create", name: "新建路由" }, { key: "edit", name: "编辑路由" }, { key: "delete", name: "删除路由" }] },
  { id: "system-permissions", path: "/system/permissions", type: "builtin", title: "权限管理", iconName: "ShieldCheck", group: "system", builtin: true, visible: true, description: "定义角色策略与访问控制", buttons: [{ key: "create_role", name: "新增角色" }, { key: "edit_role", name: "编辑角色" }, { key: "delete_role", name: "删除角色" }, { key: "create_user", name: "新增用户" }, { key: "edit_user", name: "编辑用户" }, { key: "delete_user", name: "删除用户" }] },
  { id: "system-settings", path: "/system/settings", type: "builtin", title: "系统设置", iconName: "SlidersHorizontal", group: "system", builtin: true, visible: true, description: "系统基础配置与运行参数", buttons: [{ key: "save", name: "保存设置" }] },
  { id: "project-stock", path: "/projects/stock", type: "builtin", title: "股票", iconName: "CandlestickChart", group: "project", builtin: true, visible: true, buttons: [{ key: "add", name: "添加股票" }, { key: "refresh", name: "刷新行情" }] },
  { id: "project-bookshelf", path: "/projects/bookshelf", type: "builtin", title: "书架", iconName: "Library", group: "project", builtin: true, visible: true, buttons: [{ key: "add", name: "添加书籍" }] },
  { id: "project-llm-wiki", path: "/projects/llm-wiki", type: "builtin", title: "llm-wiki", iconName: "BookOpenText", group: "project", builtin: true, visible: true },
  { id: "project-records", path: "/projects/records", type: "builtin", title: "研究记录", iconName: "NotebookPen", group: "project", builtin: true, visible: true, buttons: [{ key: "create", name: "新建记录" }, { key: "edit", name: "编辑记录" }, { key: "delete", name: "删除记录" }] },
  { id: "project-ai", path: "/projects/ai", type: "builtin", title: "AI 算法", iconName: "BrainCircuit", group: "project", builtin: true, visible: true },
  { id: "personal-recent", path: "/personal/recent", type: "builtin", title: "最近", iconName: "Clock3", group: "personal", builtin: true, visible: true },
  { id: "personal-favorites", path: "/personal/favorites", type: "builtin", title: "收藏", iconName: "Star", group: "personal", builtin: true, visible: true, buttons: [{ key: "add", name: "添加收藏" }, { key: "remove", name: "取消收藏" }] },
  { id: "personal-common", path: "/personal/common", type: "builtin", title: "常用", iconName: "Sparkles", group: "personal", builtin: true, visible: true },
  { id: "home", path: "/", type: "builtin", title: "首页", iconName: "Home", builtin: true, visible: false },
]

function normalizeRoute(route: RouteDefinition): RouteDefinition {
  return {
    ...route,
    visible: route.visible ?? true,
    roles: route.roles ?? [],
    target: route.target ?? (route.type === "link" ? "_blank" : "_self"),
    builtin: route.builtin ?? false,
    buttons: route.buttons ?? [],
  }
}

function migrateFromSidebarPaths(): RouteDefinition[] {
  if (typeof window === "undefined") return DEFAULT_ROUTES
  try {
    const raw = localStorage.getItem("vibe:sidebarItems")
    if (!raw) return DEFAULT_ROUTES
    const items = JSON.parse(raw) as any[]
    const existingIds = new Set(DEFAULT_ROUTES.map((r) => r.id))
    const existingPaths = new Set(DEFAULT_ROUTES.map((r) => r.path))
    const discovered: RouteDefinition[] = []
    const walk = (list: any[]) => {
      for (const item of list) {
        if (item.path && !existingPaths.has(item.path) && !String(item.path).startsWith("/system?tab=")) {
          const id = item.id || `route-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
          if (!existingIds.has(id)) {
            const isExternal = /^https?:\/\//i.test(item.path)
            discovered.push({
              id, path: item.path, type: isExternal ? "link" : "page",
              title: item.label || item.path, iconName: item.iconName, icon: item.icon,
              group: item.group, roles: item.roles, visible: item.visible ?? true,
              url: isExternal ? item.path : undefined, builtin: false,
            })
            existingIds.add(id); existingPaths.add(item.path)
          }
        }
        if (item.children) walk(item.children)
      }
    }
    walk(items)
    return [...DEFAULT_ROUTES, ...discovered]
  } catch { return DEFAULT_ROUTES }
}

export function getStoredRoutes(): RouteDefinition[] {
  if (typeof window === "undefined") return DEFAULT_ROUTES.map(normalizeRoute)
  try {
    const raw = localStorage.getItem(ROUTES_STORAGE_KEY)
    if (!raw) {
      const migrated = migrateFromSidebarPaths()
      saveStoredRoutes(migrated)
      return migrated.map(normalizeRoute)
    }
    const parsed = JSON.parse(raw) as RouteDefinition[]
    if (Array.isArray(parsed) && parsed.length > 0) {
      const storedMap = new Map(parsed.map((r) => [r.id, r]))
      const result: RouteDefinition[] = []
      for (const def of DEFAULT_ROUTES) {
        const stored = storedMap.get(def.id)
        if (stored) {
          result.push(normalizeRoute({ ...def, ...stored, buttons: def.buttons || stored.buttons || [] }))
          storedMap.delete(def.id)
        } else {
          result.push(normalizeRoute(def))
        }
      }
      for (const [, rest] of storedMap) {
        result.push(normalizeRoute(rest))
      }
      return result
    }
  } catch (error) { console.warn("Invalid routes data, reset to defaults", error) }
  return DEFAULT_ROUTES.map(normalizeRoute)
}

export function saveStoredRoutes(routes: RouteDefinition[]) {
  if (typeof window === "undefined") return
  try {
    localStorage.setItem(ROUTES_STORAGE_KEY, JSON.stringify(routes))
    window.dispatchEvent(new CustomEvent("vibe:routes-updated"))
  } catch (error) { console.warn("Failed to save routes", error) }
}

export function getRouteById(id: string): RouteDefinition | undefined {
  return getStoredRoutes().find((r) => r.id === id)
}

export function getRouteByPath(path: string): RouteDefinition | undefined {
  return getStoredRoutes().find((r) => r.path === path)
}

export function createRoute(input: Omit<RouteDefinition, "id" | "createdAt" | "updatedAt">): RouteDefinition {
  const id = `route-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
  const now = Date.now()
  const route: RouteDefinition = { ...input, id, createdAt: now, updatedAt: now, builtin: input.builtin ?? false, visible: input.visible ?? true, target: input.target ?? (input.type === "link" ? "_blank" : "_self") }
  const routes = getStoredRoutes()
  saveStoredRoutes([...routes, normalizeRoute(route)])
  return route
}

export function updateRoute(id: string, patch: Partial<RouteDefinition>): RouteDefinition | undefined {
  const routes = getStoredRoutes()
  const idx = routes.findIndex((r) => r.id === id)
  if (idx < 0) return undefined
  const current = routes[idx]
  if (current.builtin) {
    const allowed = ["title", "iconName", "icon", "roles", "visible", "description"]
    const filtered: Partial<RouteDefinition> = {}
    for (const key of allowed) { if (key in patch) (filtered as any)[key] = (patch as any)[key] }
    routes[idx] = { ...current, ...filtered, updatedAt: Date.now() }
  } else {
    routes[idx] = { ...current, ...patch, id: current.id, updatedAt: Date.now() }
  }
  saveStoredRoutes(routes)
  return routes[idx]
}

export function deleteRoute(id: string): boolean {
  const routes = getStoredRoutes()
  const target = routes.find((r) => r.id === id)
  if (!target || target.builtin) return false
  saveStoredRoutes(routes.filter((r) => r.id !== id))
  return true
}

export function resetRoutes() {
  saveStoredRoutes(DEFAULT_ROUTES.map(normalizeRoute))
}

export function isExternalPath(path: string): boolean {
  return /^https?:\/\//i.test(path)
}
