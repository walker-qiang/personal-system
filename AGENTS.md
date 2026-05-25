# personal-system 工作规则

- 本目录是长期工作区根目录。长期维护项目应收敛到 `/Users/qiang.lilq/personal-system` 下。
- 顶层 Git 仓只管理 workspace / governance 内容，不管理子项目源码。
- 子项目使用独立 Git 仓库；默认不使用 submodule。
- 新增或更新项目文档时默认使用中文；代码标识、API path、env var、文件路径和约定术语可保留英文。
- 不把运行态提交到顶层 Git：`.env`、SQLite、cache、logs、`node_modules`、`dist`、临时文件都必须忽略。
- `personal-assets` 是 durable source of truth。
- `personal-os` V1 是 finance snapshot app，不是通用 knowledge editor，也不替代 Obsidian。
- 迁移边界以 `personal-os/docs/migration-boundary.md` 为准。
