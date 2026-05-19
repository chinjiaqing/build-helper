import chalk from "chalk";

/**
 * 统一日志管理类
 */
export default class Logger {
	private prefix: string;

	constructor(namespace: string) {
		this.prefix = `[${namespace}]`;
	}

	info(msg: string) {
		console.log(chalk.blue(`${this.prefix} ℹ ${msg}`));
	}

	success(msg: string) {
		console.log(chalk.green.bold(`${this.prefix} ✔ ${msg}`));
	}

	warn(msg: string) {
		console.log(chalk.yellow(`${this.prefix} ⚠ ${msg}`));
	}

	error(msg: string) {
		console.log(chalk.red.bold(`${this.prefix} ✘ ${msg}`));
	}

	step(msg: string) {
		console.log(chalk.magenta.bold(`\n>>> ${this.prefix} ${msg}`));
	}
}
