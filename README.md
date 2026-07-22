# SecLab 流量解析

SecLab 流量解析套件镜像，用于 PCAP 流量解析、协议字段检查、流量统计和可视化数据包构造。

## 镜像

```text
guowenju/seclab-packet:0.1.0-alpha.1
```

## 运行示例

```bash
docker network create seclab-suite-network
docker run --rm \
  --name seclab-packet \
  --network seclab-suite-network \
  -v seclab-packet-data:/data \
  guowenju/seclab-packet:0.1.0-alpha.1
```

## 本地构建

```bash
./build-image.sh 0.1.0-alpha.1
```

本仓库只维护套件源码和 Docker 镜像。`.slsp` 套件交付包由 `seclab-suites` 仓库统一维护和发布。
