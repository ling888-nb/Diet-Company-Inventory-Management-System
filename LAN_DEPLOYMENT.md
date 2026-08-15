# 局域网本地部署手册

本系统由前端网页、FastAPI 后端和 SQLite 本地数据库组成。后端只允许局域网、同 WiFi、回环地址访问；所有业务数据、账号权限、审计日志都存放在服务器电脑本机。

## 默认账号

- 超级管理员：admin / admin123
- 普通测试账号：user01 / user1234

首次正式使用后，请用 admin 登录并立即修改密码。

## 目录说明

- 后端入口：`backend/app.py`
- 数据库文件：`backend/data/inventory.sqlite3`
- 数据库备份目录：`backend/backups`
- 后端依赖：`backend/requirements.txt`
- 离线依赖包目录：`backend/offline_packages`
- 一键启动：`start_lan_system.bat`

如需把数据库保存到其他本地文件夹，可在启动前设置环境变量：

```bat
set LAN_INVENTORY_DATA_DIR=D:\InventoryData
python backend\app.py
```

## 服务器电脑环境准备

1. 安装 Python 3.9 或更高版本，安装时勾选 `Add Python to PATH`。
2. 如使用前端开发端口 3000，安装 Node.js 18 或更高版本。
3. 复制整个项目文件夹到服务器电脑，例如 `D:\inventory-system`。
4. 后端依赖建议用离线方式安装，见下一节。

## 后端依赖离线安装

在一台可联网电脑上执行一次：

```bat
cd /d "C:\Users\Lenovo\Desktop\bbbb - 大圆盘"
prepare_offline_packages.bat
```

也可以执行后端目录里的同名脚本：

```bat
backend\prepare_offline_packages.bat
```

这个脚本会把 FastAPI、Uvicorn、bcrypt、openpyxl 等 wheel 包下载到 `backend/offline_packages`。然后把整个项目文件夹复制到真正的服务器电脑。

在服务器电脑上执行：

```bat
cd /d "C:\Users\Lenovo\Desktop\bbbb - 大圆盘"
install_backend_offline.bat
```

也可以执行后端目录里的同名脚本：

```bat
backend\install_backend_offline.bat
```

安装完成后，后端启动不再需要联网。

## 前端依赖离线方式

当前项目已包含 `package-lock.json` 和本地 `node_modules`。如果更换电脑后需要重新安装前端依赖：

1. 在可联网电脑执行 `npm ci`。
2. 把项目文件夹连同 `node_modules` 一起复制到服务器电脑。
3. 服务器电脑离线运行 `start_lan_system.bat` 或先运行 `build_frontend.bat`。

## 启动方式

推荐方式，双击：

```bat
start_lan_system.bat
```

启动脚本会逐项显示：

- Backend dependency check：检查 Python 和后端依赖
- Frontend mode check：优先使用 `dist` 单端口模式；没有 `dist` 时才检查 Node、npm 和 `node_modules`
- Port check：检查 8080/3000 是否已被占用
- Backend startup：后台启动后端并写入 `backend/backend-service.log`
- Frontend startup：有 `dist` 时跳过前端开发服务；没有 `dist` 时后台启动 3000
- Service health check：检查后端 API 和前端网页是否响应
- Access addresses：打印本机和局域网访问地址

如果项目里已经有 `dist\index.html`，脚本会进入单端口模式：

- 网页和 API：http://本机局域网IP:8080

其他电脑和手机只需要连接同一个 WiFi/局域网，用浏览器打开这个地址即可登录平台，不需要安装 Python、Node.js、依赖包或任何客户端。

如果没有 `dist`，脚本会临时进入开发模式：

- 前端网页：http://本机局域网IP:3000
- 后端 API：http://本机局域网IP:8080

生产/单端口方式：

1. 双击 `build_frontend.bat` 生成 `dist`。
2. 双击 `backend\start_backend.bat`。
3. 访问 `http://本机局域网IP:8080`。

后台运行后端：

```bat
backend\start_backend_background.bat
```

关闭启动脚本窗口不会影响后台进程。需要停止时，可在任务管理器结束 `python.exe` 和对应的 `node.exe`。

## 查看服务器局域网 IP

方法一：启动脚本会打印局域网访问地址。

方法二：打开命令提示符执行：

```bat
ipconfig
```

找到当前 WiFi/以太网的 IPv4 地址，例如 `192.168.1.23`。

## 其他电脑访问

其他电脑必须连接同一个 WiFi 或局域网，然后在浏览器输入：

- 开发方式：`http://192.168.1.23:3000`
- 生产方式：`http://192.168.1.23:8080`

把 `192.168.1.23` 换成服务器电脑实际 IP。

## Windows 防火墙设置

建议把当前网络设置为“专用网络”，并只允许本地子网访问端口。

以管理员身份打开 PowerShell，执行：

```powershell
New-NetFirewallRule -DisplayName "Inventory LAN API 8080" -Direction Inbound -Action Allow -Protocol TCP -LocalPort 8080 -Profile Private -RemoteAddress LocalSubnet
New-NetFirewallRule -DisplayName "Inventory LAN Web 3000" -Direction Inbound -Action Allow -Protocol TCP -LocalPort 3000 -Profile Private -RemoteAddress LocalSubnet
New-NetFirewallRule -DisplayName "Block Inventory API Public 8080" -Direction Inbound -Action Block -Protocol TCP -LocalPort 8080 -Profile Public
New-NetFirewallRule -DisplayName "Block Inventory Web Public 3000" -Direction Inbound -Action Block -Protocol TCP -LocalPort 3000 -Profile Public
```

如果只使用生产/单端口方式，只需要开放 8080。

后端本身也会拒绝非局域网 IP 的 `/api` 请求，但防火墙规则仍然建议保留。

## 数据库备份与恢复

后台页面路径：`后台管理 -> 数据库备份`。

- 点击“下载数据库备份”会导出 `.sqlite3` 文件。
- 恢复时选择备份文件并确认，恢复后重启后端服务。
- 手工备份也可以直接复制 `backend/data/inventory.sqlite3`。

恢复失败时，可用 `backend/backups/before_restore_*.sqlite3` 找回恢复前数据。

## 账号与权限

admin 可以在 `后台管理` 中：

- 新增、编辑、删除账号。
- 普通账号只能由 admin 创建，系统没有公开注册入口。
- 启用/禁用账号。
- 重置普通用户密码；历史密码使用 bcrypt 哈希保存，无法反查明文，新密码只在创建或重置时显示一次。
- 创建自定义角色。
- 按具体权限项设置查看/新增/修改/删除权限，例如客户资料、产品资料、涂装工艺项目、复合工艺组合、材料资料、材料类型、材料供应商、产品入库单、材料入库单等。
- 查看和导出审计日志。

普通用户只能在 `个人中心` 修改自己的真实姓名、备注和密码，并查看自己的权限。

## 开机自动启动

1. 打开“任务计划程序”。
2. 创建基本任务，触发器选择“计算机启动时”。
3. 操作选择“启动程序”。
4. 程序选择 `start_lan_system.bat` 或 `backend\start_backend_background.bat`。
5. 勾选“使用最高权限运行”。

## 常见问题

其他电脑无法访问：

- 确认两台电脑在同一个 WiFi/局域网。
- 确认访问的是服务器电脑 IPv4 地址，不是公网 IP。
- 确认防火墙已允许 8080 或 3000 的 Private/LocalSubnet 访问。
- 在服务器电脑本机先访问 `http://127.0.0.1:8080/api/health`。

服务启动失败：

- 执行 `python --version` 检查 Python。
- 执行 `backend\install_backend_offline.bat` 安装后端依赖。
- bcrypt 缺失时，登录账号无法初始化，必须完成离线依赖安装。

登录失败 3 次被锁定：

- 等待 5 分钟再试，或用 admin 重置该用户密码。

页面能打开但数据不同步：

- 确认后端 8080 正在运行。
- 确认浏览器开发地址 3000 能访问 `http://服务器IP:8080/api/health`。
- 重新登录会从 SQLite 数据库拉取最新数据。

忘记 admin 密码：

- 如果有备份，恢复旧备份。
- 如无备份，可联系技术人员在服务器本机 SQLite 数据库中重置密码哈希。
