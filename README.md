# PerpX 后端服务

## 安装工具链

### 安装protoc
```
brew install protobuf
```
或者
```
apt install protobuf-compiler
```

### 安装gRPC代理 envoy
```
brew install envoy
```
或者
```
curl -L https://github.com/tetratelabs/archive-envoy/releases/download/v1.35.3/envoy-v1.35.3-darwin-amd64.tar.xz -o envoy.tar.xz
tar -xvf envoy.tar.xz
mv envoy-v1.35.3-darwin-amd64/bin/envoy /usr/local/bin/envoy
```
或者
```
docker pull envoyproxy/envoy:v1.35.4
// 可以测试运行一下
docker run -it --rm -p 8080:8080 -v $(pwd)/src/rpc/proxy/envoy.yaml:/etc/envoy/envoy.yaml envoyproxy/envoy
```

### 安装依赖
```
yarn install
```

### 启动服务
```
yarn run gen
yarn start
```