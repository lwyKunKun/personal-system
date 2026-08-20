"use client"
import WorkspaceShell from "./WorkspaceShell"

interface SystemShellProps {
  children: React.ReactNode
}

export default function SystemShell({ children }: SystemShellProps) {
  return (
    <WorkspaceShell showHeader={false}>
      {children}
    </WorkspaceShell>
  )
}
