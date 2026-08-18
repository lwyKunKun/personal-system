export type UserProfile = {
  name: string
  roles: string[]
}

export const USER_PROFILE_STORAGE_KEY = "vibe:userProfile"

export const DEFAULT_USER_PROFILE: UserProfile = {
  name: "管理员",
  roles: ["admin", "user"],
}

export function getCurrentUserProfile(): UserProfile {
  if (typeof window === "undefined") {
    return DEFAULT_USER_PROFILE
  }

  try {
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
