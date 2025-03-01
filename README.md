# GitBook Downloader

【[中文](https://github.com/woodcoal/gitbook-downloader/blob/main/README.md)】 【[English](https://github.com/woodcoal/gitbook-downloader/blob/main/README-en.md)】

GitBook Downloader 是一款基于 Node.js 的自动化文档抓取工具，专为 GitBook 托管平台文档下载设计，支持**全站内容批量下载**（含嵌套目录结构、Markdown 排版、图片及附件资源）。该工具通过模拟浏览器访问实现数据抓取，可无缝对接 Obsidian、Logseq 等双链笔记系统，是构建个人知识库的利器。

---

## 方法指南

### 环境准备

```bash
# 要求 Node.js ≥18.x 且已安装 Git
node -v  # 验证Node版本
git clone https://github.com/woodcoal/gitbook-downloader.git
cd gitbook-downloader
```

### 安装

```bash
npm install  # 推荐使用yarn管理依赖

# 或者
yarn install  # 精确安装依赖版本
```

### 基础命令

```bash
# 公有文档下载（含图片）
node src/index https://docs.gitbook.com -o ./my_docs

# 私有文档下载（需认证）
node src/index https://internal.company.com/docs \
  -a -u user@company.com -p $SECRET_PASSWORD \
  -i false  # 禁用图片下载
```

### 参数说明

| 短参数 | 长参数     | 数据类型 | 默认值   | 说明                           |
| ------ | ---------- | -------- | -------- | ------------------------------ |
| -a     | --all      | string   | false    | 对于包含路径的地址是否全站下载 |
| -o     | --output   | string   | ./output | 支持绝对/相对路径              |
| -i     | --images   | boolean  | true     | 使用`--no-images`禁用下载      |
| -a     | --auth     | boolean  | false    | 启用 HTTP Basic 认证           |
| -u     | --username | string   | -        | 需与`-a`联用                   |
| -p     | --password | string   | -        | 建议通过环境变量传递           |
