// app/lib/sidebar-menu.ts
// 侧边栏菜单的共享配置与持久化逻辑
// 作用：
// - 统一默认菜单项
// - 统一 localStorage 键名
// - 让 Sidebar 组件和 settings 页面共用同一份数据源
// - 支持 Lucide React 图标组件与 emoji 兜底

export interface SidebarMenuItem {
  label: string
  icon?: string
  iconName?: string
  iconClass?: string
  active?: boolean
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
    label: "每日复盘",
    iconName: "TrendingUp",
    active: true,
    children: [
      { label: "A股日历", iconName: "CalendarRange" },
      { label: "市场情绪", iconName: "Activity" },
    ],
  },
  {
    label: "资讯雷达",
    iconName: "Newspaper",
    children: [
      { label: "宏观资讯", iconName: "BookOpenText" },
      { label: "行业速递", iconName: "ChartColumnBig" },
    ],
  },
  { label: "板块中心", iconName: "LayoutGrid" },
  { label: "人物机器人", iconName: "Bot" },
  { label: "AI 算法", iconName: "BrainCircuit" },
  { label: "HBM", iconName: "Cpu" },
  { label: "光互联", iconName: "CircuitBoard" },
  { label: "商业航天", iconName: "Rocket" },
  { label: "生物医药", iconName: "Pill" },
  { label: "个股数据", iconName: "BarChart3" },
  { label: "我的持仓", iconName: "Wallet" },
  { label: "研究记录", iconName: "NotebookPen" },
  { label: "菜单管理", iconName: "Settings" },
]

function normalizeSidebarItem(item: SidebarMenuItem): SidebarMenuItem {
  return {
    ...item,
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
