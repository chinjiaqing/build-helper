import { defineConfig } from "vitest/config";

export default defineConfig({
	test: {
		// 忽略 fake timers 异步链中的 unhandled rejection
		onUnhandledRejection: "silent",
	},
});
