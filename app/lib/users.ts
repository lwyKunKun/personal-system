export interface User {
  id: string
  username: string
  name: string
  password?: string
  roleIds: string[]
  status: "active" | "disabled"
  isSystem?: boolean
  createdAt: number
  updatedAt: number
}

const USERS_STORAGE_KEY = "vibe:users"
const USERS_VERSION = 1

function generateId() {
  return "user_" + Math.random().toString(36).slice(2, 10)
}

function getDefaultUsers(): User[] {
  const now = Date.now()
  return [
    {
      id: "user_admin",
      username: "admin",
      name: "管理员",
      password: "admin123",
      roleIds: ["role_admin"],
      status: "active",
      isSystem: true,
      createdAt: now,
      updatedAt: now,
    },
    {
      id: "user_user",
      username: "user",
      name: "普通用户",
      password: "user123",
      roleIds: ["role_user"],
      status: "active",
      isSystem: true,
      createdAt: now,
      updatedAt: now,
    },
  ]
}

export function getStoredUsers(): User[] {
  if (typeof window === "undefined") return getDefaultUsers()
  try {
    const raw = localStorage.getItem(USERS_STORAGE_KEY)
    if (!raw) {
      const defaults = getDefaultUsers()
      localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify({ version: USERS_VERSION, data: defaults }))
      return defaults
    }
    const parsed = JSON.parse(raw)
    if (parsed.version !== USERS_VERSION || !Array.isArray(parsed.data)) {
      const defaults = getDefaultUsers()
      localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify({ version: USERS_VERSION, data: defaults }))
      return defaults
    }
    return parsed.data
  } catch {
    return getDefaultUsers()
  }
}

export function saveUsers(users: User[]) {
  if (typeof window === "undefined") return
  localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify({ version: USERS_VERSION, data: users }))
  window.dispatchEvent(new CustomEvent("vibe:users-updated"))
}

export function createUser(data: Partial<User>): User | null {
  const users = getStoredUsers()
  if (users.some((u) => u.username === data.username)) return null
  const now = Date.now()
  const newUser: User = {
    id: generateId(),
    username: data.username || "",
    name: data.name || data.username || "新用户",
    password: data.password || "123456",
    roleIds: data.roleIds || [],
    status: data.status || "active",
    isSystem: false,
    createdAt: now,
    updatedAt: now,
  }
  saveUsers([...users, newUser])
  return newUser
}

export function updateUser(id: string, data: Partial<User>) {
  const users = getStoredUsers()
  const updated = users.map((u) => {
    if (u.id !== id) return u
    return { ...u, ...data, id: u.id, isSystem: u.isSystem, username: u.username, updatedAt: Date.now() }
  })
  saveUsers(updated)
}

export function deleteUser(id: string) {
  const users = getStoredUsers()
  const user = users.find((u) => u.id === id)
  if (user?.isSystem) return
  saveUsers(users.filter((u) => u.id !== id))
}

export function getUserById(id: string): User | undefined {
  return getStoredUsers().find((u) => u.id === id)
}

export function getUserByUsername(username: string): User | undefined {
  return getStoredUsers().find((u) => u.username === username)
}

export function verifyLogin(username: string, password: string): User | null {
  const user = getUserByUsername(username)
  if (!user || user.status !== "active") return null
  if (user.password && user.password !== password) return null
  return user
}
