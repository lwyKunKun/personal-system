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
      if (filteredChildren.length === 0 && route) {
        const permId = menuPermissionId(route.id)
        if (!permissionIds.has(permId)) return null
      }
      return { ...item, children: filteredChildren.length > 0 ? filteredChildren : undefined }
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
