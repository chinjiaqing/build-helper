#!/usr/bin/env node

import { execa } from "execa";
import fs from "fs-extra";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");

const log = {
	info: (msg) => console.log(`\x1b[34m[publish]\x1b[0m ℹ ${msg}`),
	success: (msg) => console.log(`\x1b[32m\x1b[1m[publish]\x1b[0m ✔ ${msg}`),
	step: (msg) => console.log(`\x1b[35m\x1b[1m\n>>> ${msg}\x1b[0m`),
	error: (msg) => console.error(`\x1b[31m\x1b[1m[publish]\x1b[0m ✘ ${msg}`),
};

/**
 * 读取 package.json 并递增 patch 版本号
 */
function bumpPatchVersion() {
	const pkgPath = path.join(ROOT, "package.json");
	const pkg = fs.readJSONSync(pkgPath);

	const [major, minor, patch] = pkg.version.split(".").map(Number);
	const newVersion = `${major}.${minor}.${patch + 1}`;

	pkg.version = newVersion;
	fs.writeJSONSync(pkgPath, pkg, { spaces: "\t" });

	log.info(`版本号: ${pkg.version} → \x1b[36m${newVersion}\x1b[0m`);
	return newVersion;
}

async function gitExec(args, options = {}) {
	return execa("git", args, { cwd: ROOT, ...options });
}

async function main() {
	try {
		log.step("Step 1/4 - 执行构建...");
		await execa("npm", ["run", "build"], { cwd: ROOT, stdio: "inherit" });
		log.success("构建完成");

		log.step("Step 2/4 - 版本号递增 (patch +1)...");
		const newVersion = bumpPatchVersion();
		log.success(`新版本: v${newVersion}`);

		log.step("Step 3/4 - Git 提交与推送...");

		// 暂存变更
		await gitExec(["add", "package.json", "dist"]);
		await gitExec(["commit", `-m chore(release): v${newVersion} [skip ci]`]);

		// 确保在 master 分支
		const { stdout: branch } = await gitExec(["rev-parse", "--abbrev-ref", "HEAD"]);
		if (branch.trim() !== "master") {
			log.warn(`当前分支 ${branch.trim()}，切换到 master...`);
			await gitExec(["checkout", "master"]);
		}

		await gitExec(["pull", "origin", "master", "--rebase"]);
		await gitExec(["push", "origin", "master"]);

		log.success("已推送到 origin/master");
		log.step("Step 4/4 - 完成！");
		console.log(`\n  🎉 发布成功！版本 \x1b[36mv${newVersion}\x1b[0m 已推送到 master\n`);
	} catch (err) {
		log.error("发布流程失败:");
		console.error(err.message);
		process.exit(1);
	}
}

main();
