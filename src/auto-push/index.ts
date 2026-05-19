import { execa, Options as ExecaOptions } from "execa";
import fs from "fs-extra";
import path from "path";
import chalk from "chalk";
import Logger from "../logger"

/**
 * 同步任务配置接口
 */
export interface AutoPushToGitOptions {
	/**
	 * 待同步的构建产物目录 (支持绝对路径或相对路径)
	 * 检查逻辑：不存在则报错
	 */
	dist_dir: string;
	/**
	 * 目标 Git 仓库根目录 (支持绝对路径或相对路径)
	 * 检查逻辑：不存在则报错；不是 Git 仓库则报错
	 */
	publish_root: string;
	/** 推送的目标分支 */
	publish_branch: string;
	/**
	 * 部署到仓库内的指定子目录 (相对路径)
	 * 检查逻辑：不存在则自动创建
	 */
	publish_dist_dir?: string;
	/** 在拷贝前是否清空目标子目录 (默认 false) */
	clean_dir?: boolean;
	/** Git 提交信息 */
	message?: string;
}

/**
 * [auto-push] 自动化产物同步至 Git 仓库工具
 */
export async function autoPushToGit(options: AutoPushToGitOptions): Promise<void> {
	const {
		publish_branch,
		publish_dist_dir = "",
		clean_dir = false,
		message = `build: auto push at ${new Date().toLocaleString()}`,
	} = options;

	// 1. 路径标准化处理
	const abs_dist_dir = path.resolve(options.dist_dir);
	const abs_publish_root = path.resolve(options.publish_root);
	const abs_dest_path = path.join(abs_publish_root, publish_dist_dir);

	// 日志格式化工具
	const log = new Logger('auto-push')

	/**
	 * 执行 Git 指令
	 */
	const git_exec = async (args: string[], exec_options?: ExecaOptions) => {
		return execa("git", args, {
			cwd: abs_publish_root,
			...exec_options,
		});
	};

	log.step("正在校验路径安全...");

	try {
		// 校验点 1: 构建产物目录必须存在
		if (!fs.existsSync(abs_dist_dir)) {
			throw new Error(`构建产物目录未找到: ${abs_dist_dir}`);
		}
		log.info(`源产物目录: ${chalk.cyan(abs_dist_dir)}`);

		// 校验点 2: 目标 Git 根目录必须存在
		if (!fs.existsSync(abs_publish_root)) {
			throw new Error(`目标仓库根目录未找到: ${abs_publish_root}`);
		}
		log.info(`目标仓库: ${chalk.cyan(abs_publish_root)}`);

		// 校验点 3: 必须是一个合法的 Git 仓库
		if (!fs.existsSync(path.join(abs_publish_root, ".git"))) {
			throw new Error(`目标目录不是一个有效的 Git 仓库: ${abs_publish_root}`);
		}

		// 校验点 4: 如果子目录不存在，则自动创建
		if (!fs.existsSync(abs_dest_path)) {
			log.warn(`指定发布子目录不存在，正在自动创建: ${publish_dist_dir}`);
			await fs.ensureDir(abs_dest_path);
		}

		// 2. 准备 Git 分支环境
		log.step(`正在准备分支: ${publish_branch}`);
		log.info("正在从远程获取最新数据...");
		await git_exec(["fetch", "origin", "--prune"]);

		try {
			// 切换到目标分支
			await git_exec(["checkout", publish_branch]);
			log.info(`已切换到分支 "${publish_branch}"`);

			// 同步远程代码 (使用 rebase 模式确保提交历史线性)
			log.info("正在同步远程最新代码 (pull --rebase)...");
			await git_exec(["pull", "origin", publish_branch, "--rebase"]);
		} catch (err) {
			// 分支不存在则创建新分支
			log.warn(`远程或本地未找到分支 "${publish_branch}"，正在作为新分支创建...`);
			await git_exec(["checkout", "-b", publish_branch]);
		}

		// 3. 执行文件同步逻辑
		log.step("正在同步文件内容...");

		// 如果开启了清空，则清空目标发布目录
		if (clean_dir) {
			log.warn(`正在清空发布目录: ${abs_dest_path}`);
			await fs.emptyDir(abs_dest_path);
		}

		log.info("正在拷贝构建产物...");
		await fs.copy(abs_dist_dir, abs_dest_path, {
			overwrite: true,
			filter: (src) => !src.includes(".git"), // 严格禁止拷贝 .git 相关元数据
		});

		// 4. Git 提交与推送
		log.step("正在处理 Git 提交与推送...");

		log.info("正在将文件加入暂存区...");
		await git_exec(["add", "."]);

		// 检查是否有内容变更
		const { stdout: git_status } = await git_exec(["status", "--porcelain"]);
		if (!git_status) {
			log.success("检测到内容无任何变化，跳过推送任务。");
			return;
		}

		log.info("正在提交变更...");
		await git_exec(["commit", "-m", message]);

		log.info(`正在推送到远程 origin/${publish_branch}...`);
		await git_exec(["push", "origin", publish_branch]);

		log.success("自动化同步与推送任务圆满完成！\n");
	} catch (error: any) {
		log.error("同步过程中发生严重错误:");
		console.error(chalk.red(error.message));
		// 抛出错误以便在 CI/CD 环境中能够被捕获
		throw error;
	}
}
