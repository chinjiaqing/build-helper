# Build H5 (UniApp)

> 🚀 基于 HBuilderX CLI 的 UniApp H5 平台自动化构建工具

---

## 功能特性

- ✅ 自动唤起 HBuilderX 编辑器并打开项目
- ✅ **自动切换并同步 Git 分支**（fetch + checkout + pull --rebase）
- ✅ 执行 H5 平台打包发布命令
- ✅ 自动校验构建产物是否生成成功
- ✅ 构建完成后自动关闭 HBuilderX 进程（可配置）
- ✅ 实时输出构建日志到控制台

---

## 安装

```bash
npm install build-helper
```

---

## 前置要求

- **HBuilderX**：需要安装 [HBuilderX](https://www.dcloud.io/hbuilderx.html) 开发工具
- **UniApp 项目**：确保项目是一个标准的 UniApp 项目结构

---

## API 参考

### `buildH5(options)`

主函数，用于自动化执行 UniApp 项目的 H5 平台构建。

#### 参数说明

| 参数 | 类型 | 必填 | 默认值 | 说明 |
|------|------|------|--------|------|
| `project_root` | `string` | 是 | - | HBuilderX 项目根目录（绝对路径），不存在则报错 |
| `hbuilder_cli_path` | `string` | 是 | - | HBuilderX cli.exe 所在路径（绝对路径），不存在则报错 |
| `build_branch` | `string` | 否 | `"master"` | 要构建的分支名称，构建前会自动切换并同步该分支 |
| `auto_close` | `boolean` | 否 | `true` | 构建完成后是否自动关闭 HBuilderX 进程 |

#### TypeScript 类型定义

```typescript
interface BuildH5Options {
  /** HBuilderX 项目根目录 (绝对路径) */
  project_root: string;
  /** HBuilderX cli.exe 所在路径 (绝对路径) */
  hbuilder_cli_path: string;
  /** 要构建的分支名称 (默认 master) */
  build_branch?: string;
  /** 构建完成后是否自动关闭 HBuilderX 进程 (默认 true) */
  auto_close?: boolean;
}
```

#### 构建产物输出位置

默认产物路径：`{project_root}/unpackage/dist/build/web`

---

## 使用示例

### 基础用法

```typescript
import { buildH5 } from 'build-helper';

await buildH5({
  project_root: 'D:/projects/my-uniapp',
  hbuilder_cli_path: 'D:/HBuilderX/cli.exe',
});
```

### 保持编辑器开启（调试用）

```typescript
import { buildH5 } from 'build-helper';

await buildH5({
  project_root: 'D:/projects/my-uniapp',
  hbuilder_cli_path: 'D:/HBuilderX/cli.exe',
  auto_close: false,  // 构建后不关闭 HBuilderX
});
```

### 指定构建分支

```typescript
import { buildH5 } from 'build-helper';

await buildH5({
  project_root: 'D:/projects/my-uniapp',
  hbuilder_cli_path: 'D:/HBuilderX/cli.exe',
  build_branch: 'develop',  // 切换到 develop 分支后再构建
});
```

### 结合 autoPushToGit 使用（CI/CD 部署）

```typescript
import { buildH5, autoPushToGit } from 'build-helper';

async function buildAndDeploy() {
  // 1. 构建 H5
  await buildH5({
    project_root: process.env.PROJECT_ROOT!,
    hbuilder_cli_path: process.env.HBUILDER_CLI_PATH!,
    auto_close: true,
  });

  // 2. 推送到 Git Pages 仓库
  await autoPushToGit({
    dist_dir: `${process.env.PROJECT_ROOT}/unpackage/dist/build/web`,
    publish_root: './gh-pages',
    publish_branch: 'main',
    message: 'chore: deploy H5 production build',
  });
}

buildAndDeploy().catch(console.error);
```

---

## 工作流程

```
1. 环境校验 → 检查 CLI 路径和项目路径是否存在
2. Git 分支同步（可选）→ 检测 .git 目录后自动 fetch + checkout + pull --rebase
3. 唤起编辑器 → 执行 cli open 打开项目（等待 5 秒初始化）
4. 执行构建 → 执行 publish --platform h5 命令（实时输出日志）
5. 产物校验 → 检查 unpackage/dist/build/web 是否存在且非空
6. 收尾工作 → 可选：自动关闭 HBuilderX.exe 进程
```

---

## 注意事项

1. **平台限制**：目前仅支持 **Windows** 平台（使用 `taskkill` 关闭进程）
2. **HBuilderX 版本**：请确保使用支持 CLI 的 HBuilderX 版本
3. **等待时间**：编辑器初始化有 5 秒等待时间，用户同步登录账号信息
4. **产物路径**：默认产物位于 `unpackage/dist/build/web`，这是 HBuilderX 的标准输出目录
5. **并发问题**：同一时间只能运行一个构建任务，避免多个实例冲突
6. **Git 分支同步**：如果项目包含 `.git` 目录，构建前会自动切换到 `build_branch` 指定的分支（默认 `master`）并执行 `pull --rebase` 同步远程代码；若本地有未提交更改会发出警告
7. **非 Git 项目**：未检测到 `.git` 目录时，会跳过 Git 同步步骤直接进行构建

---

## 常见问题

### Q: 提示 "未找到 HBuilderX CLI 程序"

**A:** 确认 `hbuilder_cli_path` 路径正确。通常位于：
- Windows: `{HBuilderX安装目录}/cli.exe`
- 示例: `D:/HBuilderX/cli.exe`

### Q: 构建产物为空或不存在

**A:** 可能原因：
- 项目配置错误（检查 manifest.json）
- HBuilderX 内部编译错误（查看 HBuilderX 日志）
- 网络问题导致依赖下载失败

### Q: HBuilderX 无法自动关闭

**A:** 可能是进程被其他程序占用或权限不足。可以手动关闭或在任务管理器中结束进程。

### Q: 提示 "Git 分支同步失败"

**A:** 可能原因：
- 本地有未提交的更改导致分支切换冲突（请先提交或暂存）
- 远程分支 `build_branch` 指定的分支不存在
- 本地与远程存在合并冲突（需要手动解决）
