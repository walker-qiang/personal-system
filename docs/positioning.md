# Personal System Positioning

## One-line Positioning

Build a local-first, Git-synced, AI-native personal knowledge and asset operating system.

`personal-assets` is the long-term personal asset repository. `personal-os` is the local/cloud application for operating those assets. Finance is only the current first strong workflow; over time, knowledge, skills, decisions, reflections, research, and raw materials should all settle into the same long-term asset layer.

This is a fully private, single-user system. The repository and application are not designed for public sharing or multi-user access.

## What "Assets" Means

Assets are not limited to financial assets.

- Financial assets: snapshots, transactions, allocation targets, analysis reports.
- Knowledge assets: captured articles, source materials, wiki pages, research notes, concept maps.
- Capability assets: skills, workflows, methods, tool usage patterns.
- Decision assets: decision records, tradeoffs, review notes.
- Personal trajectory: journal entries, reflections, long-term themes.
- Raw materials: web clips, WeChat articles, files, screenshots, temporary ideas.

## Core Layers

### 1. Long-term Asset Layer

Future repo: `personal-assets`.

This is the only long-term source of truth. It stores personal facts and durable knowledge in open, Git-friendly text formats. Git is the synchronization and audit protocol across devices.

SQLite, search indexes, vector databases, and web caches are local rebuildable caches, not source-of-truth state.

### 2. Personal Operating System

Future repo: `personal-os`.

This is a product boundary, not necessarily a single language or single process. It may contain a web frontend, API service, agent runtime, indexer, sync service, doctor tools, and deployment config.

Its job is to operate `personal-assets`: record structured facts, browse and analyze data, run AI-assisted workflows, rebuild caches, and coordinate Git sync.

### 3. Entry Layer

Multiple entry points can coexist, but they must share the same asset layer and write protocol.

- Codex: primary entry for deep organization, coding, and complex maintenance.
- Trae: home entry for similar AI-assisted workflows.
- Web: daily operating console for structured workflows and browsing.
- Web Agent: self-built agent experiment surface for AI chat, asset analysis, and lightweight workflows.
- Capture tools: browser extensions, clipping, files, inbox.
- Cloud node: a deployed `personal-os` node for fast access and web writes.

## Long-term Rules

1. Git-backed text facts are the long-term truth.
2. This is a single-user multi-node system, not a real-time collaboration system.
3. Every node should fetch/pull automatically on a schedule, and writes should do a final sync check before changing durable files.
4. Writes should validate, commit, push, then rebuild local caches.
5. Conflicts are expected to be rare; when they happen, stop and ask for manual resolution instead of building complex auto-merge behavior.
6. AI can organize, retrieve, summarize, analyze, and suggest, but it must not own unrebuildable state.
7. AI writes to durable knowledge should be source-backed, auditable, and reversible.
8. Cloud deployment is a node, not a new source of truth.
9. Finance is the first structured module, not the center of the system.
10. Personal data may live in the private asset repository; secrets and credentials still stay outside Git.

## Mobile / Mini Program Direction

Do not start with a mini program.

First validate mobile usage through a responsive web/PWA experience on the cloud node. Consider a mini program only if a strong mobile-native need appears, such as WeChat ecosystem capture, frequent phone-side snapshot entry, notifications, camera upload, or voice input.

## Current Planning Decision

Use this new top-level workspace to hold future construction around the personal system, including planning documents and new sub-repositories such as `personal-assets` and `personal-os`.
