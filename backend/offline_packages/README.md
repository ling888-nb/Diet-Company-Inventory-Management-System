# 离线依赖包目录

这个目录用于存放后端离线安装所需的 Python wheel 包。

在可联网电脑上运行：

```bat
backend\prepare_offline_packages.bat
```

然后把整个项目复制到服务器电脑，在服务器电脑运行：

```bat
backend\install_backend_offline.bat
```

安装完成后，后端服务启动和日常使用都不需要联网。
