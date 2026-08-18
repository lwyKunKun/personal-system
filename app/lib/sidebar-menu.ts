// app/lib/sidebar-menu.ts
// 侧边栏菜单的共享配置与持久化逻辑
// 作用：
// - 统一默认菜单项
// - 统一 localStorage 键名
// - 让 Sidebar 组件和 settings 页面共用同一份数据源
// - 支持 Lucide React 图标组件与 emoji 兜底

export type MenuGroup = "system" | "project" | "personal"

export interface SidebarMenuItem {
  id?: string
  label: string
  group?: MenuGroup
  icon?: string
  iconName?: string
  iconClass?: string
  active?: boolean
  visible?: boolean
  sortOrder?: number
  // 可选的页面路由，当存在时点击该项会导航到对应页面
  path?: string
  // 可选权限标记（占位，后续可用于权限控制）
  roles?: string[]
  children?: SidebarMenuItem[]
}

export const SIDEBAR_STORAGE_KEY = "vibe:sidebarItems"

function withChildren(children?: SidebarMenuItem[]): SidebarMenuItem[] | undefined {
  if (!children || children.length === 0) {
    return undefined
  }

  return children
}

export const DEFAULT_SIDEBAR_ITEMS: SidebarMenuItem[] = [
  {
    id: "system",
    label: "系统",
    group: "system",
    visible: true,
    sortOrder: 10,
    iconName: "Settings",
    children: [
      { id: "system-menus", label: "菜单管理", group: "system", visible: true, sortOrder: 10, iconName: "PanelTop", path: "/system?tab=menus" },
      { id: "system-routes", label: "路由管理", group: "system", visible: true, sortOrder: 20, iconName: "Route", path: "/system?tab=routes" },
      { id: "system-permissions", label: "权限管理", group: "system", visible: true, sortOrder: 30, iconName: "ShieldCheck", path: "/system?tab=permissions" },
      { id: "system-settings", label: "设置", group: "system", visible: true, sortOrder: 40, iconName: "SlidersHorizontal", path: "/system?tab=settings" },
    ],
  },
  {
    id: "project",
    label: "项目",
    group: "project",
    visible: true,
    sortOrder: 20,
    iconName: "FolderOpen",
    active: true,
    children: [
      { id: "project-stock", label: "股票", group: "project", visible: true, sortOrder: 10, iconName: "CandlestickChart", path: "/projects/stock" },
      { id: "project-bookshelf", label: "书架", group: "project", visible: true, sortOrder: 20, iconName: "Library", path: "/projects/bookshelf" },
      { id: "project-llm-wiki", label: "llm-wiki", group: "project", visible: true, sortOrder: 30, iconName: "BookOpenText", path: "/projects/llm-wiki" },
      { id: "project-records", label: "研究记录", group: "project", visible: true, sortOrder: 40, iconName: "NotebookPen", path: "/projects/records" },
      { id: "project-ai", label: "AI 算法", group: "project", visible: true, sortOrder: 50, iconName: "BrainCircuit", path: "/projects/ai" },
    ],
  },
  {
    id: "personal",
    label: "个人",
    group: "personal",
    visible: true,
    sortOrder: 30,
    iconName: "UserRound",
    children: [
      { id: "personal-recent", label: "最近", group: "personal", visible: true, sortOrder: 10, iconName: "Clock3", path: "/personal/recent" },
      { id: "personal-favorites", label: "收藏", group: "personal", visible: true, sortOrder: 20, iconName: "Star", path: "/personal/favorites" },
      { id: "personal-common", label: "常用", group: "personal", visible: true, sortOrder: 30, iconName: "Sparkles", path: "/personal/common" },
    ],
  },
]

function normalizeSidebarItem(item: SidebarMenuItem): SidebarMenuItem {
  return {
    ...item,
    visible: item.visible ?? true,
    sortOrder: item.sortOrder ?? 0,
    children: withChildren(item.children?.map(normalizeSidebarItem)),
  }
}

export function getStoredSidebarItems(): SidebarMenuItem[] {
  if (typeof window === "undefined") {
    return DEFAULT_SIDEBAR_ITEMS
  }

  try {
    const raw = localStorage.getItem(SIDEBAR_STORAGE_KEY)
    if (!raw) {
      return DEFAULT_SIDEBAR_ITEMS
    }

    const parsed = JSON.parse(raw) as SidebarMenuItem[]
    if (Array.isArray(parsed) && parsed.length > 0) {
      return parsed.map(normalizeSidebarItem)
    }
  } catch (error) {
    // 若 JSON 解析失败，则回退到默认配置，避免页面崩溃
    console.warn("Invalid sidebar menu data, reset to defaults", error)
  }

  return DEFAULT_SIDEBAR_ITEMS
}

export function saveStoredSidebarItems(items: SidebarMenuItem[]) {
  if (typeof window === "undefined") {
    return
  }

  try {
    localStorage.setItem(SIDEBAR_STORAGE_KEY, JSON.stringify(items))
  } catch (error) {
    console.warn("Failed to save sidebar menu", error)
  }
}

export function resetSidebarItems() {
  saveStoredSidebarItems(DEFAULT_SIDEBAR_ITEMS)
}
