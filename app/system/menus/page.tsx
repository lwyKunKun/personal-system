"use client"
import Link from "next/link"
import { useEffect, useMemo, useRef, useState } from "react"
import * as LucideIcons from "lucide-react"
import SystemShell from "../../components/SystemShell"
import { DEFAULT_SIDEBAR_ITEMS, getGroupPathPrefix, getStoredSidebarItems, isTopLevelMenu, saveStoredSidebarItems, type SidebarMenuItem } from "../../lib/sidebar-menu"
import { createRoute, getStoredRoutes, type RouteDefinition, type RouteType } from "../../lib/routes"

const LUCIDE_ICON_OPTIONS = [
  // 导航与首页
  "Home", "LayoutDashboard", "Menu", "Sidebar", "PanelTop", "PanelLeft", "PanelRight",
  // 系统与设置
  "Settings", "ShieldCheck", "SlidersHorizontal", "Wrench", "Gauge", "Cog", "Lock", "Unlock", "Key", "KeyRound",
  // 用户与人员
  "UserRound", "Users", "UserCog", "UserPlus", "UserMinus", "UserCheck", "CircleUser", "Contact", "ContactRound", "UserGroup",
  // 文件与文档
  "FileText", "File", "FolderOpen", "Folder", "FolderPlus", "FolderClosed", "Files", "BookOpen", "BookOpenText", "NotebookPen",
  "Notebook", "FileSpreadsheet", "FileChartColumn", "FileImage", "FileVideo", "FileAudio", "FileCode", "FileJson",
  "ClipboardList", "ClipboardCheck", "ClipboardPaste", "ClipboardCopy",
  // 图表与数据
  "BarChart3", "LineChart", "PieChart", "CandlestickChart", "ChartColumnBig", "ChartArea", "ChartLine",
  "TrendingUp", "TrendingDown", "Activity", "Pulse",
  // 金融与商业
  "CircleDollarSign", "DollarSign", "Wallet", "CreditCard", "Receipt", "Banknote", "Landmark", "Coins", "BadgeDollarSign",
  "ShoppingCart", "ShoppingBag", "Store", "Tag", "Tags",
  // 工具与开发
  "Rocket", "Cpu", "Bot", "BrainCircuit", "Code", "Code2", "Terminal", "Database", "Server", "Cloud", "CloudUpload",
  "CloudDownload", "Globe", "Network", "Wifi", "Bluetooth", "Usb", "HardDrive", "Monitor", "Smartphone", "Tablet", "Laptop",
  // 媒体与内容
  "Image", "Images", "Video", "Music", "Camera", "Mic", "Headphones", "Play", "Pause", "Film", "Clapperboard",
  "Newspaper", "BookMarked", "Library", "Book", "BookCopy", "ScrollText", "Quote", "MessageSquare", "MessagesSquare",
  "Send", "Mail", "Mails", "Inbox", "Bell", "BellRing",
  // 搜索与导航
  "Search", "Filter", "SortAsc", "SortDesc", "Compass", "Map", "MapPin", "Navigation", "Route", "MapPinned",
  "CalendarRange", "Calendar", "Clock3", "Clock", "Timer", "AlarmClock",
  // 操作与交互
  "Plus", "Minus", "X", "Check", "CheckCircle2", "XCircle", "AlertCircle", "AlertTriangle", "HelpCircle",
  "Edit", "Trash2", "Copy", "Save", "Download", "Upload", "Share", "Link", "Link2", "ExternalLink",
  "MoreHorizontal", "MoreVertical", "RefreshCw", "RotateCw", "Undo", "Redo",
  "ChevronDown", "ChevronUp", "ChevronLeft", "ChevronRight", "ChevronsDown", "ChevronsUp",
  "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "ArrowUpRight",
  "Maximize", "Minimize", "Move", "Eye", "EyeOff", "Heart", "Bookmark", "Flag",
  // 状态与标记
  "Sparkles", "Zap", "Flame", "Award", "Trophy", "Medal", "Badge", "BadgeCheck",
  "Target", "Crosshair", "Focus", "Circle", "CircleDot", "Triangle", "Hexagon", "Octagon",
  // 其他常用
  "BriefcaseBusiness", "Briefcase", "Building", "Building2", "GraduationCap", "School", "AcademicCap",
  "Handshake", "Crown", "Gift", "Package", "Box", "Truck",
  "Sun", "Moon", "CloudSun", "CloudMoon", "Umbrella", "Thermometer",
  "Utensils", "Coffee", "Pizza", "Beer", "Wine", "Cake",
  "Car", "Plane", "Train", "Bus", "Bike", "Ship",
  "Gamepad2", "Dice5", "Puzzle", "Palette", "Brush", "Eraser", "Pen", "Pencil",
] as const

const MENU_TEMPLATES = [
  { id: "default", label: "默认导航", items: DEFAULT_SIDEBAR_ITEMS },
]

const ICON_MAP = LucideIcons as unknown as Record<string, React.ComponentType<{ className?: string }>>
const renderLucidePreview = (iconName?: string, className = "h-4 w-4") => {
  const value = iconName?.trim()
  if (!value) return <span className="text-base">◌</span>
  const Icon = ICON_MAP[value]
  if (!Icon) return <span className="text-[11px] font-semibold">{value.slice(0, 1)}</span>
  return <Icon className={className} />
}

const getParentAndIndex = (nodes: SidebarMenuItem[], path: number[]) => {
  if (path.length === 0) return { parent: nodes, index: -1 }
  let current = nodes
  for (let i = 0; i < path.length - 1; i++) { const item = current[path[i]]; if (!item) return null; current = item.children ?? [] }
  return { parent: current, index: path[path.length - 1] }
}
const getItemByPath = (nodes: SidebarMenuItem[], path: number[]) => {
  if (path.length === 0) return undefined
  let current = nodes; let result: SidebarMenuItem | undefined
  for (const idx of path) { const item = current[idx]; if (!item) return undefined; result = item; current = item.children ?? [] }
  return result
}

// 快速新建路由弹窗
function QuickCreateRouteModal({ pathPrefix, onClose, onCreated }: { pathPrefix?: string; onClose: () => void; onCreated: (route: RouteDefinition) => void }) {
  const [form, setForm] = useState({ title: "", subPath: "", type: "page" as RouteType, iconName: "" })
  const handleCreate = () => {
    if (!form.title.trim()) { alert("标题不能为空"); return }
    let finalPath = ""
    let group = pathPrefix
    if (form.type === "link") {
      if (!form.subPath.trim()) { alert("链接地址不能为空"); return }
      finalPath = form.subPath.trim()
    } else {
      const sub = form.subPath.trim().replace(/^\//, "")
      if (!sub) { alert("路径不能为空"); return }
      finalPath = pathPrefix ? `${pathPrefix.replace(/\/$/, "")}/${sub}` : `/${sub}`
    }
    const route = createRoute({
      title: form.title.trim(), path: finalPath, type: form.type,
      iconName: form.iconName.trim() || undefined, group,
      visible: true,
    })
    onCreated(route)
  }
  const isExternal = form.type === "link"
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={onClose}>
      <div className="w-full max-w-md rounded-2xl border border-white/10 bg-[#0d1628] p-6" onClick={(e) => e.stopPropagation()}>
        <h3 className="mb-4 text-lg font-semibold text-white">快速新建路由</h3>
        <div className="space-y-3">
          <input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="路由标题" className="w-full rounded-xl border border-white/8 bg-[#0b1220] px-3 py-2.5 text-sm text-slate-100 outline-none" />
          {isExternal ? (
            <input value={form.subPath} onChange={(e) => setForm({ ...form, subPath: e.target.value })} placeholder="外部链接（如 https://example.com）" className="w-full rounded-xl border border-white/8 bg-[#0b1220] px-3 py-2.5 text-sm text-slate-100 outline-none" />
          ) : (
            <div className="flex items-stretch overflow-hidden rounded-xl border border-white/8 bg-[#0b1220]">
              {pathPrefix && <span className="flex items-center border-r border-white/8 px-3 text-sm text-slate-500 select-none">{pathPrefix}/</span>}
              {!pathPrefix && <span className="flex items-center border-r border-white/8 px-3 text-sm text-slate-500 select-none">/</span>}
              <input value={form.subPath} onChange={(e) => setForm({ ...form, subPath: e.target.value })} placeholder={pathPrefix ? "子路径（如 menus）" : "路径（如 system/menus）"} className="flex-1 bg-transparent px-3 py-2.5 text-sm text-slate-100 outline-none" />
            </div>
          )}
          <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value as RouteType })} className="w-full rounded-xl border border-white/8 bg-[#0b1220] px-3 py-2.5 text-sm text-slate-100 outline-none">
            <option value="page">自定义页面</option><option value="link">外部链接</option><option value="iframe">iframe 嵌入</option>
          </select>
          <input value={form.iconName} onChange={(e) => setForm({ ...form, iconName: e.target.value })} placeholder="Lucide 图标名（可选）" className="w-full rounded-xl border border-white/8 bg-[#0b1220] px-3 py-2.5 text-sm text-slate-100 outline-none" />
        </div>
        <div className="mt-5 flex justify-end gap-2">
          <button type="button" onClick={onClose} className="rounded-xl border border-white/8 bg-[#101b2d] px-4 py-2 text-sm text-slate-200">取消</button>
          <button type="button" onClick={handleCreate} className="rounded-xl bg-[#f68f4d] px-4 py-2 text-sm font-medium text-white">创建并关联</button>
        </div>
      </div>
    </div>
  )
}

export default function MenusManagerPage() {
  const [items, setItems] = useState<SidebarMenuItem[]>([])
  const [routes, setRoutes] = useState<RouteDefinition[]>([])
  const [newLabel, setNewLabel] = useState("")
  const [newIcon, setNewIcon] = useState("")
  const [newIconName, setNewIconName] = useState("")
  const [newVisible, setNewVisible] = useState(true)
  const [newPathPrefix, setNewPathPrefix] = useState("")
  const [jsonText, setJsonText] = useState("")
  const [showJson, setShowJson] = useState(false)
  const [statusText, setStatusText] = useState("")
  const [selectedPath, setSelectedPath] = useState<number[] | null>(null)
  const [expanded, setExpanded] = useState<Record<string, boolean>>({})
  const [propertySections, setPropertySections] = useState({ basics: true, display: true, access: true })
  const [showQuickCreate, setShowQuickCreate] = useState<{ pathPrefix?: string; onCreated: (r: RouteDefinition) => void } | null>(null)

  // 拖拽状态
  const dragSourceRef = useRef<number[] | null>(null)
  const [dragOver, setDragOver] = useState<{ path: number[]; position: "before" | "after" | "inside" } | null>(null)

  useEffect(() => {
    const load = () => { setItems(getStoredSidebarItems()); setRoutes(getStoredRoutes()) }
    load()
    window.addEventListener("vibe:sidebar-updated", load)
    window.addEventListener("vibe:routes-updated", load)
    return () => { window.removeEventListener("vibe:sidebar-updated", load); window.removeEventListener("vibe:routes-updated", load) }
  }, [])

  const exportJson = useMemo(() => JSON.stringify(items, null, 2), [items])

  const persist = (next: SidebarMenuItem[]) => { setItems(next); saveStoredSidebarItems(next) }
  const saveConfig = () => { persist(items); setStatusText("已保存菜单配置") }

  const applyMenuTemplate = (template: SidebarMenuItem[]) => {
    persist(template.map(i => ({ ...i, children: i.children?.map(c => ({ ...c })) })))
    setSelectedPath(template.length > 0 ? [0] : null); setStatusText(`已应用模板`)
  }

  const addItem = () => {
    const label = newLabel.trim(); if (!label) { setStatusText("菜单名称不能为空"); return }
    const prefix = newPathPrefix.trim()
    const next = [...items, { label, pathPrefix: prefix || undefined, icon: newIcon.trim() || undefined, iconName: newIconName.trim() || undefined, visible: newVisible }]
    persist(next); setNewLabel(""); setNewIcon(""); setNewIconName(""); setNewVisible(true); setNewPathPrefix(""); setStatusText("已添加菜单")
  }

  const addChildItem = (path: number[]) => {
    const label = newLabel.trim() || "新子菜单"
    let newPath: number[] | null = null
    setItems((prev) => {
      const next = JSON.parse(JSON.stringify(prev)) as SidebarMenuItem[]
      const target = getItemByPath(next, path)
      if (!target) return prev
      const childCount = target.children?.length ?? 0
      const newChild: SidebarMenuItem = { label, icon: newIcon.trim() || undefined, iconName: newIconName.trim() || undefined, visible: newVisible }
      target.children = [...(target.children ?? []), newChild]
      newPath = [...path, childCount]
      saveStoredSidebarItems(next)
      return next
    })
    setNewLabel(""); setNewIcon(""); setNewIconName(""); setNewVisible(true)
    if (newPath) {
      const parentKey = path.join(".")
      setExpanded(prev => ({ ...prev, [parentKey]: true }))
      setSelectedPath(newPath)
    }
    setStatusText("已添加子菜单")
  }

  const updateItem = (path: number[], patch: Partial<SidebarMenuItem>) => {
    setItems((prev) => {
      const next = JSON.parse(JSON.stringify(prev)) as SidebarMenuItem[]; const ref = getParentAndIndex(next, path)
      if (!ref || ref.index < 0) return prev
      ref.parent[ref.index] = { ...ref.parent[ref.index], ...patch }; saveStoredSidebarItems(next); return next
    })
  }

  const removeItem = (path: number[]) => {
    setItems((prev) => { const next = JSON.parse(JSON.stringify(prev)) as SidebarMenuItem[]; const ref = getParentAndIndex(next, path); if (!ref || ref.index < 0) return prev; ref.parent.splice(ref.index, 1); saveStoredSidebarItems(next); return next })
    setStatusText("已删除菜单项")
  }

  const importJson = () => {
    try { const parsed = JSON.parse(jsonText) as SidebarMenuItem[]; if (!Array.isArray(parsed) || parsed.some(i => !i.label)) throw new Error("格式错误"); persist(parsed); setStatusText("导入成功") }
    catch { setStatusText("导入失败：JSON 格式错误") }
  }
  const handleReset = () => { persist(DEFAULT_SIDEBAR_ITEMS); setStatusText("已恢复默认菜单配置") }
  const copyExport = async () => { try { await navigator.clipboard.writeText(exportJson); setStatusText("已复制 JSON") } catch { setStatusText("复制失败") } }

  const flattenTreeKeys = (nodes: SidebarMenuItem[], path: number[] = []): string[] => nodes.flatMap((item, idx) => { const cur = [...path, idx]; const key = cur.join("."); return [key, ...(item.children?.length ? flattenTreeKeys(item.children, cur) : [])] })
  const toggleNode = (path: number[]) => { const key = path.join("."); setExpanded(prev => ({ ...prev, [key]: !(prev[key] ?? true) })) }
  const expandAll = () => setExpanded(Object.fromEntries(flattenTreeKeys(items).map(k => [k, true])))
  const collapseAll = () => setExpanded(Object.fromEntries(flattenTreeKeys(items).map(k => [k, false])))

  // 检查路径是否是源路径的祖先（防止拖入自己的子节点）
  const isAncestor = (ancestor: number[], descendant: number[]): boolean => {
    if (ancestor.length >= descendant.length) return false
    return ancestor.every((v, i) => descendant[i] === v)
  }

  // 拖拽移动节点：支持 before/after/inside 三种位置
  const moveNode = (sourcePath: number[], targetPath: number[], position: "before" | "after" | "inside") => {
    setItems((prev) => {
      const next = JSON.parse(JSON.stringify(prev)) as SidebarMenuItem[]
      const sp = getParentAndIndex(next, sourcePath)
      if (!sp || sp.index < 0) return prev
      // 防止拖入自己或自己的子节点
      if (sourcePath.join(".") === targetPath.join(".") || isAncestor(sourcePath, targetPath)) return prev
      const [moved] = sp.parent.splice(sp.index, 1)

      // 重新计算 targetPath（因为源节点移除后，索引可能变化）
      const adjustedTarget = [...targetPath]
      if (sp.parent === getParentAndIndex(next, [])?.parent) {
        // 同级，且源在目标之前，目标索引需要减1
        if (sourcePath.length === targetPath.length && sourcePath.length === 1) {
          const sIdx = sourcePath[0], tIdx = targetPath[0]
          if (sIdx < tIdx) adjustedTarget[0] = tIdx - 1
        }
      } else {
        // 需要更通用的调整：比较公共父级路径
        const commonLen = sourcePath.length - 1
        const targetParent = targetPath.slice(0, -1)
        const sourceParent = sourcePath.slice(0, -1)
        if (targetParent.join(".") === sourceParent.join(".")) {
          const sIdx = sourcePath[sourcePath.length - 1]
          const tIdx = targetPath[targetPath.length - 1]
          if (sIdx < tIdx) adjustedTarget[adjustedTarget.length - 1] = tIdx - 1
        }
      }

      if (position === "inside") {
        const targetNode = getItemByPath(next, adjustedTarget)
        if (!targetNode) return prev
        targetNode.children = targetNode.children ?? []
        targetNode.children.push(moved)
      } else {
        const tp = getParentAndIndex(next, adjustedTarget)
        if (!tp || tp.index < 0) return prev
        const insertIdx = position === "before" ? tp.index : tp.index + 1
        tp.parent.splice(insertIdx, 0, moved)
      }

      saveStoredSidebarItems(next)
      return next
    })
  }

  // 拖拽事件处理
  const handleDragStart = (path: number[]) => (e: React.DragEvent) => {
    dragSourceRef.current = path
    e.dataTransfer.effectAllowed = "move"
    e.dataTransfer.setData("text/plain", path.join("."))
  }

  const handleDragOver = (path: number[]) => (e: React.DragEvent) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = "move"
    const source = dragSourceRef.current
    if (!source) return

    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
    const y = e.clientY - rect.top
    const h = rect.height
    let position: "before" | "after" | "inside"

    if (y < h * 0.25) {
      position = "before"
    } else if (y > h * 0.75) {
      position = "after"
    } else {
      position = "inside"
    }

    // 不能拖入自己或子节点
    if (source.join(".") === path.join(".") || isAncestor(source, path)) {
      position = "after" // 自动调整为放到后面
    }

    setDragOver({ path, position })
  }

  const handleDragLeave = () => {
    // 延迟清除，避免在子元素间移动时闪烁
  }

  const handleDrop = (path: number[]) => (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    const source = dragSourceRef.current
    if (!source || !dragOver) {
      dragSourceRef.current = null
      setDragOver(null)
      return
    }
    // 确认拖拽到正确的目标
    if (dragOver.path.join(".") === path.join(".")) {
      moveNode(source, path, dragOver.position)
    }
    dragSourceRef.current = null
    setDragOver(null)
  }

  const handleDragEnd = () => {
    dragSourceRef.current = null
    setDragOver(null)
  }

  const getRouteById = (id: string) => routes.find(r => r.id === id)

  const renderTree = (nodes: SidebarMenuItem[], path: number[] = [], isRoot = false) => nodes.map((item, index) => {
    const cur = [...path, index]; const key = cur.join("."); const hasChildren = !!item.children?.length; const isExpanded = expanded[key] !== false; const isSelected = selectedPath?.join(".") === key
    const route = item.routeId ? getRouteById(item.routeId) : null
    const isDragging = dragSourceRef.current?.join(".") === key
    const isDragOver = dragOver?.path.join(".") === key
    const dragPos = isDragOver ? dragOver!.position : null

    return (
      <div key={key} className="space-y-1 relative">
        {/* 上方放置指示线 */}
        {dragPos === "before" && <div className="absolute -top-1 left-0 right-0 h-0.5 bg-[#f68f4d] rounded-full z-10" />}
        <div
          draggable
          onDragStart={handleDragStart(cur)}
          onDragOver={handleDragOver(cur)}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop(cur)}
          onDragEnd={handleDragEnd}
          className={`
            flex items-center gap-2 rounded-xl border px-2 py-2 transition-all cursor-grab active:cursor-grabbing
            ${isSelected ? "border-[#f68f4d]/60 bg-[#121d32]" : "border-white/8 bg-[#0b1220] hover:border-white/12"}
            ${isDragging ? "opacity-40" : ""}
            ${dragPos === "inside" ? "border-[#f68f4d] bg-[#f68f4d]/10 ring-2 ring-[#f68f4d]/30" : ""}
          `}>
          <span className="text-slate-500 cursor-grab active:cursor-grabbing select-none">
            <LucideIcons.GripVertical className="h-4 w-4" />
          </span>
          <button type="button" onClick={() => hasChildren && toggleNode(cur)} className="flex h-6 w-6 items-center justify-center rounded-md border border-white/8 bg-[#101b2d] text-xs text-slate-200 shrink-0">{hasChildren ? (isExpanded ? "▾" : "▸") : "•"}</button>
          <button type="button" onClick={() => setSelectedPath(cur)} className="flex flex-1 items-center gap-2 overflow-hidden text-left min-w-0">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#111d2d] text-[#ffb476] shrink-0">{renderLucidePreview(item.iconName || route?.iconName) || item.icon || "◌"}</span>
            <span className="min-w-0 flex-1">
              <span className={`block truncate text-sm font-medium ${item.visible === false ? "text-slate-500 line-through" : "text-slate-100"}`}>{item.label}</span>
              <span className="block text-[10px] uppercase tracking-wide text-slate-500 truncate">{route ? route.path : item.pathPrefix || "未绑定路由"}</span>
            </span>
          </button>
          <button type="button" onClick={(e) => { e.stopPropagation(); addChildItem(cur) }} className="rounded-md border border-white/8 bg-[#101b2d] px-2 py-1 text-[10px] text-slate-200 shrink-0 hover:border-[#f68f4d]/40 hover:text-[#ffb476]">+</button>
        </div>
        {/* 下方放置指示线 */}
        {dragPos === "after" && <div className="absolute -bottom-1 left-0 right-0 h-0.5 bg-[#f68f4d] rounded-full z-10" />}
        {hasChildren && isExpanded ? <div className="ml-5 border-l border-white/8 pl-2 space-y-1">{renderTree(item.children ?? [], cur)}</div> : null}
      </div>
    )
  })

  const selectedItem = selectedPath ? getItemByPath(items, selectedPath) : undefined
  const selectedItemRoute = selectedItem?.routeId ? getRouteById(selectedItem.routeId) : null
  const selectedIsTopLevel = selectedPath ? isTopLevelMenu(selectedPath) : false
  const selectedGroupPrefix = selectedPath ? getGroupPathPrefix(items, selectedPath) : undefined
  const toggleSection = (key: string) => setPropertySections(prev => ({ ...prev, [key]: !(prev as any)[key] }))
  const PropertySection = ({ title, keyName, children }: { title: string; keyName: string; children: React.ReactNode }) => (
    <div className="rounded-2xl border border-white/8 bg-[#091321] p-3">
      <button type="button" onClick={() => toggleSection(keyName)} className="flex w-full items-center justify-between text-left text-sm font-medium text-white"><span>{title}</span><span className="text-[10px] uppercase tracking-[0.14em] text-slate-400">{(propertySections as any)[keyName] !== false ? "收起" : "展开"}</span></button>
      {(propertySections as any)[keyName] !== false ? <div className="mt-3">{children}</div> : null}
    </div>
  )

  return (
    <SystemShell>
      <div className="space-y-5">
        <div className="rounded-2xl border border-white/8 bg-[#0d1628] p-4">
          <div className="mb-3 flex items-center justify-between">
            <div className="text-base font-medium text-white">新增菜单</div>
            <div className="flex gap-2">
              <div className="flex gap-2 text-[11px] text-slate-400">
                <span className="rounded-full border border-white/8 px-2 py-1">{items.length} 组</span>
                <span className="rounded-full border border-white/8 px-2 py-1">{routes.length} 路由</span>
              </div>
              <button type="button" onClick={saveConfig} className="rounded-lg bg-[#f68f4d] px-2.5 py-1.5 text-[11px] font-medium text-white">保存配置</button>
            </div>
          </div>
            <div className="mb-3 flex flex-wrap gap-2">{MENU_TEMPLATES.map(t => (<button key={t.id} type="button" onClick={() => applyMenuTemplate(t.items)} className="rounded-lg border border-white/8 bg-[#101b2d] px-2.5 py-1.5 text-[11px] text-slate-200">{t.label}</button>))}</div>
            <div className="grid gap-3 md:grid-cols-[1fr_1fr_auto]">
              <input value={newLabel} onChange={e => setNewLabel(e.target.value)} placeholder="菜单名称（如 系统、项目）" className="rounded-xl border border-white/8 bg-[#0b1220] px-3 py-2.5 text-sm text-slate-100 outline-none" />
              <input value={newPathPrefix} onChange={e => setNewPathPrefix(e.target.value)} placeholder="路径前缀（如 /system、/projects）" className="rounded-xl border border-white/8 bg-[#0b1220] px-3 py-2.5 text-sm text-slate-100 outline-none" />
              <button type="button" onClick={addItem} className="rounded-xl bg-[#f68f4d] px-4 py-2.5 text-sm font-medium text-white">添加菜单</button>
            </div>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <label className="inline-flex items-center gap-2 rounded-xl border border-white/8 bg-[#0b1220] px-3 py-2 text-xs text-slate-200"><input type="checkbox" checked={newVisible} onChange={e => setNewVisible(e.target.checked)} className="h-3.5 w-3.5" />可见</label>
              <span className="text-xs text-slate-500">提示：选中菜单树中的节点后点击 + 可添加子菜单，选中节点后在右侧面板绑定路由和配置权限</span>
            </div>
            <div className="mt-3 space-y-3">
              <div className="flex flex-wrap items-center gap-2">
                <input value={newIconName} onChange={e => setNewIconName(e.target.value)} placeholder="Lucide icon" className="w-36 rounded-xl border border-white/8 bg-[#0b1220] px-3 py-2 text-sm text-slate-100 outline-none" />
                <input value={newIcon} onChange={e => setNewIcon(e.target.value)} placeholder="emoji" className="w-24 rounded-xl border border-white/8 bg-[#0b1220] px-3 py-2 text-sm text-slate-100 outline-none" />
              </div>
              <div className="max-h-48 overflow-y-auto rounded-xl border border-white/8 bg-[#0b1220] p-2">
                <div className="grid grid-cols-8 gap-1.5 sm:grid-cols-10 md:grid-cols-12">{LUCIDE_ICON_OPTIONS.map(n => {
                  const Icon = ICON_MAP[n]
                  const act = newIconName === n
                  return (
                    <button key={n} type="button" title={n} onClick={() => setNewIconName(n)} className={`flex h-8 w-8 items-center justify-center rounded-lg border transition ${act ? "border-[#f68f4d] bg-[#f68f4d]/15 text-[#ffb476]" : "border-white/8 bg-[#101b2d] text-slate-300 hover:border-[#f68f4d]/40 hover:text-[#ffb476]"}`}>
                      {Icon ? <Icon className="h-4 w-4" /> : n[0]}
                    </button>
                  )
                })}</div>
              </div>
            </div>
          </div>

        <div className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
          <div className="rounded-2xl border border-white/8 bg-[#0d1628] p-4">
            <div className="mb-4 flex items-center justify-between">
              <div className="text-base font-medium text-white">菜单树</div>
              <div className="flex gap-2">
                <button type="button" onClick={expandAll} className="rounded-lg border border-white/8 bg-[#101b2d] px-2.5 py-1.5 text-[11px] text-slate-200">展开全部</button>
                <button type="button" onClick={collapseAll} className="rounded-lg border border-white/8 bg-[#101b2d] px-2.5 py-1.5 text-[11px] text-slate-200">收起全部</button>
              </div>
            </div>
            <div className="mb-3 flex flex-wrap gap-2">
              <button type="button" onClick={saveConfig} className="rounded-lg bg-[#f68f4d] px-2.5 py-1.5 text-[11px] font-medium text-white">保存配置</button>
              <button type="button" onClick={handleReset} className="rounded-lg border border-white/8 bg-[#101b2d] px-2.5 py-1.5 text-[11px] text-slate-200">重置默认</button>
              <button type="button" onClick={copyExport} className="rounded-lg border border-white/8 bg-[#101b2d] px-2.5 py-1.5 text-[11px] text-slate-200">复制 JSON</button>
              <Link href="/system/routes" className="rounded-lg border border-[#5ea2ff]/40 bg-[#5ea2ff]/10 px-2.5 py-1.5 text-[11px] text-blue-200">管理路由 →</Link>
            </div>
            <div className="space-y-3">{renderTree(items)}</div>
          </div>

          <div className="rounded-2xl border border-white/8 bg-[#0d1628] p-4">
            {selectedItem ? (
              <div className="space-y-4">
                <div className="flex items-center justify-between gap-3 rounded-2xl border border-white/8 bg-[#091321] p-3">
                  <div className="flex items-center gap-3">
                    <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#121d32] text-[#ffb476]">{renderLucidePreview(selectedItem.iconName || selectedItemRoute?.iconName, "h-5 w-5") || selectedItem.icon || "◌"}</span>
                    <div><div className="text-sm text-slate-400">当前节点</div><div className="text-lg font-medium text-white">{selectedItem.label}</div></div>
                  </div>
                  <div className="flex gap-2">
                    <button type="button" onClick={() => selectedPath && addChildItem(selectedPath)} className="rounded-lg border border-white/8 bg-[#101b2d] px-2.5 py-1.5 text-xs text-slate-200">+ 子菜单</button>
                    <button type="button" onClick={() => selectedPath && removeItem(selectedPath)} className="rounded-lg border border-rose-500/50 bg-rose-500/10 px-2.5 py-1.5 text-xs text-rose-200">删除</button>
                  </div>
                </div>

                <PropertySection title="基础信息" keyName="basics">
                  <div className="grid gap-3">
                    <label className="space-y-1.5"><span className="text-[11px] uppercase tracking-[0.14em] text-slate-400">标题</span><input value={selectedItem.label} onChange={e => selectedPath && updateItem(selectedPath, { label: e.target.value })} className="w-full rounded-xl border border-white/8 bg-[#0b1220] px-3 py-2.5 text-sm text-slate-100 outline-none" /></label>
                    {selectedIsTopLevel && (
                      <label className="space-y-1.5">
                        <span className="text-[11px] uppercase tracking-[0.14em] text-slate-400">路径前缀</span>
                        <input value={selectedItem.pathPrefix ?? ""} onChange={e => selectedPath && updateItem(selectedPath, { pathPrefix: e.target.value || undefined })} placeholder="如 /system、/projects" className="w-full rounded-xl border border-white/8 bg-[#0b1220] px-3 py-2.5 text-sm text-slate-100 outline-none" />
                        <span className="text-[11px] text-slate-500">该分组下所有子菜单的路由将自动此前缀开头</span>
                      </label>
                    )}
                  </div>
                </PropertySection>

                {!selectedIsTopLevel && (
                  <PropertySection title="路由绑定" keyName="route">
                    <div className="space-y-3">
                      <label className="space-y-1.5 block">
                        <span className="text-[11px] uppercase tracking-[0.14em] text-slate-400">关联路由</span>
                        <div className="flex gap-2">
                          <select value={selectedItem.routeId ?? ""} onChange={e => selectedPath && updateItem(selectedPath, { routeId: e.target.value || undefined, path: undefined })} className="flex-1 rounded-xl border border-white/8 bg-[#0b1220] px-3 py-2.5 text-sm text-slate-100 outline-none">
                            <option value="">-- 不绑定 --</option>
                            {routes
                              .filter(r => r.type === "link" || !selectedGroupPrefix || r.path.startsWith(selectedGroupPrefix + "/") || r.path === selectedGroupPrefix)
                              .map(r => (<option key={r.id} value={r.id}>{r.title} → {r.path}</option>))}
                          </select>
                          <button type="button" onClick={() => setShowQuickCreate({ pathPrefix: selectedGroupPrefix, onCreated: (r) => { selectedPath && updateItem(selectedPath, { routeId: r.id }); setRoutes(getStoredRoutes()) } })} className="rounded-xl border border-[#f68f4d]/40 bg-[#f68f4d]/10 px-3 py-2 text-xs text-[#ffb476]">+ 新建</button>
                        </div>
                      </label>
                      {selectedItemRoute && (
                        <div className="rounded-xl border border-white/8 bg-[#0b1220] p-3 text-xs text-slate-300">
                          <div className="flex items-center justify-between">
                            <span>路径：<code className="text-slate-200">{selectedItemRoute.path}</code></span>
                            <Link href={selectedItemRoute.type === "link" ? (selectedItemRoute.url || selectedItemRoute.path) : selectedItemRoute.path} target={selectedItemRoute.target === "_blank" ? "_blank" : undefined} className="text-[#f68f4d] hover:underline">预览 →</Link>
                          </div>
                          <div className="mt-1 text-slate-500">类型：{selectedItemRoute.type}{selectedItemRoute.builtin ? " · 内置" : ""}</div>
                        </div>
                      )}
                      {selectedGroupPrefix && !selectedItemRoute && (
                        <div className="rounded-xl border border-white/8 bg-[#0b1220] p-3 text-[11px] text-slate-500">
                          当前分组路径前缀：<code className="text-slate-400">{selectedGroupPrefix}</code>，子菜单路由将自动以该前缀开头。
                        </div>
                      )}
                      <div className="text-[11px] text-slate-500">提示：菜单绑定路由后，路径将从路由表读取，修改路由路径会自动同步到所有引用该路由的菜单项。</div>
                    </div>
                  </PropertySection>
                )}

                {selectedIsTopLevel && (
                  <div className="rounded-xl border border-[#f68f4d]/20 bg-[#f68f4d]/5 p-3">
                    <div className="flex items-start gap-2">
                      <LucideIcons.Folder className="mt-0.5 h-4 w-4 shrink-0 text-[#f68f4d]" />
                      <div className="text-xs text-slate-400 leading-relaxed">
                        <p className="mb-1 text-slate-300">这是一个一级菜单</p>
                        <p>一级菜单不绑定具体路由，用于对子菜单进行归类。子菜单的路由将自动以"路径前缀"开头。</p>
                      </div>
                    </div>
                  </div>
                )}

                <PropertySection title="显示设置" keyName="display">
                  <div className="grid gap-3 md:grid-cols-2">
                    <label className="space-y-1.5"><span className="text-[11px] uppercase tracking-[0.14em] text-slate-400">Lucide 图标</span><input value={selectedItem.iconName ?? ""} onChange={e => selectedPath && updateItem(selectedPath, { iconName: e.target.value || undefined })} className="w-full rounded-xl border border-white/8 bg-[#0b1220] px-3 py-2.5 text-sm text-slate-100 outline-none" /></label>
                    <label className="space-y-1.5"><span className="text-[11px] uppercase tracking-[0.14em] text-slate-400">emoji</span><input value={selectedItem.icon ?? ""} onChange={e => selectedPath && updateItem(selectedPath, { icon: e.target.value || undefined })} className="w-full rounded-xl border border-white/8 bg-[#0b1220] px-3 py-2.5 text-sm text-slate-100 outline-none" /></label>
                  </div>
                </PropertySection>

                <PropertySection title="访问控制" keyName="access">
                  <div className="space-y-3">
                    <label className="flex items-center justify-between gap-3 rounded-xl border border-white/8 bg-[#0b1220] px-3 py-2.5 text-sm text-slate-200">
                      <span>在侧边栏中可见</span>
                      <input type="checkbox" checked={selectedItem.visible !== false} onChange={e => selectedPath && updateItem(selectedPath, { visible: e.target.checked })} className="h-4 w-4" />
                    </label>
                    <div className="rounded-xl border border-white/8 bg-[#0b1220] p-3">
                      <div className="flex items-start gap-2">
                        <LucideIcons.Info className="mt-0.5 h-4 w-4 shrink-0 text-[#f68f4d]" />
                        <div className="text-xs text-slate-400 leading-relaxed">
                          <p className="mb-1">菜单的访问权限由角色权限系统统一控制。</p>
                          <p>请前往 <Link href="/system/permissions" className="text-[#ffb476] hover:underline">系统管理 → 权限管理</Link> 配置角色的菜单访问权限。</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </PropertySection>
              </div>
            ) : (
              <div className="flex h-full min-h-[240px] items-center justify-center rounded-2xl border border-dashed border-white/10 bg-[#091321] p-6 text-center text-sm text-slate-400">选择左侧菜单节点后，属性编辑器会在这里显示。</div>
            )}
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
          <div className="rounded-2xl border border-white/8 bg-[#0d1628] p-4">
            <div className="mb-3 text-base font-medium text-white">导出与导入</div>
            <div className="space-y-3">
              <button type="button" onClick={copyExport} className="w-full rounded-xl border border-white/8 bg-[#101b2d] px-3 py-2 text-sm text-slate-100">复制 JSON</button>
              <textarea value={jsonText} onChange={e => setJsonText(e.target.value)} placeholder="粘贴 JSON 进行导入" className="min-h-[140px] w-full rounded-xl border border-white/8 bg-[#0b1220] p-3 text-sm text-slate-100 outline-none" />
              <button type="button" onClick={importJson} className="w-full rounded-xl bg-[#f68f4d] px-3 py-2 text-sm font-medium text-white">导入 JSON</button>
              <div className="rounded-xl border border-white/8 bg-[#091321] p-3 text-xs text-slate-300">{statusText || "配置会自动保存到本地存储。"}</div>
            </div>
          </div>
          <div className="rounded-2xl border border-white/8 bg-[#0d1628] p-4">
            <button type="button" onClick={() => setShowJson(v => !v)} className="mb-3 flex w-full items-center justify-between text-left text-base font-medium text-white"><span>当前 JSON</span><span className="text-xs text-slate-400">{showJson ? "收起" : "展开"}</span></button>
            {showJson ? <pre className="overflow-x-auto rounded-xl bg-[#091321] p-3 text-xs text-slate-300">{exportJson}</pre> : null}
          </div>
        </div>
      </div>

      {showQuickCreate && <QuickCreateRouteModal pathPrefix={showQuickCreate.pathPrefix} onClose={() => setShowQuickCreate(null)} onCreated={(r) => { const cb = showQuickCreate.onCreated; setShowQuickCreate(null); cb(r) }} />}
    </SystemShell>
  )
}
