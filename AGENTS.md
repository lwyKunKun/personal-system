<!--
	AGENTS.md: agent 配置与 Next.js 注意事项
	说明：
	- 本文件包含 Next.js 特殊 agent 规则提示，帮助开发者理解本仓库使用的 Next.js 版本差异
	- 该注释块为文件级说明，非可执行配置
-->

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
