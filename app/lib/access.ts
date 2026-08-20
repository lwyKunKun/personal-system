import type { SidebarMenuItem } from "./sidebar-menu"
import { getStoredRoles } from "./roles"
import { menuPermissionId, buttonPermissionId, filterMenuTreeByPermissions, getAllPermissionIds } from "./permissions"
import { getCurrentUserProfile } from "./user"

export function normalizeRoles(input?: string | string[]): string[] {
  const list = Array.isArray(input) ? input : input ? [input] : []
  return [...new Set(list.map((value) => value.trim().toLowerCase()).filter(Boolean))]
}

export function canAccess(requiredRoles?: string[], userRoles?: string[]) {
  const required = normalizeRoles(requiredRoles)
  const user = normalizeRoles(userRoles)
  if (!required.length) return true
  return required.some((role) => user.includes(role))
}

export function getCurrentUserPermissionIds(): Set<string> {
  const profile = getCurrentUserProfile()
  return getUserPermissionIds(profile.roles)
}

export function getUserPermissionIds(userRoleCodes: string[]): Set<string> {
  if (userRoleCodes.includes("admin")) {
    return new Set(getAllPermissionIds())
  }
  const roles = getStoredRoles()
  const ids = new Set<string>()
  for (const role of roles) {
    if (userRoleCodes.includes(role.code)) {
      for (const pid of role.permissions) {
        ids.add(pid)
      }
    }
  }
  return ids
}

export function hasMenuPermission(routeId: string, permissionIds?: Set<string>): boolean {
  const perms = permissionIds ?? getCurrentUserPermissionIds()
  return perms.has(menuPermissionId(routeId))
}

export function hasButtonPermission(routeId: string, btnKey: string, permissionIds?: Set<string>): boolean {
  const perms = permissionIds ?? getCurrentUserPermissionIds()
  return perms.has(buttonPermissionId(routeId, btnKey))
}

export function filterSidebarItemsByPermissions(
  items: SidebarMenuItem[],
  userRoleCodes?: string[],
): SidebarMenuItem[] {
  const roles = userRoleCodes ?? getCurrentUserProfile().roles
  const permissionIds = getUserPermissionIds(roles)
  if (roles.includes("admin")) return items
  return filterMenuTreeByPermissions(items, permissionIds)
}

export function filterSidebarItemsByRoles(items: SidebarMenuItem[] = [], userRoles?: string[]): SidebarMenuItem[] {
  return filterSidebarItemsByPermissions(items, userRoles)
}
