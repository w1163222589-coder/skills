# Enable 1M Context

这是一个用于 Codex 的 skill，可以帮助用户把本地 Codex 的上下文窗口元数据，从默认约 258k 的显示提升到 1M / 1000K。

[English](README.md) | 中文

## 它能做什么

调用后，这个 skill 会运行内置脚本，完成这些操作：

- 备份用户当前的 `config.toml` 和 `models_cache.json`；
- 生成一个本地补丁模型目录 `models_1m.json`；
- 写入 `model_context_window = 1000000`；
- 让 `model_catalog_json` 指向补丁模型目录；
- 支持从备份完整恢复；
- 支持在没有备份时强制回到 258k 风格窗口。

这是一个本地 Codex 配置工作流。它不会修改账号、订阅、API 权限，也不会修改上游模型服务。

## 使用 CC Switch 安装

在 CC Switch 中：

1. 打开 **Skills** 页面。
2. 打开 **Repository Management / 仓库管理**。
3. 点击 **Add Repository / 添加仓库**。
4. 填写：

```text
Owner: w1163222589-coder
Name: skills
Branch: main
Subdirectory: skills/.experimental
```

5. 刷新 skill 列表。
6. 安装 `enable-1m-context`。

## 手动安装

把这个文件夹复制到 Codex skills 目录：

```text
enable-1m-context  ->  ~/.codex/skills/enable-1m-context
```

Windows 通常是：

```text
C:\Users\<用户名>\.codex\skills\enable-1m-context
```

安装后重启 Codex。

## 使用方法

在 Codex 里输入：

```text
使用 $enable-1m-context 把这台机器上的 Codex 上下文窗口开启到 1M。
```

Codex 应该会运行：

```bash
node scripts/enable_1m_context.cjs
```

如果没有自动识别 Codex 目录，可以指定：

```bash
node scripts/enable_1m_context.cjs --codex-home "C:/Users/USER/.codex"
```

完成后，需要完全退出并重新打开 Codex Desktop，然后新建一个对话。

## 如何验证

界面验证：

- 打开一个新的 Codex 对话。
- 点击底部上下文/状态圆圈。
- 总窗口应该显示约 `1000K`。

日志验证：

```powershell
Get-ChildItem "$env:USERPROFILE\.codex\sessions" -Recurse -Filter *.jsonl |
  Select-String -Pattern '"model_context_window":1000000' |
  Select-Object -Last 10 Path,LineNumber,Line
```

如果日志里出现 `"model_context_window":1000000`，说明这轮 Codex 会话确实按 1M 上下文窗口启动。

## 回滚到 258k

优先使用备份完整恢复：

```bash
node scripts/enable_1m_context.cjs --restore-latest
```

如果备份不可用，或者只是想强制回到旧的 258k 风格窗口：

```bash
node scripts/enable_1m_context.cjs --reset-258k
```

回滚后也需要完全退出并重新打开 Codex Desktop，然后新建对话验证。

## 注意事项

- 已经存在的旧对话可能继续保留原来的上下文窗口，要用新对话测试。
- 如果服务端拒绝超长输入，说明账号或模型权限仍可能是限制因素。
- 脚本不会修改 `auth.json`。
- 备份保存在 `.codex/backups/enable-1m-context/`。
