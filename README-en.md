# GitBook Downloader

【[中文](https://github.com/woodcoal/gitbook-downloader/blob/main/README.md)】 【[English](https://github.com/woodcoal/gitbook-downloader/blob/main/README-en.md)】

GitBook Downloader is a Node.js-based automated document scraping tool specifically designed for downloading documentation hosted on GitBook. It supports **batch downloading of entire site content** (including nested directory structures, Markdown formatting, images, and attachments). The tool simulates browser access for data scraping and seamlessly integrates with bi-directional linking note systems like Obsidian and Logseq, making it an essential tool for building personal knowledge bases.

---

## Usage Guide

### Environment Setup

```bash
# Requires Node.js ≥18.x and Git installation
node -v  # Verify Node version
git clone https://github.com/woodcoal/gitbook-downloader.git
cd gitbook-downloader
```

### Installation

```bash
npm install  # Recommended to use yarn for dependency management

# Alternatively
yarn install  # Install dependencies with precise versions
```

### Basic Commands

```bash
# Public documentation download (with images)
node src/index https://docs.gitbook.com -o ./my_docs

# Private documentation download (requires authentication)
node src/index https://internal.company.com/docs \
  -a -u user@company.com -p $SECRET_PASSWORD \
  -i false  # Disable image download
```

### Parameter Description

| Short Param | Long Param | Data Type | Default  | Description                                                         |
| ----------- | ---------- | --------- | -------- | ------------------------------------------------------------------- | 
| -a          | --all      | string    | false    | Whether to download the entire site for addresses containing paths. |
| -o          | --output   | string    | ./output | Supports absolute/relative paths                                    |
| -i          | --images   | boolean   | true     | Use `--no-images` to disable                                        |
| -a          | --auth     | boolean   | false    | Enable HTTP Basic authentication                                    |
| -u          | --username | string    | -        | Must be used with `-a`                                              |
| -p          | --password | string    | -        | Recommended to pass via environment variables approach to document extraction. |

---

_This article was translated by DeepSeek._
