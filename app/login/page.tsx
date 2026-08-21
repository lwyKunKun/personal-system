"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { getStoredRoles } from "../lib/roles"
import { getStoredUsers, verifyLogin } from "../lib/users"
import { loginUser, isLoggedIn } from "../lib/user"
import { LucideLogIn, LucideShieldCheck, LucideUser, LucideLock, LucideUsers, LucideEye, LucideEyeOff } from "lucide-react"

export default function LoginPage() {
  const router = useRouter()
  const [users, setUsers] = useState(getStoredUsers())
  const [roles, setRoles] = useState(getStoredRoles())
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null)
  const [username, setUsername] = useState("")
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    // 已登录则跳转到首页
    if (isLoggedIn()) {
      router.push("/")
      return
    }
    setUsers(getStoredUsers())
    setRoles(getStoredRoles())
  }, [router])

  const getUserRoleNames = (user: ReturnType<typeof getStoredUsers>[0]) => {
    return user.roleIds
      .map((rid) => roles.find((r) => r.id === rid)?.name || rid)
      .filter(Boolean)
      .join("、")
  }

  const handleQuickLogin = (userId: string) => {
    const user = users.find((u) => u.id === userId)
    if (!user) return
    setSelectedUserId(userId)
    setUsername(user.username)
    setPassword(user.password || "")
    setError("")
    // 自动登录
    setTimeout(() => {
      loginUser(user.id)
      router.push("/")
    }, 200)
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setLoading(true)

    const user = verifyLogin(username.trim(), password)
    if (!user) {
      setError("用户名或密码错误，或账户已被禁用")
      setLoading(false)
      return
    }

    loginUser(user.id)
    // 延迟一下让用户看到反馈
    setTimeout(() => {
      router.push("/")
    }, 300)
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#050b17] px-4">
      <div className="w-full max-w-md space-y-6">
        {/* Logo & Title */}
        <div className="text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-[#f68f4d] to-[#e07332]">
            <LucideShieldCheck className="h-8 w-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-slate-100">系统登录</h1>
          <p className="mt-1 text-sm text-slate-400">选择用户快速登录，或输入账号密码登录</p>
        </div>

        {/* 快速选择用户 */}
        <div className="rounded-2xl border border-white/10 bg-[#0b1220] p-5">
          <div className="mb-3 flex items-center gap-2 text-sm font-medium text-slate-300">
            <LucideUsers className="h-4 w-4 text-[#f68f4d]" />
            快速切换角色
          </div>
          <div className="space-y-2">
            {users.filter((u) => u.status === "active").map((user) => (
              <button
                key={user.id}
                onClick={() => handleQuickLogin(user.id)}
                className={`flex w-full items-center gap-3 rounded-xl border px-4 py-3 text-left transition-all ${
                  selectedUserId === user.id
                    ? "border-[#f68f4d]/60 bg-[#f68f4d]/10"
                    : "border-white/8 bg-[#0f1828] hover:border-white/15 hover:bg-[#121d32]"
                }`}
              >
                <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${
                  user.roleIds.some((rid) => roles.find((r) => r.id === rid)?.code === "admin")
                    ? "bg-[#f68f4d]/20 text-[#f68f4d]"
                    : "bg-white/5 text-slate-400"
                }`}>
                  <LucideUser className="h-4 w-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-slate-200">{user.name}</div>
                  <div className="truncate text-xs text-slate-500">@{user.username} · {getUserRoleNames(user)}</div>
                </div>
                {selectedUserId === user.id && (
                  <div className="flex h-5 w-5 items-center justify-center rounded-full bg-[#f68f4d]">
                    <LucideLogIn className="h-3 w-3 text-white" />
                  </div>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* 登录表单 */}
        <form onSubmit={handleSubmit} className="space-y-4 rounded-2xl border border-white/10 bg-[#0b1220] p-5">
          <div>
            <label className="mb-1.5 block text-xs font-medium text-slate-400">用户名</label>
            <div className="relative">
              <LucideUser className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="请输入用户名"
                className="w-full rounded-xl border border-white/10 bg-[#0f1828] py-2.5 pl-10 pr-3 text-sm text-slate-200 outline-none transition-colors placeholder:text-slate-600 focus:border-[#f68f4d]/50 focus:ring-2 focus:ring-[#f68f4d]/10"
              />
            </div>
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-medium text-slate-400">密码</label>
            <div className="relative">
              <LucideLock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="请输入密码"
                className="w-full rounded-xl border border-white/10 bg-[#0f1828] py-2.5 pl-10 pr-10 text-sm text-slate-200 outline-none transition-colors placeholder:text-slate-600 focus:border-[#f68f4d]/50 focus:ring-2 focus:ring-[#f68f4d]/10"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
              >
                {showPassword ? <LucideEyeOff className="h-4 w-4" /> : <LucideEye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          {error && (
            <div className="rounded-lg border border-red-500/20 bg-red-500/10 px-3 py-2 text-sm text-red-400">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading || !username || !password}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#f68f4d] to-[#e07332] py-2.5 text-sm font-medium text-white transition-all hover:from-[#f59b5f] hover:to-[#e87d3d] disabled:cursor-not-allowed disabled:opacity-50"
          >
            <LucideLogIn className="h-4 w-4" />
            {loading ? "登录中..." : "登录系统"}
          </button>
        </form>

        <div className="text-center text-xs text-slate-600">
          默认账号：admin / admin123（管理员） · user / user123（普通用户）
        </div>
      </div>
    </div>
  )
}
