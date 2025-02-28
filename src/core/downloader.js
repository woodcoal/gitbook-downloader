const puppeteer = require('puppeteer');
const fs = require('fs-extra');
const path = require('path');
const { URL } = require('url');
const { createTurndownService, extractPageContent } = require('./html-parser');
const { escapeRegExp, ensureDirectory, writeFile } = require('../utils');

/**
 * 下载 GitBook 文档
 * @param {string} url GitBook 文档 URL
 * @param {Object} options 配置选项
 * @param {string} options.outputDir 输出目录
 * @param {boolean} options.downloadImages 是否下载图片
 * @param {Object|null} options.auth 认证信息
 * @param {string} options.auth.username 用户名
 * @param {string} options.auth.password 密码
 * @param {Object} options.spinner ora spinner 实例
 */
async function downloadGitbook(url, options) {
	const { outputDir, downloadImages = true, auth = null, spinner } = options;

	// 确保输出目录存在
	await ensureDirectory(outputDir);

	// 初始化 Turndown 服务
	const turndownService = createTurndownService();

	// 启动浏览器
	spinner.text = '启动浏览器...';
	const browser = await puppeteer.launch({
		headless: 'new'
	});

	try {
		const page = await browser.newPage();

		// 添加页面错误监听
		page.on('error', (err) => {
			console.error('页面错误:', err);
		});

		// 添加请求失败监听
		page.on('requestfailed', (request) => {
			console.log(`请求失败: ${request.url()}`);
		});

		// 设置视口大小
		await page.setViewport({ width: 1280, height: 800 });

		// 如果需要认证
		if (auth) {
			spinner.text = '正在进行身份认证...';
			await handleAuthentication(page, url, auth);
		}

		// 访问 URL
		spinner.text = '正在访问文档页面...';
		await page.goto(url, { waitUntil: 'networkidle2' });

		// 等待页面加载完成
		await page.waitForSelector('body', { timeout: 30000 });

		// 获取文档标题
		const title = await page.title();
		spinner.text = `正在处理文档: ${title}`;

		// 判断 URL 是否包含具体路径
		const urlObj = new URL(url);
		const hasPath = urlObj.pathname !== '/' && urlObj.pathname !== '';

		if (hasPath) {
			// 如果包含具体路径，只下载当前页面
			spinner.text = '正在下载单个页面...';
			const content = await extractPageContent(page);
			let markdown = turndownService.turndown(content);

			// 处理图片
			if (downloadImages) {
				const imagesDir = path.join(outputDir, 'images');
				await ensureDirectory(imagesDir);
				markdown = await processImages(page, markdown, imagesDir, urlObj.pathname);
			}

			// 生成文件名
			const fileName = path.basename(urlObj.pathname) || 'index';
			await writeFile(path.join(outputDir, `${fileName}.md`), markdown);
		} else {
			// 如果只有域名，下载整站
			// 解析目录结构
			spinner.text = '正在解析目录结构...';
			const tocStructure = await extractTableOfContents(page);

			// 创建索引文件
			await createIndexFile(outputDir, title, tocStructure);

			// 处理每个页面
			spinner.text = '正在下载文档内容...';
			await processPages(browser, tocStructure, {
				baseUrl: url,
				outputDir,
				downloadImages,
				turndownService,
				spinner
			});
		}
	} finally {
		// 关闭浏览器
		await browser.close();
	}
}

/**
 * 处理身份认证
 * @param {puppeteer.Page} page 页面实例
 * @param {string} url 文档 URL
 * @param {Object} auth 认证信息
 */
async function handleAuthentication(page, url, auth) {
	await page.goto(url);

	// 等待登录表单出现
	await page.waitForSelector('input[type="email"]', { timeout: 10000 }).catch(() => {});

	// 如果找到了登录表单，则进行登录
	const hasLoginForm = (await page.$('input[type="email"]')) !== null;

	if (hasLoginForm) {
		await page.type('input[type="email"]', auth.username);
		await page.type('input[type="password"]', auth.password);
		await page.click('button[type="submit"]');

		// 等待登录完成
		await page.waitForNavigation({ waitUntil: 'networkidle2' });
	}
}

/**
 * 提取目录结构
 * @param {puppeteer.Page} page 页面实例
 * @returns {Array} 目录结构
 */
async function extractTableOfContents(page) {
	return await page.evaluate(() => {
		const tocItems = [];

		// 查找目录容器
		const tocContainer = document.querySelector('[data-testid="table-of-contents"]');
		if (!tocContainer) return tocItems;

		// 查找所有目录项
		const links = tocContainer.querySelectorAll('a[href]');

		// 提取目录项信息
		links.forEach((link) => {
			const href = link.getAttribute('href');
			const title = link.textContent.trim();

			// 忽略外部链接和空链接
			if (href && !href.startsWith('http') && href !== '#') {
				tocItems.push({
					title,
					url: href,
					level: getElementLevel(link)
				});
			}
		});

		return tocItems;

		// 辅助函数：获取元素的层级
		function getElementLevel(element) {
			let level = 1;
			let parent = element.parentElement;

			while (parent && parent !== tocContainer) {
				if (parent.tagName === 'UL' || parent.tagName === 'LI') {
					level++;
				}
				parent = parent.parentElement;
			}

			return Math.max(1, Math.floor(level / 2));
		}
	});
}

/**
 * 创建索引文件
 * @param {string} outputDir 输出目录
 * @param {string} title 文档标题
 * @param {Array} tocStructure 目录结构
 */
async function createIndexFile(outputDir, title, tocStructure) {
	let indexContent = `# ${title}\n\n## 目录\n\n`;

	// 生成目录内容
	tocStructure.forEach((item) => {
		const indent = '  '.repeat(item.level - 1);
		const link = item.url.replace(/^\//, '') + '.md';
		indexContent += `${indent}- [${item.title}](${link})\n`;
	});

	// 写入索引文件
	await writeFile(path.join(outputDir, 'README.md'), indexContent);
}

/**
 * 处理所有页面
 * @param {puppeteer.Browser} browser 浏览器实例
 * @param {Array} tocStructure 目录结构
 * @param {Object} options 配置选项
 */
async function processPages(browser, tocStructure, options) {
	const { baseUrl, outputDir, downloadImages, turndownService, spinner } = options;
	const baseUrlObj = new URL(baseUrl);

	// 创建图片目录
	const imagesDir = path.join(outputDir, 'images');
	if (downloadImages) {
		await ensureDirectory(imagesDir);
	}

	// 处理每个页面
	for (let i = 0; i < tocStructure.length; i++) {
		const item = tocStructure[i];
		spinner.text = `正在处理页面 (${i + 1}/${tocStructure.length}): ${item.title}`;

		// 构建完整 URL
		const pageUrl = new URL(item.url, baseUrlObj).toString();

		// 打开新页面
		const page = await browser.newPage();
		await page.goto(pageUrl, { waitUntil: 'networkidle2' });

		// 等待内容加载完成
		await page.waitForSelector('main', { timeout: 30000 }).catch(() => {});

		// 提取页面内容
		const content = await extractPageContent(page);

		// 转换为 Markdown
		let markdown = turndownService.turndown(content);

		// 处理图片
		if (downloadImages) {
			markdown = await processImages(page, markdown, imagesDir, item.url);
		}

		// 检查内容是否为空
		if (!markdown.trim()) {
			continue; // 跳过空内容文件
		}

		// 生成文件路径，保持原始目录结构
		const relativePath = item.url.replace(/^\//, '');
		const fileDir = path.join(outputDir, path.dirname(relativePath));
		let fileName;

		// 处理首页文件名，使用域名作为前缀
		if (relativePath === '') {
			const domain = baseUrlObj.hostname;
			fileName = `${domain}.md`;
		} else {
			fileName = path.basename(relativePath) + '.md';
		}

		// 确保目录存在
		await ensureDirectory(fileDir);

		// 写入文件
		await writeFile(path.join(fileDir, fileName), markdown);

		// 关闭页面
		await page.close();
	}
}

/**
 * 处理图片
 * @param {puppeteer.Page} page 页面实例
 * @param {string} markdown Markdown 内容
 * @param {string} imagesDir 图片目录
 * @param {string} pageUrl 页面 URL
 * @returns {string} 处理后的 Markdown
 */
async function processImages(page, markdown, imagesDir, pageUrl) {
	// 提取 Markdown 中的图片链接
	const imgRegex = /!\[(.*?)\]\((.*?)\)/g;
	let match;
	let processedMarkdown = markdown;

	// 创建页面特定的图片子目录，保持原始目录结构
	const relativePagePath = pageUrl.replace(/^\//, '');
	const pageImagesDir = path.join(imagesDir, path.dirname(relativePagePath));
	await ensureDirectory(pageImagesDir);

	// 处理每个图片
	const imagePromises = [];
	const imageMap = new Map();
	const downloadResults = new Map();

	while ((match = imgRegex.exec(markdown)) !== null) {
		const [fullMatch, alt, src] = match;

		// 跳过 base64 图片
		if (src.startsWith('data:')) continue;

		// 生成图片文件名，src 可能包含参数，因此获取扩展名时要移除掉参数
		const urlObj = new URL(src);
		const ext = path.extname(urlObj.pathname) || '.png';
		const imgFileName = `image_${Date.now()}_${Math.floor(Math.random() * 1000)}${ext}`;
		const imgPath = path.join(pageImagesDir, imgFileName);
		const relativeImgPath = path
			.join('images', path.dirname(relativePagePath), imgFileName)
			.replace(/\\/g, '/');

		// 保存图片 URL 和本地路径的映射
		imageMap.set(src, { localPath: relativeImgPath, success: false });

		// 下载图片
		imagePromises.push(
			page
				.evaluate(async (imgSrc) => {
					try {
						const response = await fetch(imgSrc);
						if (!response.ok) return null;

						// 对于普通图片或 JSON 解析失败的情况，直接使用原始响应
						const blob = await response.blob();
						return await new Promise((resolve) => {
							const reader = new FileReader();
							reader.onloadend = () => resolve(reader.result);
							reader.readAsDataURL(blob);
						});
					} catch (error) {
						console.error('图片下载错误：', error);
						return null;
					}
				}, src)
				.then(async (base64Data) => {
					if (base64Data) {
						// 从 base64 提取实际数据
						const base64Content = base64Data.split(',')[1];
						if (base64Content) {
							await fs.writeFile(imgPath, Buffer.from(base64Content, 'base64'));
							imageMap.get(src).success = true;
						}
					}
				})
		);
	}

	// 等待所有图片下载完成
	await Promise.all(imagePromises);

	// 替换 Markdown 中的图片链接
	imageMap.forEach(({ localPath, success }, originalSrc) => {
		if (success) {
			// 如果图片下载成功，使用本地路径
			processedMarkdown = processedMarkdown.replace(
				new RegExp(`!\\[(.*?)\\]\\(${escapeRegExp(originalSrc)}(\\s+".*?")?\\)`, 'g'),
				`![$1](${localPath})`
			);
		}
		// 如果下载失败，保留原始链接
	});

	return processedMarkdown;
}

module.exports = {
	downloadGitbook
};
