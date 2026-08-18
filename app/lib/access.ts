import type { SidebarMenuItem } from "./sidebar-menu"

export function normalizeRoles(input?: string | string[]): string[] {
  const list = Array.isArray(input) ? input : input ? [input] : []
  return [...new Set(list.map((value) => value.trim().toLowerCase()).filter(Boolean))]
}

export function canAccess(requiredRoles?: string[], userRoles?: string[]) {
  const required = normalizeRoles(requiredRoles)
  const user = normalizeRoles(userRoles)

  if (!required.length) {
    return true
  }

  return required.some((role) => user.includes(role))
}

export function filterSidebarItemsByRoles(items: SidebarMenuItem[] = [], userRoles?: string[]): SidebarMenuItem[] {
  const normalizedUserRoles = normalizeRoles(userRoles)

  return items
    .filter((item) => item.visible !== false && canAccess(item.roles, normalizedUserRoles))
    .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0))
    .map((item) => {
      const filteredChildren = item.children ? filterSidebarItemsByRoles(item.children, normalizedUserRoles) : undefined
      return {
        ...item,
        children: filteredChildren && filteredChildren.length > 0 ? filteredChildren : undefined,
      }
    })
}
