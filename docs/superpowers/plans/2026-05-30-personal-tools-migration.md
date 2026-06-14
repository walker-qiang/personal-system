# personal-tools 迁移计划

> **状态**: 规划中  
> **目标**: 将 `/Users/liqiang/code/personal-tools` 迁入 `/Users/liqiang/code/personal-system/personal-tools`，保持独立 Git 仓，不改变 remote。

## 1. 现状分析

旧仓结构（`/Users/liqiang/code/personal-tools`）：

```text
personal-tools/
  mcp-servers/wiki-search/    # Python MCP server + SQLite FTS5 索引，暴露 3 个工具
  scripts/
    sync-skills-to-codex.sh   # obsidian-wiki/skills → ~/.codex/skills/ (软链)
    sync-skills-to-trae.sh    # obsidian-wiki/skills → ~/.trae/skills/ (软链)
    check-agents-sync.sh      # 校验 AGENTS.md ↔ _system/standards 一致性
    check-draft-ownership.sh  # 校验 _draft/ writer 字段
    start-personal-stack.sh   # 启动旧 personal-finance/agent/web 三件套
    weekly-digest.py          # Git 变动周报生成器
    scan_raw_candidates.py    # 一次性 raw/ 候选扫描脚本
    fix_*.py (11 个,未跟踪)   # 一次性 frontmatter/wiki 修复脚本
  launchd/
    install-launchd.sh        # plist 安装/卸载管理脚本
    personal-finance.plist    # → 旧 personal-finance 服务
    personal-agent.plist      # → 旧 personal-agent 服务
    personal-web.plist        # → 旧 personal-web 服务
    wiki-search-api.plist     # wiki-search HTTP API 服务
    wiki-search-index.plist   # wiki-search 定时索引重建
  weixin-clip/extension/      # Chrome MV3 扩展：微信文章剪藏
  _draft/                     # 草稿内容（非工具）
  wiki/queries/               # 知识查询记录（非工具）
  .git/                       # Git remote: git@github.com:walker-qiang/personal-tools.git
```

### 关键路径硬编码

所有脚本都依赖以下路径，迁移时需要统一处理：

| 当前硬编码路径 | 实际含义 | 对应新架构 |
|---|---|---|
| `~/obsidian-wiki` | Obsidian vault | `personal-assets`（长期方向） |
| `~/personal-finance` | 旧 finance 后端 | `personal-os/apps/api`（已废弃） |
| `~/personal-agent` | 旧 agent 运行时 | `personal-os/apps/agent`（已废弃） |
| `~/personal-web` | 旧 web 前端 | `personal-os/apps/web`（已废弃） |
| `~/personal-tools` | 工具仓自身 | 目标路径 |

### Git 状态

- Remote: `git@github.com:walker-qiang/personal-tools.git`（保留不变）
- 有 15 个未跟踪文件：`fix_*.py`（一次性脚本）、`test_search.py`
- Working tree is clean for tracked files

## 2. 迁移策略

### 总体原则

1. **保持独立 Git 仓**，remote 不变，不改变历史
2. **物理移动到目标目录**，更新文档和 README 中的路径引用
3. **分类处理**：核心工具迁移，废弃内容清理，一次性脚本归档/删除
4. **先移后改**：先完成物理迁移，再逐项更新硬编码路径和 launchd plist

### 筛选决策矩阵

| 文件/目录 | 决策 | 理由 |
|---|---|---|
| `mcp-servers/wiki-search/` | ✅ 迁移 | 核心 MCP 工具，已被 Codex 集成 |
| `scripts/sync-skills-to-codex.sh` | ✅ 迁移 | 日常维护入口 |
| `scripts/sync-skills-to-trae.sh` | ✅ 迁移 | 日常维护入口 |
| `scripts/check-agents-sync.sh` | ✅ 迁移 | 一致性校验工具 |
| `scripts/check-draft-ownership.sh` | ✅ 迁移 | 草稿校验工具 |
| `scripts/weekly-digest.py` | ✅ 迁移 | 周记辅助工具 |
| `launchd/install-launchd.sh` | ✅ 迁移 | plist 管理 |
| `launchd/wiki-search-api.plist` | ✅ 迁移 | 仍需运行 |
| `launchd/wiki-search-index.plist` | ✅ 迁移 | 仍需运行 |
| `weixin-clip/extension/` | ✅ 迁移 | Chrome 扩展，无路径依赖 |
| `README.md` | ✅ 迁移并更新 |
| `.gitignore` | ✅ 迁移 |
| `scripts/start-personal-stack.sh` | ❌ 废弃 | 旧三件套已被 `personal-os` 替代 |
| `scripts/scan_raw_candidates.py` | ❌ 废弃 | 一次性脚本，日期硬编码，逻辑已不适用 |
| `scripts/fix_*.py`（11 个） | ❌ 不跟踪 | 历史一次性修复脚本，没必要迁入 Git |
| `launchd/personal-finance.plist` | ❌ 废弃 | 旧服务已被 personal-os 替代 |
| `launchd/personal-agent.plist` | ❌ 废弃 | 旧服务已被 personal-os 替代 |
| `launchd/personal-web.plist` | ❌ 废弃 | 旧服务已被 personal-os 替代 |
| `_draft/` | ❌ 删除 | 非工具内容，属临时工作区 |
| `wiki/queries/` | ❌ 归档 | 知识内容，归入 personal-assets 或保留旧仓引用 |

## 3. 迁移步骤

### 步骤 0: 前置准备

- [ ] 确认旧仓 working tree 干净
- [ ] 确认 `personal-system` 顶层 `.gitignore` 已排除 `/personal-tools/`
- [ ] 确认目标目录 `/Users/liqiang/code/personal-system/personal-tools/` 不存在

### 步骤 1: 物理迁移

```bash
# 1.1 移动 Git 仓到目标路径
mv /Users/liqiang/code/personal-tools /Users/liqiang/code/personal-system/personal-tools

# 1.2 验证 remote 仍正确
cd /Users/liqiang/code/personal-system/personal-tools
git remote -v
```

> **注意**：Git 仓库整体移动，不改 Git 历史，不重新 init。remote 保持不变。

### 步骤 2: 清理废弃内容

在迁移后的新路径下：

- [ ] 删除 `scripts/start-personal-stack.sh`
- [ ] 删除 `scripts/scan_raw_candidates.py`
- [ ] 删除所有 `scripts/fix_*.py`（未跟踪文件）
- [ ] 删除 `_draft/` 目录
- [ ] 删除 `wiki/queries/` 目录
- [ ] 删除 `launchd/personal-finance.plist`
- [ ] 删除 `launchd/personal-agent.plist`
- [ ] 删除 `launchd/personal-web.plist`

### 步骤 3: 更新路径引用

#### 3.1 launchd plist 路径修正

`launchd/*.plist` 中有硬编码路径需要更新：

| plist 文件 | 需更新的字段 | 旧值 | 新值 |
|---|---|---|---|
| `wiki-search-api.plist` | `WorkingDirectory` | `/Users/liqiang/code/personal-tools/mcp-servers/wiki-search` | `/Users/liqiang/code/personal-system/personal-tools/mcp-servers/wiki-search` |
| `wiki-search-index.plist` | `WorkingDirectory` | 同上 | 同上 |
| `wiki-search-api.plist` | `WIKI_ROOT` | `/Users/liqiang/code/obsidian-wiki` | 暂不变（见下方策略说明） |
| `wiki-search-index.plist` | `WIKI_ROOT` | 同上 | 暂不变 |

#### 3.2 脚本路径更新

`scripts/` 中所有脚本的环境变量默认值需要更新：

| 脚本 | 需更新的路径 | 策略 |
|---|---|---|
| 所有脚本 | `~/obsidian-wiki` → 仍指向 obsidian-wiki | **暂不变**：obsidian-wiki 仍是当前 Obsidian vault，personal-assets 是未来方向。通过 `WIKI_ROOT` 环境变量覆盖 |
| 所有脚本 | `~/personal-tools` → 新路径 | 更新默认值或移除（脚本自身路径可用 `$(dirname "$0")/..` 推断） |

**具体修改方案**：

- `sync-skills-to-codex.sh`：`SKILLS_SRC` 默认仍为 `~/obsidian-wiki/skills`（暂不变）
- `sync-skills-to-trae.sh`：同上
- `check-agents-sync.sh`：`WIKI_ROOT` 默认仍为 `~/obsidian-wiki`
- `check-draft-ownership.sh`：同上
- `weekly-digest.py`：`WIKI_ROOT` 默认仍为 `~/obsidian-wiki`；`TOOLS_ROOT` 默认更新为新路径
- `wiki-search` 的 `WIKI_ROOT`：`config.py` 默认值更新标注，launchd plist 中的 `WIKI_ROOT` 暂不变

#### 3.3 README 全面更新

- [ ] 更新 README.md 中的所有路径引用
- [ ] 删除「一键起 personal-finance + personal-agent + personal-web」章节
- [ ] 更新「当前状态」表，移除已废弃项
- [ ] 更新路径假设说明

### 步骤 4: 验证

#### 4.1 脚本可跑性

```bash
cd /Users/liqiang/code/personal-system/personal-tools
./scripts/check-agents-sync.sh
./scripts/check-draft-ownership.sh
./scripts/weekly-digest.py --since-days 0
```

#### 4.2 wiki-search 可跑性

```bash
cd mcp-servers/wiki-search
uv sync
WIKI_ROOT=$HOME/obsidian-wiki uv run wiki-search-index --info
```

#### 4.3 launchd 重新安装

```bash
cd launchd
# 先卸载所有旧 plist
./install-launchd.sh status
# 按需重装
./install-launchd.sh install wiki-search-api
./install-launchd.sh install wiki-search-index
```

#### 4.4 Codex MCP 配置更新

`~/.codex/config.toml` 中的 wiki-search 路径需要更新为新路径。

### 步骤 5: 更新 workspace 注册表

- [ ] 更新 `workspace.yaml` 中 `personal-tools` 的状态为 `active`，`current_path` 更新
- [ ] 更新 `docs/project-progress.md` 中 `personal-tools` 的状态为 `active`

## 4. 风险与注意事项

### 风险

1. **wiki-search 路径变化** → Codex/Trae 的 MCP 配置需要同步更新，否则 wiki-search 工具不可用
2. **launchd plist 更新** → 如果已安装 plist，move 后 `WorkingDirectory` 变化会导致启动失败，需手动 `uninstall` → `install`
3. **obsidian-wiki 依赖** → wiki-search 和大部分脚本仍依赖 `obsidian-wiki` 路径。本次迁移不改变这个依赖，后续 personal-assets 迁移时再统一处理

### 不做的事

- ❌ 不改变 Git remote
- ❌ 不改变 Git 历史
- ❌ 本次不把 `obsidian-wiki` 依赖改为 `personal-assets`（那是另一条迁移线）
- ❌ 不在 personal-os 中重新实现 wiki-search（保持独立工具仓）

## 5. 与 personal-os 的关系

迁移后，`personal-tools` 和 `personal-os` 将共存于同一 workspace 下：

```text
personal-system/
  personal-os/      # finance snapshot app (Go + Vue + Python)
  personal-tools/   # MCP servers, scripts, launchd (本次迁移)
  personal-assets/  # durable source of truth (已存在)
```

两者的职责边界明确：
- `personal-os`：产品运行时（API、Web、Agent、cache builder）
- `personal-tools`：独立工具和自动化（MCP server、维护脚本、浏览器扩展、launchd）

## 6. 时间线

本迁移不紧急，建议在以下条件满足后执行：
- personal-os finance snapshot workflow 日常使用稳定
- 确认 Codex/Trae MCP 配置可以同步更新
- 预留 30 分钟完成迁移 + 验证

---

*计划版本: 2026-05-30 · 待用户审阅确认*