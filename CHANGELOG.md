# Changelog

格式遵循 [Keep a Changelog](https://keepachangelog.com/zh-CN/1.1.0/)，并遵循 [Semantic Versioning](https://semver.org/lang/zh-CN/)。

## [Unreleased]

### Added

- 首次发布流量解析套件镜像。
- 支持 PCAP 文件上传与流式解析。
- 支持协议字段树、十六进制视图和数据包详情检查。
- 支持协议分布、地址排行、端口排行等流量统计视图。
- 支持可视化构造、修改和导出自定义数据包。
- 支持 TCP 会话流追踪，并检测重复 SYN、重传和乱序等 TCP 状态异常。
- 新增 TLS/SSL、SSH、FTP、MQTT 和 HTTP/2 的轻量级识别与关键字段深度解码。
- 支持将已解析的数据包及其原始载荷发送至构造器继续编辑。
- 构造器新增 802.1Q VLAN、ARP 协议层，以及 DNS AAAA、TLS Client Hello 等预置模板。
- 构造器新增后端驱动的字段配置、实时构造预览、十六进制结果和校验警告。
- 支持拖拽调整数据包浏览区与构造器工作区的宽度。
- 新增数据包构造、解析工具和敏感协议解码的后端测试。
- 新增缺陷报告、功能建议和任务等 GitHub Issue 模板。

### Changed

- 优化后端日志格式，并降低数据包解析期间的 SQLite 锁竞争。
- 将 SQLAlchemy 数据包模型迁移至类型化映射，并将 Pydantic 配置迁移至 v2 写法。
- 扩展协议筛选列表并优先展示常用协议；敏感协议深度解码区域默认折叠。
- 扩展 `.gitignore` 对 SQLite 数据库及其辅助文件的覆盖。

### Fixed

- 修复 DNS 查询记录构造错误。
- 修复构造结果写入 PCAP 后立即读取摘要时记录尚未刷新的问题。
- 规范化 ARP 操作码、DNS 查询类型及 TCP/IP 标志等协议枚举字段，兼容名称和数值输入，并将构造错误转换为校验错误。
- 修复后端数据包构造与解析相关的类型检查问题。
