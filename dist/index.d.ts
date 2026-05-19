/**
 * 同步任务配置接口
 */
interface AutoPushToGitOptions {
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
declare function autoPushToGit(options: AutoPushToGitOptions): Promise<void>;

/**
 * H5 构建配置接口
 */
interface BuildH5Options {
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
declare function buildH5(options: BuildH5Options): Promise<void>;

export { type AutoPushToGitOptions, type BuildH5Options, autoPushToGit, buildH5 };
