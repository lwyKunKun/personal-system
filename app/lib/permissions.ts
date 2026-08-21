import { getStoredRoutes, type RouteDefinition } from "./routes"
import { getStoredSidebarItems, resolveMenuPath, type SidebarMenuItem } from "./sidebar-menu"

export interface PermissionNode {
  id: string
  name: string
  type: "group" | "menu" | "button"
  routeId?: string
  children?: PermissionNode[]
}

export function menuPermissionId(routeId: string): string {
  return `menu:${routeId}`
}

export function buttonPermissionId(routeId: string, key: string): string {
  return `btn:${routeId}:${key}`
}

export function buildPermissionTree(): PermissionNode[] {
  const menus = getStoredSidebarItems()
  const routes = getStoredRoutes()
  const routeMap = new Map(routes.map((r) => [r.id, r]))

  function buildMenuNode(item: SidebarMenuItem): PermissionNode | null {
    const resolved = resolveMenuPath(item, routes)
    const route = resolved.route
    if (!route) {
      if (item.children && item.children.length > 0) {
        const children = item.children.map(buildMenuNode).filter(Boolean) as PermissionNode[]
        if (children.length === 0) return null
        return { id: item.id || item.label, name: item.label, type: "group", children }
      }
      return null
    }

    const node: PermissionNode = {
      id: menuPermissionId(route.id),
      name: item.label || route.title,
      type: "menu",
      routeId: route.id,
    }

    const buttonNodes: PermissionNode[] = []
    if (route.buttons && route.buttons.length > 0) {
      for (const btn of route.buttons) {
        buttonNodes.push({
          id: buttonPermissionId(route.id, btn.key),
          name: btn.name,
          type: "button",
          routeId: route.id,
        })
      }
    }

    if (item.children) {
      const childNodes = item.children.map(buildMenuNode).filter(Boolean) as PermissionNode[]
      const allChildren = [...buttonNodes, ...childNodes]
      if (allChildren.length > 0) node.children = allChildren
    } else if (buttonNodes.length > 0) {
      node.children = buttonNodes
    }

    return node
  }

  const tree: PermissionNode[] = []
  for (const group of menus) {
    if (group.visible === false) continue
    const childNodes = (group.children || []).map(buildMenuNode).filter(Boolean) as PermissionNode[]
    if (childNodes.length === 0) continue
    tree.push({
      id: group.id || group.label,
      name: group.label,
      type: "group",
      children: childNodes,
    })
  }
  return tree
}

export function getAllPermissionIds(): string[] {
  const ids: string[] = []
  const walk = (nodes: PermissionNode[]) => {
    for (const n of nodes) {
      if (n.type !== "group") ids.push(n.id)
      if (n.children) walk(n.children)
    }
  }
  walk(buildPermissionTree())
  return ids
}

export function filterMenuTreeByPermissions(
  menus: SidebarMenuItem[],
  permissionIds: Set<string>,
): SidebarMenuItem[] {
  function filterItem(item: SidebarMenuItem): SidebarMenuItem | null {
    const resolved = resolveMenuPath(item)
    const route = resolved.route

    if (item.children && item.children.length > 0) {
      const filteredChildren = item.children.map(filterItem).filter(Boolean) as SidebarMenuItem[]
      if (filteredChildren.length === 0) {
        // 没有可见子菜单：如果有路由绑定则检查自身权限，没有路由（纯分组头）则直接隐藏
        if (route) {
          const permId = menuPermissionId(route.id)
          if (!permissionIds.has(permId)) return null
          return { ...item, children: undefined }
        }
        // 无路由且无可见子项 → 隐藏该分组
        return null
      }
      return { ...item, children: filteredChildren }
    }

    if (route) {
      const permId = menuPermissionId(route.id)
      if (!permissionIds.has(permId)) return null
    }

    return { ...item }
  }

  return menus.map(filterItem).filter(Boolean) as SidebarMenuItem[]
}

export function getPermissionDescription(id: string, routes: RouteDefinition[] = getStoredRoutes()): string {
  if (id.startsWith("menu:")) {
    const routeId = id.slice(5)
    const route = routes.find((r) => r.id === routeId)
    return route ? `菜单：${route.title}` : id
  }
  if (id.startsWith("btn:")) {
    const parts = id.slice(4).split(":")
    const routeId = parts[0]
    const btnKey = parts.slice(1).join(":")
    const route = routes.find((r) => r.id === routeId)
    const btn = route?.buttons?.find((b) => b.key === btnKey)
    return btn ? `按钮：${route?.title} - ${btn.name}` : id
  }
  return id
}

/**
 * 检查当前用户是否有权限访问指定路径
 * @param path 当前路径
 * @param permissionIds 用户拥有的权限ID集合
 * @param isAdmin 是否管理员（admin直接放行）
 */
export function hasRoutePermission(path: string, permissionIds: Set<string>, isAdmin: boolean): boolean {
  if (isAdmin) return true
  // 首页不需要权限
  if (path === "/" || path === "") return true
  const routes = getStoredRoutes()
  const route = routes.find((r) => r.path === path)
  if (!route) return true // 未注册到路由表的页面不拦截
  if (route.builtin && route.id === "home") return true
  const permId = menuPermissionId(route.id)
  return permissionIds.has(permId)
}
