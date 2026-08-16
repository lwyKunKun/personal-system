// eslint.config.mjs
// ESLint 配置入口（使用 eslint-config-next 提供的规则集）
// 说明：
// - 本文件将 Next.js 推荐的 core-web-vitals 与 TypeScript 规则合并
// - 通过 globalIgnores 覆盖默认的忽略项（例如 .next、out 等）
import { defineConfig, globalIgnores } from "eslint/config"
import nextVitals from "eslint-config-next/core-web-vitals"
import nextTs from "eslint-config-next/typescript"

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
])

export default eslintConfig
