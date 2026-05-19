# Auto Push to Git

> 🚀 自动化构建产物同步至 Git 仓库工具，支持自动提交与推送

---

## 功能特性

- ✅ 自动将构建产物拷贝到目标 Git 仓库
- ✅ 支持指定发布子目录
- ✅ 自动处理 Git 分支切换与同步（pull --rebase）
- ✅ 智能跳过无变更的提交
- ✅ 支持清空目标目录后再同步
- ✅ 完善的错误处理与日志输出

---

## 安装

```bash
npm install build-helper
```

---

## API 参考

### `autoPushToGit(options)`

主函数，用于自动化同步构建产物到 Git 仓库。

#### 参数说明

| 参数 | 类型 | 必填 | 默认值 | 说明 |
|------|------|------|--------|------|
| `dist_dir` | `string` | 是 | - | 待同步的构建产物目录（支持绝对路径或相对路径），不存在则报错 |
| `publish_root` | `string` | 是 | - | 目标 Git 仓库根目录（支持绝对路径或相对路径），必须是有效的 Git 仓库 |
| `publish_branch` | `string` | 是 | - | 推送的目标分支名称 |
| `publish_dist_dir` | `string` | 否 | `""` | 部署到仓库内的指定子目录（相对路径），不存在则自动创建 |
| `clean_dir` | `boolean` | 否 | `false` | 在拷贝前是否清空目标子目录 |
| `message` | `string` | 否 | `"build: auto push at {时间}"` | Git 提交信息 |

#### TypeScript 类型定义

```typescript
interface AutoPushToGitOptions {
  /** 待同步的构建产物目录 (支持绝对路径或相对路径) */
  dist_dir: string;
  /** 目标 Git 仓库根目录 (支持绝对路径或相对路径) */
  publish_root: string;
  /** 推送的目标分支 */
  publish_branch: string;
  /** 部署到仓库内的指定子目录 (相对路径) */
  publish_dist_dir?: string;
  /** 在拷贝前是否清空目标子目录 (默认 false) */
  clean_dir?: boolean;
  /** Git 提交信息 */
  message?: string;
}
```

---

## 使用示例

### 基础用法

```typescript
import { autoPushToGit } from 'build-helper';

await autoPushToGit({
  dist_dir: './dist',
  publish_root: './gh-pages',
  publish_branch: 'main',
});
```

### 指定子目录发布

```typescript
import { autoPushToGit } from 'build-helper';

await autoPushToGit({
  dist_dir: './dist',
  publish_root: './gh-pages',
  publish_branch: 'gh-pages',
  publish_dist_dir: 'docs',  // 发布到 docs 子目录
});
```

### 清空目标目录后同步

```typescript
import { autoPushToGit } from 'build-helper';

await autoPushToGit({
  dist_dir: './build',
  publish_root: './deploy-repo',
  publish_branch: 'main',
  clean_dir: true,  // 先清空再拷贝
});
```

### 自定义提交信息

```typescript
import { autoPushToGit } from 'build-helper';

await autoPushToGit({
  dist_dir: './dist',
  publish_root: './gh-pages',
  publish_branch: 'gh-pages',
  message: 'chore: deploy v1.2.3',  // 自定义提交信息
});
```

### 在 CI/CD 中使用

```typescript
// deploy.ts
import { autoPushToGit } from 'build-helper';

async function deploy() {
  try {
    await autoPushToGit({
      dist_dir: process.env.BUILD_DIR || './dist',
      publish_root: process.env.DEPLOY_REPO || './deploy',
      publish_branch: process.env.DEPLOY_BRANCH || 'main',
      publish_dist_dir: process.env.DEPloy_SUBDIR || '',
    });
    console.log('部署成功！');
  } catch (error) {
    console.error('部署失败:', error);
    process.exit(1);  // CI 环境中返回非零退出码
  }
}

deploy();
```

---

## 工作流程

```
1. 路径校验 → 验证源目录、目标仓库、Git 有效性
2. 分支准备 → fetch → checkout/pull --rebase 或创建新分支
3. 文件同步 → 可选清空 → 拷贝文件（过滤 .git）
4. Git 操作 → add → 检查变更 → commit → push
```

---

## 注意事项

1. **目标目录必须是一个有效的 Git 仓库**（包含 `.git` 目录）
2. **无变更时自动跳过**：如果内容没有变化，不会执行 commit 和 push
3. **安全性**：拷贝时会自动过滤 `.git` 相关元数据文件
4. **错误处理**：发生错误会抛出异常，便于在 CI/CD 环境中被捕获
