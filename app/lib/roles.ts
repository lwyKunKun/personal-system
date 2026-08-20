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

export function getStoredRoles(): Role[] {
  if (typeof window === "undefined") return getDefaultRoles()
  try {
    const raw = localStorage.getItem(ROLES_STORAGE_KEY)
    if (!raw) {
      const defaults = getDefaultRoles()
      localStorage.setItem(ROLES_STORAGE_KEY, JSON.stringify({ version: ROLES_VERSION, data: defaults }))
      return defaults
    }
    const parsed = JSON.parse(raw)
    let data: Role[]
    if (parsed.version !== ROLES_VERSION || !Array.isArray(parsed.data)) {
      data = getDefaultRoles()
      localStorage.setItem(ROLES_STORAGE_KEY, JSON.stringify({ version: ROLES_VERSION, data }))
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

// 初始化默认角色权限：admin 已有全部权限（代码控制），user 需要授予项目和个人权限
export function initializeDefaultRolePermissions(allPermissionIds: string[]) {
  if (typeof window === "undefined") return
  const roles = getStoredRoles()
  let changed = false
  for (const role of roles) {
    if (role.code === "user" && role.permissions.length === 0) {
      role.permissions = allPermissionIds.filter((p) => {
        if (p.startsWith("menu:system-") || p.startsWith("btn:system-")) return false
        return true
      })
      changed = true
    }
  }
  if (changed) saveRoles(roles)
}
