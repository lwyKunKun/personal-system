import { getAllPermissionIds } from "./permissions"

export interface Role {
  id: string
  name: string
  code: string
  description?: string
  permissions: string[]
  isSystem?: boolean
  createdAt: number
  updatedAt: number
}

const ROLES_STORAGE_KEY = "vibe:roles"
const ROLES_VERSION = 1

function generateId() {
  return "role_" + Math.random().toString(36).slice(2, 10)
}

function getDefaultRoles(): Role[] {
  const now = Date.now()
  return [
    {
      id: "role_admin",
      name: "管理员",
      code: "admin",
      description: "拥有系统全部权限",
      permissions: [],
      isSystem: true,
      createdAt: now,
      updatedAt: now,
    },
    {
      id: "role_user",
      name: "普通用户",
      code: "user",
      description: "可访问项目和个人功能，无系统管理权限",
      permissions: [],
      isSystem: true,
      createdAt: now,
      updatedAt: now,
    },
  ]
}

function applyDefaultPermissions(roles: Role[]): Role[] {
  return roles.map((role) => {
    if (role.code === "admin") {
      return role
    }
    if (role.code === "user" && role.isSystem) {
      // 系统内置普通用户：每次确保不包含系统管理权限
      const allIds = getAllPermissionIds()
      const nonSystemPerms = allIds.filter((p) => {
        if (p.startsWith("menu:system-") || p.startsWith("btn:system-")) return false
        return true
      })
      // 如果当前权限为空或包含了系统权限，则重置为正确的默认权限
      const hasSystemPerm = role.permissions.some((p) => p.startsWith("menu:system-") || p.startsWith("btn:system-"))
      if (role.permissions.length === 0 || hasSystemPerm) {
        return { ...role, permissions: nonSystemPerms }
      }
    }
    return role
  })
}

export function getStoredRoles(): Role[] {
  if (typeof window === "undefined") return getDefaultRoles()
  try {
    const raw = localStorage.getItem(ROLES_STORAGE_KEY)
    let data: Role[]
    if (!raw) {
      const defaults = getDefaultRoles()
      data = defaults
    } else {
      const parsed = JSON.parse(raw)
      if (parsed.version !== ROLES_VERSION || !Array.isArray(parsed.data)) {
        data = getDefaultRoles()
      } else {
        data = parsed.data
      }
      // 确保系统角色始终存在
      const defaults = getDefaultRoles()
      const existingCodes = new Set(data.map((r) => r.code))
      for (const def of defaults) {
        if (!existingCodes.has(def.code)) {
          data.push(def)
        }
      }
    }
    // 应用默认权限（如果普通用户权限为空则初始化）
    const initialized = applyDefaultPermissions(data)
    // 如果初始化后数据变化了，保存回去
    if (JSON.stringify(initialized) !== JSON.stringify(data)) {
      localStorage.setItem(ROLES_STORAGE_KEY, JSON.stringify({ version: ROLES_VERSION, data: initialized }))
      return initialized
    }
    return data
  } catch {
    return getDefaultRoles()
  }
}

export function saveRoles(roles: Role[]) {
  if (typeof window === "undefined") return
  localStorage.setItem(ROLES_STORAGE_KEY, JSON.stringify({ version: ROLES_VERSION, data: roles }))
  window.dispatchEvent(new CustomEvent("vibe:roles-updated"))
}

export function createRole(data: Partial<Role>): Role {
  const roles = getStoredRoles()
  const now = Date.now()
  const newRole: Role = {
    id: generateId(),
    name: data.name || "新角色",
    code: (data.code || "new_role").toLowerCase().replace(/\s+/g, "_"),
    description: data.description || "",
    permissions: data.permissions || [],
    isSystem: false,
    createdAt: now,
    updatedAt: now,
  }
  saveRoles([...roles, newRole])
  return newRole
}

export function updateRole(id: string, data: Partial<Role>) {
  const roles = getStoredRoles()
  const updated = roles.map((r) => {
    if (r.id !== id) return r
    return { ...r, ...data, id: r.id, isSystem: r.isSystem, code: r.isSystem ? r.code : (data.code || r.code), updatedAt: Date.now() }
  })
  saveRoles(updated)
}

export function deleteRole(id: string) {
  const roles = getStoredRoles()
  const role = roles.find((r) => r.id === id)
  if (role?.isSystem) return
  saveRoles(roles.filter((r) => r.id !== id))
}

export function getRoleByCode(code: string): Role | undefined {
  return getStoredRoles().find((r) => r.code === code)
}

export function getRoleById(id: string): Role | undefined {
  return getStoredRoles().find((r) => r.id === id)
}

// 初始化默认角色权限（兼容旧调用）
export function initializeDefaultRolePermissions(_allPermissionIds?: string[]) {
  // 权限初始化已集成到 getStoredRoles() 中，此函数保留为空操作以兼容旧代码
  if (typeof window === "undefined") return
  getStoredRoles()
}
