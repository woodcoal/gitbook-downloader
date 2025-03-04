# GitBook 文档下载工具设计方案

## 1. 项目概述

本工具旨在实现 GitBook 托管平台上的文档镜像下载，将在线文档转换并保存为本地 Markdown 文件。

## 2. 核心功能

-   GitBook 文档页面抓取
-   HTML 到 Markdown 的转换
-   文档结构重建
-   资源文件（图片等）的本地化
-   保持原有目录结构

## 3. 技术方案

### 3.1 文档抓取模块

-   使用 Puppeteer 实现页面渲染和内容提取
-   处理动态加载内容
-   支持身份认证（针对私有文档）

### 3.2 内容转换模块

-   HTML 解析：使用 cheerio 进行 DOM 解析
-   Markdown 转换：使用 turndown 将 HTML 转为 Markdown
-   代码块处理：保持原有格式和语法高亮

### 3.3 资源处理模块

-   图片下载与本地化
-   本地路径替换
-   资源文件去重

### 3.4 目录结构处理

-   解析 GitBook 导航结构
-   重建本地目录层级
-   生成本地目录索引

## 4. 工具使用流程

1. 输入 GitBook 文档 URL
2. 配置下载选项（是否下载图片、是否需要认证等）
3. 开始下载和转换
4. 生成本地文档结构

## 5. 技术栈选择

-   开发语言：Node.js
-   主要依赖：
    -   Puppeteer：页面渲染和内容抓取
    -   Cheerio：HTML 解析
    -   Turndown：HTML 到 Markdown 转换
    -   fs-extra：文件系统操作
-   包管理工具：yarn

## 6. 注意事项

-   遵守目标网站的爬虫规则
-   控制请求频率，避免对目标服务器造成压力
-   处理网络异常和内容加载超时
-   确保转换后的 Markdown 格式正确
