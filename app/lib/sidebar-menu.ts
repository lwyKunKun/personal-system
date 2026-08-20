// app/lib/sidebar-menu.ts
// 侧边栏菜单的共享配置与持久化逻辑
import { DEFAULT_ROUTES, getStoredRoutes, type RouteDefinition } from "./routes"

export type MenuGroup = "system" | "project" | "personal"

export interface SidebarMenuItem {
  id?: string
  label: string
  group?: MenuGroup
  // 一级菜单的路径前缀（如 /system、/projects、/personal），子菜单路由自动加上此前缀
  pathPrefix?: string
  icon?: string
  iconName?: string
  iconClass?: string
  visible?: boolean
  sortOrder?: number
  // 路由引用：通过 routeId 关联路由表中的路由（推荐方式）
  routeId?: string
  // 兼容旧数据：直接路径（优先使用 routeId，path 作为 fallback）
  path?: string
  // 可选权限标记
  roles?: string[]
  children?: SidebarMenuItem[]
}

export const SIDEBAR_STORAGE_KEY = "vibe:sidebarItems"
export const SIDEBAR_VERSION = 2

function withChildren(children?: SidebarMenuItem[]): SidebarMenuItem[] | undefined {
  if (!children || children.length === 0) return undefined
  return children
}

// 默认菜单：使用 routeId 关联路由表
export const DEFAULT_SIDEBAR_ITEMS: SidebarMenuItem[] = [
  {
    id: "system", label: "系统", group: "system", pathPrefix: "/system", visible: true, sortOrder: 10, iconName: "Settings",
    children: [
      { id: "system-menus", label: "菜单管理", group: "system", visible: true, sortOrder: 10, iconName: "PanelTop", routeId: "system-menus" },
      { id: "system-routes", label: "路由管理", group: "system", visible: true, sortOrder: 20, iconName: "Route", routeId: "system-routes" },
      { id: "system-permissions", label: "权限管理", group: "system", visible: true, sortOrder: 30, iconName: "ShieldCheck", routeId: "system-permissions" },
      { id: "system-settings", label: "设置", group: "system", visible: true, sortOrder: 40, iconName: "SlidersHorizontal", routeId: "system-settings" },
    ],
  },
  {
    id: "project", label: "项目", group: "project", pathPrefix: "/projects", visible: true, sortOrder: 20, iconName: "FolderOpen",
    children: [
      { id: "project-stock", label: "股票", group: "project", visible: true, sortOrder: 10, iconName: "CandlestickChart", routeId: "project-stock" },
      { id: "project-bookshelf", label: "书架", group: "project", visible: true, sortOrder: 20, iconName: "Library", routeId: "project-bookshelf" },
      { id: "project-llm-wiki", label: "llm-wiki", group: "project", visible: true, sortOrder: 30, iconName: "BookOpenText", routeId: "project-llm-wiki" },
      { id: "project-records", label: "研究记录", group: "project", visible: true, sortOrder: 40, iconName: "NotebookPen", routeId: "project-records" },
      { id: "project-ai", label: "AI 算法", group: "project", visible: true, sortOrder: 50, iconName: "BrainCircuit", routeId: "project-ai" },
    ],
  },
  {
    id: "personal", label: "个人", group: "personal", pathPrefix: "/personal", visible: true, sortOrder: 30, iconName: "UserRound",
    children: [
      { id: "personal-recent", label: "最近", group: "personal", visible: true, sortOrder: 10, iconName: "Clock3", routeId: "personal-recent" },
      { id: "personal-favorites", label: "收藏", group: "personal", visible: true, sortOrder: 20, iconName: "Star", routeId: "personal-favorites" },
      { id: "personal-common", label: "常用", group: "personal", visible: true, sortOrder: 30, iconName: "Sparkles", routeId: "personal-common" },
    ],
  },
]

// 根据 routeId 或 path 解析出最终的路由信息
// 返回 { path, route, isExternal }
export function resolveMenuPath(
  item: SidebarMenuItem,
  routes?: RouteDefinition[],
): { href: string; route?: RouteDefinition; isExternal: boolean; target?: "_self" | "_blank" } {
  const routeList = routes ?? getStoredRoutes()

  if (item.routeId) {
    const route = routeList.find((r) => r.id === item.routeId)
    if (route) {
      const href = route.type === "link" ? route.url || route.path : route.path
      return { href, route, isExternal: route.type === "link", target: route.target }
    }
  }

  // fallback: 使用 item.path
  const rawPath = item.path || ""
  const isExt = /^https?:\/\//i.test(rawPath)
  return { href: rawPath, isExternal: isExt, target: isExt ? "_blank" : "_self" }
}

// 迁移旧菜单数据：将 path 映射为 routeId
function migrateMenuItem(item: SidebarMenuItem, routeList: RouteDefinition[]): SidebarMenuItem {
  let nextItem = { ...item }

  // 如果没有 routeId 但有 path，尝试匹配已有路由
  if (!nextItem.routeId && nextItem.path) {
    const matched = routeList.find((r) => r.path === nextItem.path || (r.url && r.url === nextItem.path))
    if (matched) {
      nextItem.routeId = matched.id
    }
  }

  // 子菜单递归迁移
  if (nextItem.children) {
    nextItem.children = nextItem.children.map((child) => migrateMenuItem(child, routeList))
  }

  return nextItem
}

function normalizeSidebarItem(item: SidebarMenuItem): SidebarMenuItem {
  return {
    ...item,
    visible: item.visible ?? true,
    sortOrder: item.sortOrder ?? 0,
    children: withChildren(item.children?.map((c) => normalizeSidebarItem(c))),
  }
}

export function getStoredSidebarItems(): SidebarMenuItem[] {
  if (typeof window === "undefined") return DEFAULT_SIDEBAR_ITEMS
  try {
    const raw = localStorage.getItem(SIDEBAR_STORAGE_KEY)
    if (!raw) return DEFAULT_SIDEBAR_ITEMS
    const parsed = JSON.parse(raw) as SidebarMenuItem[]
    if (Array.isArray(parsed) && parsed.length > 0) {
      const routes = getStoredRoutes()
      // 确保内置菜单都存在（与默认菜单对比，补全缺失项）
      const normalized = parsed.map((i) => normalizeSidebarItem(migrateMenuItem(i, routes)))
      // 补全缺失的内置分组
      const existingIds = new Set<string>()
      const collectIds = (items: SidebarMenuItem[]) => {
        for (const it of items) {
          if (it.id) existingIds.add(it.id)
          if (it.children) collectIds(it.children)
        }
      }
      collectIds(normalized)
      const merged = [...normalized]
      for (const def of DEFAULT_SIDEBAR_ITEMS) {
        if (def.id && !existingIds.has(def.id)) {
          merged.push(def)
        }
      }
      return merged
    }
  } catch (error) {
    console.warn("Invalid sidebar menu data, reset to defaults", error)
  }
  return DEFAULT_SIDEBAR_ITEMS
}

export function saveStoredSidebarItems(items: SidebarMenuItem[]) {
  if (typeof window === "undefined") return
  try {
    localStorage.setItem(SIDEBAR_STORAGE_KEY, JSON.stringify(items))
    window.dispatchEvent(new CustomEvent("vibe:sidebar-updated"))
  } catch (error) {
    console.warn("Failed to save sidebar menu", error)
  }
}

export function resetSidebarItems() {
  saveStoredSidebarItems(DEFAULT_SIDEBAR_ITEMS)
}

// 根据菜单索引路径获取所属一级分组的 pathPrefix
// path 是索引数组，如 [0, 1] 表示第一个分组下的第二个子菜单
export function getGroupPathPrefix(items: SidebarMenuItem[], path: number[]): string | undefined {
  if (path.length === 0) return undefined
  const topLevelItem = items[path[0]]
  return topLevelItem?.pathPrefix
}

// 判断是否是顶级菜单（一级分组）
export function isTopLevelMenu(path: number[]): boolean {
  return path.length === 1
}

// 查找所有引用指定路由的菜单项（返回菜单路径信息）
export function findMenuItemsByRouteId(
  routeId: string,
  items: SidebarMenuItem[] = getStoredSidebarItems(),
  parents: string[] = [],
): Array<{ item: SidebarMenuItem; labelPath: string[] }> {
  const results: Array<{ item: SidebarMenuItem; labelPath: string[] }> = []
  for (const item of items) {
    const path = [...parents, item.label]
    if (item.routeId === routeId) {
      results.push({ item, labelPath: path })
    }
    if (item.children) {
      results.push(...findMenuItemsByRouteId(routeId, item.children, path))
    }
  }
  return results
}

// 一级菜单分组信息
export interface MenuGroupInfo {
  label: string
  pathPrefix: string
  id?: string
}

// 获取所有一级菜单分组（用于路由分组下拉框）
export function getMenuGroups(items: SidebarMenuItem[] = getStoredSidebarItems()): MenuGroupInfo[] {
  return items
    .filter((item) => item.pathPrefix)
    .map((item) => ({
      label: item.label,
      pathPrefix: item.pathPrefix!,
      id: item.id,
    }))
}

// 根据分组路径前缀查找分组标签
export function getGroupLabelByPrefix(prefix: string | undefined, items: SidebarMenuItem[] = getStoredSidebarItems()): string {
  if (!prefix) return "-"
  const found = items.find((item) => item.pathPrefix === prefix)
  return found?.label ?? prefix
}
