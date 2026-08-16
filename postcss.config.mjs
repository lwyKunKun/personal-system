// postcss.config.mjs
// PostCSS 配置：用于在构建时应用 Tailwind 的 PostCSS 插件
// 说明：
// - 此处使用 `@tailwindcss/postcss` 插件来启用 Tailwind CSS 的 PostCSS 功能
// - 如需添加 autoprefixer 或其他插件，可在 plugins 对象中增加配置
const config = {
  plugins: {
    "@tailwindcss/postcss": {},
  },
}

export default config
