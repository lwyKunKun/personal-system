import { getStoredRoles } from "./roles"
import { getStoredUsers, type User } from "./users"

export type UserProfile = {
  name: string
  roles: string[]
}

export const USER_PROFILE_STORAGE_KEY = "vibe:userProfile"
const CURRENT_USER_ID_KEY = "vibe:currentUserId"

export const DEFAULT_USER_PROFILE: UserProfile = {
  name: "管理员",
  roles: ["admin"],
}

export function getCurrentUserProfile(): UserProfile {
  if (typeof window === "undefined") {
    return DEFAULT_USER_PROFILE
  }

  try {
    // 优先从登录用户获取角色
    const userId = localStorage.getItem(CURRENT_USER_ID_KEY)
    if (userId) {
      const user = getStoredUsers().find((u) => u.id === userId)
      if (user && user.status === "active") {
        const roles = getStoredRoles()
        const userRoles = user.roleIds
          .map((rid) => roles.find((r) => r.id === rid)?.code)
          .filter(Boolean) as string[]
        return {
          name: user.name,
          roles: userRoles.length > 0 ? userRoles : DEFAULT_USER_PROFILE.roles,
        }
      }
    }
    const raw = localStorage.getItem(USER_PROFILE_STORAGE_KEY)
    if (!raw) return DEFAULT_USER_PROFILE
    const parsed = JSON.parse(raw) as Partial<UserProfile>
    return {
      name: parsed.name || DEFAULT_USER_PROFILE.name,
      roles: Array.isArray(parsed.roles) && parsed.roles.length > 0 ? parsed.roles : DEFAULT_USER_PROFILE.roles,
    }
  } catch (error) {
    console.warn("Failed to read user profile", error)
    return DEFAULT_USER_PROFILE
  }
}

export function saveCurrentUserProfile(profile: UserProfile) {
  if (typeof window === "undefined") return

  try {
    localStorage.setItem(USER_PROFILE_STORAGE_KEY, JSON.stringify(profile))
    window.dispatchEvent(new CustomEvent("vibe:user-updated"))
  } catch (error) {
    console.warn("Failed to save user profile", error)
  }
}

// 登录：设置当前用户ID
export function loginUser(userId: string) {
  if (typeof window === "undefined") return
  localStorage.setItem(CURRENT_USER_ID_KEY, userId)
  // 清除旧的profile缓存，强制重新从用户数据读取
  localStorage.removeItem(USER_PROFILE_STORAGE_KEY)
  window.dispatchEvent(new CustomEvent("vibe:user-updated"))
}

// 登出：清除登录状态
export function logoutUser() {
  if (typeof window === "undefined") return
  localStorage.removeItem(CURRENT_USER_ID_KEY)
  localStorage.removeItem(USER_PROFILE_STORAGE_KEY)
  window.dispatchEvent(new CustomEvent("vibe:user-updated"))
}

// 获取当前登录的用户
export function getCurrentUser(): User | null {
  if (typeof window === "undefined") return null
  try {
    const userId = localStorage.getItem(CURRENT_USER_ID_KEY)
    if (!userId) return null
    return getStoredUsers().find((u) => u.id === userId) ?? null
  } catch {
    return null
  }
}

// 检查是否已登录（仅检查是否有登录记录）
export function isLoggedIn(): boolean {
  if (typeof window === "undefined") return false
  return !!localStorage.getItem(CURRENT_USER_ID_KEY)
}

// 初始化登录状态：用于首次加载时迁移旧数据或自动登录默认用户
// 返回 true 表示已自动设置登录状态
export function ensureLoggedIn(): boolean {
  if (typeof window === "undefined") return false
  if (localStorage.getItem(CURRENT_USER_ID_KEY)) return true
  // 迁移旧数据：有旧profile时自动登录为管理员
  const oldProfile = localStorage.getItem(USER_PROFILE_STORAGE_KEY)
  const users = getStoredUsers()
  let targetUser: User | undefined
  if (oldProfile) {
    try {
      const parsed = JSON.parse(oldProfile) as Partial<UserProfile>
      if (parsed.roles?.includes("admin")) {
        targetUser = users.find((u) => u.roleIds.some((rid) => {
          const role = getStoredRoles().find((r) => r.id === rid)
          return role?.code === "admin"
        }))
      }
    } catch { /* ignore */ }
  }
  // 默认用第一个用户（管理员）
  if (!targetUser && users.length > 0) {
    targetUser = users[0]
  }
  if (targetUser) {
    localStorage.setItem(CURRENT_USER_ID_KEY, targetUser.id)
    return true
  }
  return false
}
