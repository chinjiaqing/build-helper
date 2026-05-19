import { describe, it, expect, vi, afterEach } from "vitest";
import Logger from "../logger";

describe("Logger", () => {
	const consoleLogSpy = vi.spyOn(console, "log").mockImplementation(() => {});

	afterEach(() => {
		consoleLogSpy.mockClear();
	});

	it("应该正确设置命名空间前缀", () => {
		const logger = new Logger("test");
		expect(logger).toHaveProperty("prefix", "[test]");
	});

	it("info() 应该输出蓝色信息日志", () => {
		const logger = new Logger("test");
		logger.info("测试信息");
		expect(consoleLogSpy).toHaveBeenCalledTimes(1);
		expect(consoleLogSpy).toHaveBeenCalledWith(
			expect.stringContaining("[test] ℹ 测试信息")
		);
	});

	it("success() 应该输出绿色成功日志", () => {
		const logger = new Logger("test");
		logger.success("操作成功");
		expect(consoleLogSpy).toHaveBeenCalledTimes(1);
		expect(consoleLogSpy).toHaveBeenCalledWith(
			expect.stringContaining("[test] ✔ 操作成功")
		);
	});

	it("warn() 应该输出黄色警告日志", () => {
		const logger = new Logger("test");
		logger.warn("警告信息");
		expect(consoleLogSpy).toHaveBeenCalledTimes(1);
		expect(consoleLogSpy).toHaveBeenCalledWith(
			expect.stringContaining("[test] ⚠ 警告信息")
		);
	});

	it("error() 应该输出红色错误日志", () => {
		const logger = new Logger("test");
		logger.error("错误信息");
		expect(consoleLogSpy).toHaveBeenCalledTimes(1);
		expect(consoleLogSpy).toHaveBeenCalledWith(
			expect.stringContaining("[test] ✘ 错误信息")
		);
	});

	it("step() 应该输出紫色步骤日志（带换行和 >>> 前缀）", () => {
		const logger = new Logger("test");
		logger.step("步骤开始");
		expect(consoleLogSpy).toHaveBeenCalledTimes(1);
		const output = consoleLogSpy.mock.calls[0][0] as string;
		expect(output).toContain("\n>>>");
		expect(output).toContain("[test]");
		expect(output).toContain("步骤开始");
	});
});
