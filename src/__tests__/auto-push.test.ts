import { describe, it, expect, vi, beforeEach } from "vitest";
import fs from "fs-extra";
import path from "path";
import { autoPushToGit } from "../auto-push";

// Mock execa
vi.mock("execa", () => ({
	execa: vi.fn(),
}));

vi.mock("../logger", () => ({
	default: class MockLogger {
		info = vi.fn();
		success = vi.fn();
		warn = vi.fn();
		error = vi.fn();
		step = vi.fn();
	},
}));

const { execa } = await import("execa");

describe("autoPushToGit", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		vi.mocked(execa).mockResolvedValue({ stdout: "" } as any);
		vi.spyOn(fs, "existsSync").mockReturnValue(true);
		vi.spyOn(fs, "ensureDir").mockResolvedValue(undefined as any);
		vi.spyOn(fs, "copy").mockResolvedValue(undefined as any);
		vi.spyOn(fs, "emptyDir").mockResolvedValue(undefined as any);
	});

	it("当 dist_dir 不存在时应该抛出错误", async () => {
		vi.spyOn(fs, "existsSync").mockImplementation((p) => {
			return !String(p).includes("dist_dir_missing");
		});

		await expect(
			autoPushToGit({
				dist_dir: "./dist_dir_missing",
				publish_root: "./target",
				publish_branch: "main",
			})
		).rejects.toThrow("构建产物目录未找到");
	});

	it("当 publish_root 不存在时应该抛出错误", async () => {
		vi.spyOn(fs, "existsSync").mockImplementation((p) => {
			const str = String(p);
			if (str.includes("dist_dir")) return true;
			if (str.includes("publish_missing")) return false;
			return true; // .git 目录
		});

		await expect(
			autoPushToGit({
				dist_dir: "./dist_dir",
				publish_root: "./publish_missing",
				publish_branch: "main",
			})
		).rejects.toThrow("目标仓库根目录未找到");
	});

	it("当不是 Git 仓库时应该抛出错误", async () => {
		vi.spyOn(fs, "existsSync").mockImplementation((p) => {
			const str = String(p);
			if (str.includes(".git")) return false;
			return true;
		});

		await expect(
			autoPushToGit({
				dist_dir: "./dist",
				publish_root: "./target",
				publish_branch: "main",
			})
		).rejects.toThrow("不是一个有效的 Git 仓库");
	});

	it("应该使用默认参数值", async () => {
		vi.spyOn(fs, "existsSync").mockReturnValue(true);

		await autoPushToGit({
			dist_dir: "./dist",
			publish_root: "./target",
			publish_branch: "main",
		});

		// 验证 execa 被调用
		expect(execa).toHaveBeenCalled();

		// 验证 git fetch 被调用
		const fetchCall = vi.mocked(execa).mock.calls.find(
			(args) => args[1]?.includes?.("fetch")
		);
		expect(fetchCall).toBeTruthy();
	});

	it("应该支持自定义提交信息", async () => {
		vi.spyOn(fs, "existsSync").mockReturnValue(true);

		// 模拟 git status 有变更
		vi.mocked(execa).mockImplementation(async (cmd: string, args?: any[]) => {
			if (Array.isArray(args) && args.includes("status")) {
				return { stdout: " M package.json" } as any;
			}
			return {} as any;
		});

		await autoPushToGit({
			dist_dir: "./dist",
			publish_root: "./target",
			publish_branch: "main",
			message: "chore: custom message",
		});

		// 查找 commit 调用是否包含自定义消息
		const commitCall = vi.mocked(execa).mock.calls.find(
			(args) => {
				const gitArgs = args[1];
				return Array.isArray(gitArgs) && gitArgs.includes("commit") && gitArgs.includes("chore: custom message");
			}
		);
		expect(commitCall).toBeTruthy();
	});

	it("当 clean_dir 为 true 时应该清空目录", async () => {
		vi.spyOn(fs, "existsSync").mockReturnValue(true);
		const emptyDirSpy = vi.spyOn(fs, "emptyDir").mockResolvedValue(undefined as any);

		await autoPushToGit({
			dist_dir: "./dist",
			publish_root: "./target",
			publish_branch: "main",
			clean_dir: true,
		});

		expect(emptyDirSpy).toHaveBeenCalled();
	});

	it("当 clean_dir 为 false 时不应调用 emptyDir", async () => {
		vi.spyOn(fs, "existsSync").mockReturnValue(true);
		const emptyDirSpy = vi.spyOn(fs, "emptyDir").mockResolvedValue(undefined as any);

		await autoPushToGit({
			dist_dir: "./dist",
			publish_root: "./target",
			publish_branch: "main",
			clean_dir: false,
		});

		expect(emptyDirSpy).not.toHaveBeenCalled();
	});

	it("应该执行完整的 Git 操作流程", async () => {
		vi.spyOn(fs, "existsSync").mockReturnValue(true);

		await autoPushToGit({
			dist_dir: "./dist",
			publish_root: "./target",
			publish_branch: "gh-pages",
		});

		const calls = vi.mocked(execa).mock.calls;

		// 验证关键步骤被调用
		const operations = calls.map(([_, args]) => args.join(" "));
		expect(operations.some(op => op.includes("fetch"))).toBe(true);
		expect(operations.some(op => op.includes("checkout"))).toBe(true);
		expect(operations.some(op => op.includes("add"))).toBe(true);
	});
});
