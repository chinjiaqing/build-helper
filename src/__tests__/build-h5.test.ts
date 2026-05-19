import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import fs from "fs-extra";
import path from "path";
import { buildH5 } from "../uniapp";

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

describe("buildH5", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		vi.mocked(execa).mockResolvedValue({ stdout: "" } as any);
		vi.spyOn(fs, "existsSync").mockReturnValue(true);
		vi.spyOn(fs, "readdir").mockResolvedValue(["index.html"] as any);
	});

	async function runBuildWithTimers(opts: any) {
		const promise = buildH5(opts).catch((e) => { throw e; });
		await vi.advanceTimersByTimeAsync(10000);
		return promise;
	}

	it("当 hbuilder_cli_path 不存在时应该抛出错误", async () => {
		vi.spyOn(fs, "existsSync").mockImplementation((p) => {
			const str = String(p);
			if (str.includes("cli_not_exist")) return false;
			return str.includes("project");
		});

		await expect(
			buildH5({
				project_root: "./project",
				hbuilder_cli_path: "./cli_not_exist.exe",
			})
		).rejects.toThrow("未找到 HBuilderX CLI 程序");
	});

	it("当 project_root 不存在时应该抛出错误", async () => {
		vi.spyOn(fs, "existsSync").mockImplementation((p) => {
			const str = String(p);
			if (str.includes("cli")) return true;
			return !str.includes("project_not_exist");
		});

		await expect(
			buildH5({
				project_root: "./project_not_exist",
				hbuilder_cli_path: "./cli.exe",
			})
		).rejects.toThrow("未找到项目根目录");
	});

	describe("完整流程测试（需要 fake timers）", () => {
		beforeEach(() => {
			vi.useFakeTimers();
		});

		afterEach(async () => {
			vi.useRealTimers();
		});

		it("应该使用默认的 build_branch 为 master", async () => {
			vi.spyOn(fs, "existsSync").mockReturnValue(true);

			await runBuildWithTimers({
				project_root: "./project",
				hbuilder_cli_path: "./cli.exe",
				auto_close: false,
			});

			const calls = vi.mocked(execa).mock.calls;
			const checkoutCalls = calls.filter(
				([cmd, args]) => cmd === "git" && Array.isArray(args) && args.includes("checkout")
			);
			expect(checkoutCalls.length).toBeGreaterThan(0);
			expect(checkoutCalls[0][1]).toContain("master");
		});

		it("应该支持自定义 build_branch 参数", async () => {
			vi.spyOn(fs, "existsSync").mockReturnValue(true);

			await runBuildWithTimers({
				project_root: "./project",
				hbuilder_cli_path: "./cli.exe",
				build_branch: "develop",
				auto_close: false,
			});

			const calls = vi.mocked(execa).mock.calls;
			const checkoutCalls = calls.filter(
				([cmd, args]) => cmd === "git" && Array.isArray(args) && args.includes("checkout")
			);
			expect(checkoutCalls[0][1]).toContain("develop");
		});

		it("应该使用默认的 auto_close 为 true", async () => {
			vi.spyOn(fs, "existsSync").mockReturnValue(true);

			await runBuildWithTimers({
				project_root: "./project",
				hbuilder_cli_path: "./cli.exe",
			});

			const taskkillCall = vi.mocked(execa).mock.calls.find(
				([cmd]) => cmd === "taskkill"
			);
			expect(taskkillCall).toBeTruthy();
		});

		it("当 auto_close 为 false 时不应该关闭 HBuilderX", async () => {
			vi.spyOn(fs, "existsSync").mockReturnValue(true);

			await runBuildWithTimers({
				project_root: "./project",
				hbuilder_cli_path: "./cli.exe",
				auto_close: false,
			});

			const taskkillCall = vi.mocked(execa).mock.calls.find(
				([cmd]) => cmd === "taskkill"
			);
			expect(taskkillCall).toBeFalsy();
		});

		it("非 Git 项目应该跳过 Git 同步步骤", async () => {
			vi.mocked(execa).mockImplementation(async (cmd: string, _args?: any[]) => {
				return {} as any;
			});

			vi.spyOn(fs, "existsSync").mockImplementation((p) => {
				const str = String(p);
				if (str.includes(".git")) return false;
				return true;
			});

			await runBuildWithTimers({
				project_root: "./no-git-project",
				hbuilder_cli_path: "./cli.exe",
				auto_close: false,
			});

			const gitCheckoutCalls = vi.mocked(execa).mock.calls.filter(
				([cmd, args]) => cmd === "git" && Array.isArray(args) && args.includes("checkout")
			);
			expect(gitCheckoutCalls.length).toBe(0);
		});
	});

	describe("产物校验测试", () => {
		beforeEach(() => {
			vi.useFakeTimers();
		});

		afterEach(() => {
			vi.useRealTimers();
		});

		it("当产物目录为空时应该抛出错误", async () => {
			vi.spyOn(fs, "existsSync").mockReturnValue(true);
			vi.spyOn(fs, "readdir").mockResolvedValue([] as any);
			let caughtError: Error | null = null;

			const p = buildH5({
				project_root: "./project",
				hbuilder_cli_path: "./cli.exe",
				auto_close: false,
			}).catch((e) => { caughtError = e; });

			await vi.advanceTimersByTimeAsync(10000);
			await p;
			expect(caughtError).toBeTruthy();
			expect((caughtError as Error).message).toContain("构建产物目录为空");
		});

		it("当产物目录不存在时应该抛出错误", async () => {
			vi.spyOn(fs, "existsSync").mockImplementation((p) => {
				const str = String(p);
				if (str.includes("unpackage")) return false;
				return true;
			});
			let caughtError: Error | null = null;

			const p = buildH5({
				project_root: "./project",
				hbuilder_cli_path: "./cli.exe",
				auto_close: false,
			}).catch((e) => { caughtError = e; });

			await vi.advanceTimersByTimeAsync(10000);
			await p;
			expect(caughtError).toBeTruthy();
			expect((caughtError as Error).message).toContain("构建完成但未找到产物目录");
		});
	});
});
