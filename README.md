# 📊 Build Helper

> 🚀 构建工具集

---

## 📚 模块文档

### [Auto Push to Git - 自动化产物同步工具](./src/auto-push/README.md)

将构建产物自动同步至 Git 仓库，支持自动提交与推送。

**快速开始：**

```typescript
import { autoPushToGit } from 'build-helper';

await autoPushToGit({
  dist_dir: './dist',
  publish_root: './gh-pages',
  publish_branch: 'gh-pages',
});
```

详细文档请查看：[src/auto-push/README.md](./src/auto-push/README.md)

### [Build H5 (UniApp) - HBuilderX H5 自动化构建工具](./src/uniapp/README.md)

基于 HBuilderX CLI 自动化构建 UniApp 项目的 H5 平台产物。

**快速开始：**

**执行之前先确保你的Hbuilder已经登录过账号，且没有掉线**

```typescript
import { buildH5 } from 'build-helper';

await buildH5({
  project_root: 'D:/projects/my-uniapp',
  hbuilder_cli_path: 'D:/HBuilderX/cli.exe',
});
```

详细文档请查看：[src/uniapp/README.md](./src/uniapp/README.md)
