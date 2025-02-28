const TurndownService = require('turndown');

/**
 * 创建并配置 Turndown 服务实例
 * @returns {TurndownService} 配置好的 Turndown 实例
 */
function createTurndownService() {
	const turndownService = new TurndownService({
		headingStyle: 'atx',
		codeBlockStyle: 'fenced'
	});

	configureTurndownRules(turndownService);
	return turndownService;
}

/**
 * 配置 Turndown 转换规则
 * @param {TurndownService} turndownService
 */
function configureTurndownRules(turndownService) {
	// 处理信息框
	turndownService.addRule('hint', {
		filter: function (node) {
			return node.classList && node.classList.contains('hint');
		},
		replacement: function (content, node) {
			// 根据类名确定提示框类型
			let type = 'info';
			if (node.classList.contains('bg-success')) type = 'success';
			if (node.classList.contains('bg-warning')) type = 'warning';
			if (node.classList.contains('bg-danger')) type = 'danger';

			// 提取标题
			let title = '';
			const headingElement = node.querySelector('h3');
			if (headingElement) {
				title = ' ' + headingElement.textContent.trim();
			}

			// 提取实际内容，排除标题
			const contentElements = node.querySelectorAll('p:not(h3 + p)');
			const textContent = Array.from(contentElements)
				.map(p => p.textContent.trim())
				.join('\n> ');

			// 返回对应的Markdown格式
			return `>[!${type}]${title}\n> ${textContent}\n\n`;
		}
	});

	// 处理任务列表
	turndownService.addRule('taskList', {
		filter: function (node) {
			return node.nodeName === 'LI' && node.querySelector('button[role="checkbox"]');
		},
		replacement: function (content, node) {
			const checkbox = node.querySelector('button[role="checkbox"]');
			const isChecked =
				checkbox.getAttribute('aria-checked') === 'true' ||
				checkbox.getAttribute('data-state') === 'checked';
			const indent = '  '.repeat(getListItemLevel(node) - 1);
			return indent + (isChecked ? '- [x] ' : '- [ ] ') + content.trim() + '\n';
		}
	});

	// 优化列表处理，移除多余空行
	turndownService.addRule('lists', {
		filter: ['ul', 'ol'],
		replacement: function (content, node) {
			// 移除列表项之间的多余空行
			const items = content
				.trim()
				.split('\n')
				.filter((item) => item.trim());
			return '\n' + items.join('\n') + '\n';
		}
	});

	// 获取列表项的缩进级别
	function getListItemLevel(node) {
		let level = 1;
		let parent = node.parentElement;
		while (parent) {
			if (parent.nodeName === 'UL' || parent.nodeName === 'OL') {
				level++;
			}
			parent = parent.parentElement;
		}
		return level;
	}

	// 处理副标题
	turndownService.addRule('subtitle', {
		filter: function (node) {
			return (
				node.nodeName === 'P' &&
				node.classList &&
				(node.classList.contains('subtitle') ||
					(node.classList.contains('text-lg') && node.classList.contains('text-tint')))
			);
		},
		replacement: function (content, node) {
			// 将副标题转换为斜体文本，并添加适当的间距
			return '\n*' + content.trim() + '*\n\n';
		}
	});

	// 优化标题处理
	turndownService.addRule('headings', {
		filter: ['h1', 'h2', 'h3', 'h4', 'h5', 'h6'],
		replacement: function (content, node) {
			// 获取标题级别
			const level = Number(node.nodeName.charAt(1));
			// 提取实际的标题文本，忽略锚点链接
			const titleText = node.textContent.trim();

			// 查找是否有序号
			let numberPrefix = '';
			const numberDiv = node
				.closest('.flex-1')
				?.previousElementSibling?.querySelector('.can-override-text');
			if (numberDiv) {
				const number = numberDiv.textContent.trim();
				if (/^\d+$/.test(number)) {
					numberPrefix = `${number}. `;
				}
			}

			// 返回标准的 Markdown 标题格式，序号在标题标记后
			return (
				'\n' +
				'#'.repeat(level) +
				' ' +
				(numberPrefix ? numberPrefix + titleText : titleText) +
				'\n'
			);
		}
	});

	// 处理所有序列列表项目（非标题）
	turndownService.addRule('numberedItems', {
		filter: function (node) {
			// 检查是否是段落或列表项
			const isParagraphOrListItem = ['P', 'DIV', 'LI', 'SPAN'].includes(node.nodeName);
			// 检查是否有序号容器作为前一个兄弟元素
			const hasNumberPrefix =
				node.closest('.flex-1') &&
				node.closest('.flex-1').previousElementSibling &&
				node.closest('.flex-1').previousElementSibling.querySelector('.can-override-text');

			// 排除已经是标题的元素
			const isNotHeading = !['H1', 'H2', 'H3', 'H4', 'H5', 'H6'].includes(node.nodeName);

			// 检查是否在标题之后
			const isAfterHeading =
				node.previousElementSibling &&
				['H1', 'H2', 'H3', 'H4', 'H5', 'H6'].includes(node.previousElementSibling.nodeName);

			// 如果在标题之后，不应该添加序号
			if (isAfterHeading) return false;

			// 检查是否是首行内容
			const isFirstLine =
				!node.previousElementSibling ||
				node.previousElementSibling.nodeName === 'H1' ||
				node.previousElementSibling.nodeName === 'H2' ||
				node.previousElementSibling.nodeName === 'H3' ||
				node.previousElementSibling.nodeName === 'H4' ||
				node.previousElementSibling.nodeName === 'H5' ||
				node.previousElementSibling.nodeName === 'H6';

			return isParagraphOrListItem && hasNumberPrefix && isNotHeading && isFirstLine;
		},
		replacement: function (content, node) {
			// 获取序号
			let numberPrefix = '';
			const numberDiv = node
				.closest('.flex-1')
				?.previousElementSibling?.querySelector('.can-override-text');

			if (numberDiv) {
				const number = numberDiv.textContent.trim();
				if (/^\d+$/.test(number)) {
					numberPrefix = number;
				}
			}

			// 如果找到序号，将内容格式化为有序列表项
			if (numberPrefix) {
				return '\n' + numberPrefix + '. ' + content.trim() + '\n';
			}

			return content;
		}
	});

	// 过滤序号显示
	turndownService.addRule('removeNumberDiv', {
		filter: function (node) {
			return (
				node.classList &&
				node.classList.contains('can-override-text') &&
				/^\d+$/.test(node.textContent.trim())
			);
		},
		replacement: function () {
			return '';
		}
	});

	// 过滤复制按钮
	turndownService.addRule('removeCopyButton', {
		filter: function (node) {
			return node.nodeName === 'BUTTON' && node.textContent.trim() === 'Copy';
		},
		replacement: function () {
			return '';
		}
	});

	// 优化代码块处理
	turndownService.addRule('fencedCodeBlock', {
		filter: function (node) {
			return (
				(node.nodeName === 'PRE' && node.querySelector('code')) ||
				(node.classList && node.classList.contains('group/codeblock'))
			);
		},
		replacement: function (content, node) {
			// 查找实际的代码内容
			const codeElement = node.querySelector('code');
			if (!codeElement) return '';

			// 提取代码内容，移除多余的空白字符和注释
			const code = codeElement.textContent.replace(/<!--\s*-->/g, '').trim();
			if (!code) return '';

			// 查找文件名信息
			const fileNameDiv = node.querySelector('.inline-flex.items-center.justify-center');
			let fileName = fileNameDiv ? fileNameDiv.textContent.trim() : '';

			// 尝试从类名中提取语言
			let lang = '';
			const codeId = codeElement.id;
			if (codeId) {
				const langMatch = codeElement.textContent.match(
					/color: var\(--shiki-token-(\w+)\)/
				);
				if (langMatch) {
					lang = langMatch[1];
				}
			}

			// 尝试从文件名中提取语言
			if (!lang && fileName) {
				const fileNameParts = fileName.split('.');
				if (fileNameParts.length > 1) {
					lang = fileNameParts[fileNameParts.length - 1].toLowerCase();
				}
			}

			if (fileName) fileName = `(${fileName})`;

			return `\n\`\`\` ${lang}${fileName}\n${code}\n\`\`\`\n`;
		}
	});

	// 处理表格
	turndownService.addRule('tables', {
		filter: function (node) {
			return node.nodeName === 'DIV' && node.getAttribute('role') === 'table';
		},
		replacement: function (content, node) {
			const rows = node.querySelectorAll('[role="row"]');
			if (!rows.length) return '';

			let markdown = '\n';

			// 处理表头
			const headers = rows[0].querySelectorAll('[role="columnheader"]');
			if (headers.length) {
				markdown +=
					'| ' +
					Array.from(headers)
						.map((header) => header.textContent.trim())
						.join(' | ') +
					' |\n';
				markdown += '| ' + Array(headers.length).fill('---').join(' | ') + ' |\n';
			}

			// 处理数据行
			for (let i = 1; i < rows.length; i++) {
				const cells = rows[i].querySelectorAll('[role="cell"]');
				if (cells.length) {
					markdown +=
						'| ' +
						Array.from(cells)
							.map((cell) => {
								// 处理单元格中的代码块
								const code = cell.querySelector('code');
								if (code) {
									return '`' + code.textContent.trim() + '`';
								}
								// 处理普通文本
								return cell.textContent.trim();
							})
							.join(' | ') +
						' |\n';
				}
			}

			return markdown + '\n';
		}
	});

	// 处理图片
	turndownService.addRule('images', {
		filter: 'img',
		replacement: function (content, node) {
			const alt = node.alt || '';
			let src = node.getAttribute('src') || '';
			const title = node.title || '';

			// 保留完整的图片 URL，包括查询参数
			if (src) {
				try {
					// 对于 https://xxx/~gitbook/image?url=https%3A%2F%2F1361005767-files.gitbook.io%2F%7E%2Ffiles%2Fv0%2Fb*** 地址要获取其真实地址：http://1361005767-files.gitbook.io/****
					if (src.contains('/~gitbook/image?url=')) {
						// 从 URL 参数中提取实际的图片地址
						const originalUrl = src.substring(src.indexOf('url=') + 4);
						if (originalUrl) {
							src = decodeURIComponent(originalUrl);
						}
					}

					const imageUrl = new URL(src);

					// 使用完整的 URL 作为文件名的一部分，以确保唯一性
					const urlHash = Buffer.from(src)
						.toString('base64')
						.replace(/[/+=]/g, '_')
						.slice(0, 8);
					const imagePath = path.join(
						'images',
						`${urlHash}_${path.basename(imageUrl.pathname)}`
					);
					// 返回带有本地路径的 Markdown 图片语法
					return `![${alt}](${imagePath}${title ? ' "' + title + '"' : ''})`;
				} catch (error) {
					// 如果 URL 解析失败，使用原始链接
					return `![${alt}](${src}${title ? ' "' + title + '"' : ''})`;
				}
			}
			return '';
		}
	});

	// 处理文件下载链接
	turndownService.addRule('fileDownload', {
		filter: function (node) {
			return node.nodeName === 'A' && node.hasAttribute('download');
		},
		replacement: function (content, node) {
			const fileName = node.getAttribute('download');
			const fileUrl = node.getAttribute('href');
			const fileSize = node.querySelector('.text-xs.text-tint')?.textContent || '';
			const fileType = node.querySelector('.text-sm.opacity-9')?.textContent || '';
			const caption = node.closest('picture')?.querySelector('figcaption')?.textContent || '';

			// 构建Markdown格式的文件下载引用
			let markdown = `[📎 ${fileName}](${fileUrl})`;
			if (fileSize || fileType) {
				markdown += ` (${fileType ? fileType + ', ' : ''}${fileSize})`;
			}
			if (caption) {
				markdown += `\n> ${caption}`;
			}
			return '\n' + markdown + '\n';
		}
	});
}

/**
 * 提取页面内容
 * @param {puppeteer.Page} page 页面实例
 * @returns {string} HTML 内容
 */
async function extractPageContent(page) {
	return await page.evaluate(() => {
		// 查找主要内容区域
		const mainContent = document.querySelector('main');
		if (!mainContent) return '';

		// 提取标题
		const title = document.querySelector('h1');
		const titleHTML = title ? title.outerHTML : '';

		// 提取副标题（描述）
		const subtitle = document.querySelector('p.text-lg.text-tint');
		const subtitleHTML = subtitle ? `<p class="subtitle">${subtitle.textContent}</p>` : '';

		// 提取正文内容
		const contentElement = mainContent.querySelector('.whitespace-pre-wrap');
		const contentHTML = contentElement ? contentElement.innerHTML : '';

		return `${titleHTML}\n${subtitleHTML}\n${contentHTML}`;
	});
}

module.exports = {
	createTurndownService,
	extractPageContent
};
