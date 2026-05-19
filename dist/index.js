// src/auto-push/index.ts
import { execa } from "execa";
import fs from "fs-extra";
import path from "path";
import chalk2 from "chalk";

// src/logger.ts
import chalk from "chalk";
var Logger = class {
  prefix;
  constructor(namespace) {
    this.prefix = `[${namespace}]`;
  }
  info(msg) {
    console.log(chalk.blue(`${this.prefix} \u2139 ${msg}`));
  }
  success(msg) {
    console.log(chalk.green.bold(`${this.prefix} \u2714 ${msg}`));
  }
  warn(msg) {
    console.log(chalk.yellow(`${this.prefix} \u26A0 ${msg}`));
  }
  error(msg) {
    console.log(chalk.red.bold(`${this.prefix} \u2718 ${msg}`));
  }
  step(msg) {
    console.log(chalk.magenta.bold(`
>>> ${this.prefix} ${msg}`));
  }
};

// src/auto-push/index.ts
async function autoPushToGit(options) {
  const {
    publish_branch,
    publish_dist_dir = "",
    clean_dir = false,
    message = `build: auto push at ${(/* @__PURE__ */ new Date()).toLocaleString()}`
  } = options;
  const abs_dist_dir = path.resolve(options.dist_dir);
  const abs_publish_root = path.resolve(options.publish_root);
  const abs_dest_path = path.join(abs_publish_root, publish_dist_dir);
  const log = new Logger("auto-push");
  const git_exec = async (args, exec_options) => {
    return execa("git", args, {
      cwd: abs_publish_root,
      ...exec_options
    });
  };
  log.step("\u6B63\u5728\u6821\u9A8C\u8DEF\u5F84\u5B89\u5168...");
  try {
    if (!fs.existsSync(abs_dist_dir)) {
      throw new Error(`\u6784\u5EFA\u4EA7\u7269\u76EE\u5F55\u672A\u627E\u5230: ${abs_dist_dir}`);
    }
    log.info(`\u6E90\u4EA7\u7269\u76EE\u5F55: ${chalk2.cyan(abs_dist_dir)}`);
    if (!fs.existsSync(abs_publish_root)) {
      throw new Error(`\u76EE\u6807\u4ED3\u5E93\u6839\u76EE\u5F55\u672A\u627E\u5230: ${abs_publish_root}`);
    }
    log.info(`\u76EE\u6807\u4ED3\u5E93: ${chalk2.cyan(abs_publish_root)}`);
    if (!fs.existsSync(path.join(abs_publish_root, ".git"))) {
      throw new Error(`\u76EE\u6807\u76EE\u5F55\u4E0D\u662F\u4E00\u4E2A\u6709\u6548\u7684 Git \u4ED3\u5E93: ${abs_publish_root}`);
    }
    if (!fs.existsSync(abs_dest_path)) {
      log.warn(`\u6307\u5B9A\u53D1\u5E03\u5B50\u76EE\u5F55\u4E0D\u5B58\u5728\uFF0C\u6B63\u5728\u81EA\u52A8\u521B\u5EFA: ${publish_dist_dir}`);
      await fs.ensureDir(abs_dest_path);
    }
    log.step(`\u6B63\u5728\u51C6\u5907\u5206\u652F: ${publish_branch}`);
    log.info("\u6B63\u5728\u4ECE\u8FDC\u7A0B\u83B7\u53D6\u6700\u65B0\u6570\u636E...");
    await git_exec(["fetch", "origin", "--prune"]);
    try {
      await git_exec(["checkout", publish_branch]);
      log.info(`\u5DF2\u5207\u6362\u5230\u5206\u652F "${publish_branch}"`);
      log.info("\u6B63\u5728\u540C\u6B65\u8FDC\u7A0B\u6700\u65B0\u4EE3\u7801 (pull --rebase)...");
      await git_exec(["pull", "origin", publish_branch, "--rebase"]);
    } catch (err) {
      log.warn(`\u8FDC\u7A0B\u6216\u672C\u5730\u672A\u627E\u5230\u5206\u652F "${publish_branch}"\uFF0C\u6B63\u5728\u4F5C\u4E3A\u65B0\u5206\u652F\u521B\u5EFA...`);
      await git_exec(["checkout", "-b", publish_branch]);
    }
    log.step("\u6B63\u5728\u540C\u6B65\u6587\u4EF6\u5185\u5BB9...");
    if (clean_dir) {
      log.warn(`\u6B63\u5728\u6E05\u7A7A\u53D1\u5E03\u76EE\u5F55: ${abs_dest_path}`);
      await fs.emptyDir(abs_dest_path);
    }
    log.info("\u6B63\u5728\u62F7\u8D1D\u6784\u5EFA\u4EA7\u7269...");
    await fs.copy(abs_dist_dir, abs_dest_path, {
      overwrite: true,
      filter: (src) => !src.includes(".git")
      // 严格禁止拷贝 .git 相关元数据
    });
    log.step("\u6B63\u5728\u5904\u7406 Git \u63D0\u4EA4\u4E0E\u63A8\u9001...");
    log.info("\u6B63\u5728\u5C06\u6587\u4EF6\u52A0\u5165\u6682\u5B58\u533A...");
    await git_exec(["add", "."]);
    const { stdout: git_status } = await git_exec(["status", "--porcelain"]);
    if (!git_status) {
      log.success("\u68C0\u6D4B\u5230\u5185\u5BB9\u65E0\u4EFB\u4F55\u53D8\u5316\uFF0C\u8DF3\u8FC7\u63A8\u9001\u4EFB\u52A1\u3002");
      return;
    }
    log.info("\u6B63\u5728\u63D0\u4EA4\u53D8\u66F4...");
    await git_exec(["commit", "-m", message]);
    log.info(`\u6B63\u5728\u63A8\u9001\u5230\u8FDC\u7A0B origin/${publish_branch}...`);
    await git_exec(["push", "origin", publish_branch]);
    log.success("\u81EA\u52A8\u5316\u540C\u6B65\u4E0E\u63A8\u9001\u4EFB\u52A1\u5706\u6EE1\u5B8C\u6210\uFF01\n");
  } catch (error) {
    log.error("\u540C\u6B65\u8FC7\u7A0B\u4E2D\u53D1\u751F\u4E25\u91CD\u9519\u8BEF:");
    console.error(chalk2.red(error.message));
    throw error;
  }
}

// src/uniapp/build-h5.ts
import { execa as execa2 } from "execa";
import fs2 from "fs-extra";
import path2 from "path";
import chalk3 from "chalk";
async function buildH5(options) {
  const { project_root, hbuilder_cli_path, build_branch = "master", auto_close = true } = options;
  const abs_project_root = path2.resolve(project_root);
  const abs_cli_path = path2.resolve(hbuilder_cli_path);
  const abs_dist_path = path2.join(abs_project_root, "unpackage", "dist", "build", "web");
  const log = new Logger("uniapp build:h5");
  const git_exec = async (args) => execa2("git", args, { cwd: abs_project_root });
  const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
  try {
    log.step("\u6B63\u5728\u68C0\u67E5\u73AF\u5883\u4E0E Git \u72B6\u6001...");
    if (!fs2.existsSync(abs_cli_path)) {
      throw new Error(`\u672A\u627E\u5230 HBuilderX CLI \u7A0B\u5E8F: ${abs_cli_path}`);
    }
    if (!fs2.existsSync(abs_project_root)) {
      throw new Error(`\u672A\u627E\u5230\u9879\u76EE\u6839\u76EE\u5F55: ${abs_project_root}`);
    }
    if (fs2.existsSync(path2.join(abs_project_root, ".git"))) {
      log.info(`\u68C0\u6D4B\u5230 Git \u4ED3\u5E93\uFF0C\u51C6\u5907\u540C\u6B65\u5206\u652F: ${chalk3.cyan(build_branch)}`);
      await git_exec(["fetch", "origin", "--prune"]);
      const { stdout: status } = await git_exec(["status", "--porcelain"]);
      if (status) {
        log.warn("\u6CE8\u610F\uFF1A\u672C\u5730\u5B58\u5728\u672A\u63D0\u4EA4\u7684\u66F4\u6539\uFF0C\u5C1D\u8BD5\u5207\u6362\u5206\u652F\u53EF\u80FD\u4F1A\u5931\u8D25\u3002");
      }
      try {
        log.info(`\u6B63\u5728\u5207\u6362\u5230\u5206\u652F: ${build_branch}`);
        await git_exec(["checkout", build_branch]);
        log.info("\u6B63\u5728\u540C\u6B65\u8FDC\u7A0B\u4EE3\u7801 (pull --rebase)...");
        await git_exec(["pull", "origin", build_branch, "--rebase"]);
      } catch (err) {
        throw new Error(`Git \u5206\u652F\u540C\u6B65\u5931\u8D25\uFF0C\u8BF7\u68C0\u67E5\u672C\u5730\u51B2\u7A81\u6216\u8FDC\u7A0B\u5206\u652F\u662F\u5426\u5B58\u5728: ${err.message}`);
      }
    } else {
      log.warn("\u672A\u68C0\u6D4B\u5230 .git \u76EE\u5F55\uFF0C\u8DF3\u8FC7 Git \u540C\u6B65\u6B65\u9AA4\u3002");
    }
    log.step("\u6B63\u5728\u5524\u8D77 HBuilderX \u7F16\u8F91\u5668...");
    log.info(`\u9879\u76EE\u8DEF\u5F84: ${chalk3.cyan(abs_project_root)}`);
    await execa2(abs_cli_path, ["open", "--project", abs_project_root]);
    log.info("\u7B49\u5F85\u7F16\u8F91\u5668\u521D\u59CB\u5316 (5\u79D2)...");
    await sleep(5e3);
    log.step("\u6B63\u5728\u6267\u884C H5 \u5E73\u53F0\u6253\u5305\u6784\u5EFA...");
    const build_process = execa2(abs_cli_path, ["publish", "--platform", "h5", "--project", abs_project_root]);
    build_process.stdout?.pipe(process.stdout);
    build_process.stderr?.pipe(process.stderr);
    await build_process;
    log.step("\u6B63\u5728\u6821\u9A8C\u6784\u5EFA\u4EA7\u7269...");
    if (!fs2.existsSync(abs_dist_path)) {
      throw new Error(`\u6784\u5EFA\u5B8C\u6210\u4F46\u672A\u627E\u5230\u4EA7\u7269\u76EE\u5F55: ${abs_dist_path}
\u8BF7\u68C0\u67E5 HBuilderX \u5185\u90E8\u9519\u8BEF\u65E5\u5FD7\u3002`);
    }
    const files = await fs2.readdir(abs_dist_path);
    if (files.length === 0) {
      throw new Error(`\u6784\u5EFA\u4EA7\u7269\u76EE\u5F55\u4E3A\u7A7A: ${abs_dist_path}`);
    }
    log.success(`H5 \u6784\u5EFA\u6210\u529F\uFF01\u4EA7\u7269\u4F4D\u7F6E: ${abs_dist_path}`);
    if (auto_close) {
      log.step("\u6B63\u5728\u5173\u95ED HBuilderX \u8FDB\u7A0B...");
      try {
        await execa2("taskkill", ["/F", "/IM", "HBuilderX.exe", "/T"]);
        log.success("HBuilderX \u5DF2\u5173\u95ED\u3002");
      } catch (e) {
        log.warn("\u672A\u80FD\u5F3A\u5236\u5173\u95ED HBuilderX\uFF0C\u53EF\u80FD\u8FDB\u7A0B\u5DF2\u81EA\u884C\u9000\u51FA\u3002");
      }
    }
  } catch (error) {
    log.error("H5 \u6784\u5EFA\u6D41\u7A0B\u5931\u8D25:");
    console.error(chalk3.red(error.message));
    throw error;
  }
}
export {
  autoPushToGit,
  buildH5
};
