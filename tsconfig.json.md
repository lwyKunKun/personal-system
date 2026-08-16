# tsconfig.json 说明

该文件定义 TypeScript 编译器选项，用于开发期间类型检查与编辑器集成。关键字段：

- `compilerOptions.target`：编译目标（如 ES2017）
- `lib`：包含的库环境声明
- `allowJs`：是否允许编译 JS 文件
- `strict`：是否启用严格模式
- `jsx`：JSX 转换设置（`react-jsx`）
- `paths`：路径别名（此项目设置 `@/*` 指向仓库根）

如果需要更改构建输出或调试行为，可在此调整选项。
