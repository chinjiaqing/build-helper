import { execa } from "execa";
import fs from "fs-extra";
import path from "path";
import chalk from "chalk";
import Logger from "../logger";

/**
 * H5 构建配置接口
 */
export interface BuildH5Options {
	/**
	 * HBuilderX 项目根目录 (绝对路径)
	 * 检查逻辑：不存在则报错
	 */
	project_root: string;
	/**
	 * HBuilderX cli.exe 所在路径 (绝对路径)
	 * 检查逻辑：不存在则报错
	 */
	hbuilder_cli_path: string;
	/**
	 * 要构建的分支名称 (默认 master)
	 */
	build_branch?: string;
	/**
	 * 构建完成后是否自动关闭 HBuilderX 进程 (默认 true)
	 */
	auto_close?: boolean;
}

/**
 * [build-helper] HBuilderX H5 自动化构建工具
 * 逻辑流：Git 环境准备 -> 环境校验 -> 唤起编辑器 -> 执行发布指令 -> 校验产物
 */
export async function buildH5(options: BuildH5Options): Promise<void> {
	const { project_root, hbuilder_cli_path, build_branch = "master", auto_close = true } = options;

	// 路径标准化
	const abs_project_root = path.resolve(project_root);
	const abs_cli_path = path.resolve(hbuilder_cli_path);

	// H5 默认产物路径：项目根目录/unpackage/dist/build/web
	const abs_dist_path = path.join(abs_project_root, "unpackage", "dist", "build", "web");

	// 日志工具
	const log = new Logger("uniapp build:h5");

	// 内部执行辅助
	const git_exec = async (args: string[]) => execa("git", args, { cwd: abs_project_root });
	const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

	try {
		log.step("正在检查环境与 Git 状态...");

		// 1. 基础环境校验
		if (!fs.existsSync(abs_cli_path)) {
			throw new Error(`未找到 HBuilderX CLI 程序: ${abs_cli_path}`);
		}
		if (!fs.existsSync(abs_project_root)) {
			throw new Error(`未找到项目根目录: ${abs_project_root}`);
		}

		// 2. Git 逻辑处理
		if (fs.existsSync(path.join(abs_project_root, ".git"))) {
			log.info(`检测到 Git 仓库，准备同步分支: ${chalk.cyan(build_branch)}`);

			// 获取远程更新
			await git_exec(["fetch", "origin", "--prune"]);

			// 检查本地是否有未提交的改动
			const { stdout: status } = await git_exec(["status", "--porcelain"]);
			if (status) {
				log.warn("注意：本地存在未提交的更改，尝试切换分支可能会失败。");
			}

			// 切换并同步分支
			try {
				log.info(`正在切换到分支: ${build_branch}`);
				await git_exec(["checkout", build_branch]);

				log.info("正在同步远程代码 (pull --rebase)...");
				await git_exec(["pull", "origin", build_branch, "--rebase"]);
			} catch (err: any) {
				throw new Error(`Git 分支同步失败，请检查本地冲突或远程分支是否存在: ${err.message}`);
			}
		} else {
			log.warn("未检测到 .git 目录，跳过 Git 同步步骤。");
		}

		// 3. 唤起 HBuilderX 并打开项目
		log.step("正在唤起 HBuilderX 编辑器...");
		log.info(`项目路径: ${chalk.cyan(abs_project_root)}`);

		await execa(abs_cli_path, ["open", "--project", abs_project_root]);

		log.info("等待编辑器初始化 (5秒)...");
		await sleep(5000);

		// 4. 执行 H5 打包发布
		log.step("正在执行 H5 平台打包构建...");
		const build_process = execa(abs_cli_path, ["publish", "--platform", "h5", "--project", abs_project_root]);

		// 将构建输出实时打印到控制台
		build_process.stdout?.pipe(process.stdout);
		build_process.stderr?.pipe(process.stderr);

		await build_process;

		// 5. 产物校验
		log.step("正在校验构建产物...");
		if (!fs.existsSync(abs_dist_path)) {
			throw new Error(`构建完成但未找到产物目录: ${abs_dist_path}\n请检查 HBuilderX 内部错误日志。`);
		}

		const files = await fs.readdir(abs_dist_path);
		if (files.length === 0) {
			throw new Error(`构建产物目录为空: ${abs_dist_path}`);
		}

		log.success(`H5 构建成功！产物位置: ${abs_dist_path}`);

		// 6. 收尾工作
		if (auto_close) {
			log.step("正在关闭 HBuilderX 进程...");
			try {
				// Windows 平台清理进程
				await execa("taskkill", ["/F", "/IM", "HBuilderX.exe", "/T"]);
				log.success("HBuilderX 已关闭。");
			} catch (e) {
				log.warn("未能强制关闭 HBuilderX，可能进程已自行退出。");
			}
		}
	} catch (error: any) {
		log.error("H5 构建流程失败:");
		console.error(chalk.red(error.message));
		throw error;
	}
}
