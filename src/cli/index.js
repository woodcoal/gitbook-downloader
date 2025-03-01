const { program } = require('commander');
const ora = require('ora');
const chalk = require('chalk');
const { downloadGitbook } = require('../core/downloader');
const { version } = require('../../package.json');

/**
 * 初始化命令行界面
 */
function initializeCLI() {
	program
		.version(version)
		.description('一个用于下载 GitBook 文档的工具，支持将在线文档转换为本地 Markdown 文件')
		.argument('<url>', 'GitBook 文档的 URL 地址')
		.option('-a, --all', '是否强制全站下载，默认仅 URL 为域名才全站下载', false)
		.option('-o, --output <directory>', '输出目录', './output')
		.option('-i, --images', '是否下载图片资源', true)
		.option('-a, --auth', '是否需要身份认证（用于私有文档）', false)
		.option('-u, --username <username>', '认证用户名')
		.option('-p, --password <password>', '认证密码')
		.action(handleDownload);

	program.parse(process.argv);
}

/**
 * 处理下载命令
 * @param {string} url GitBook 文档的 URL 地址
 * @param {Object} options 命令行选项
 */
async function handleDownload(url, options) {
	const spinner = ora('正在准备下载...').start();

	try {
		spinner.text = '正在分析文档结构...';

		await downloadGitbook(url, {
			all: options.all,
			outputDir: options.output,
			downloadImages: options.images,
			auth: options.auth
				? {
						username: options.username,
						password: options.password
				  }
				: null,
			spinner
		});

		spinner.succeed(chalk.green('文档下载完成！'));
		console.log(chalk.blue(`文档已保存至: ${options.output}`));
	} catch (error) {
		spinner.fail(chalk.red('下载失败'));
		console.error(chalk.red(`错误信息: ${error.message}`));
		process.exit(1);
	}
}

module.exports = {
	initializeCLI
};
