## Description

The provided code sets up Knife4j for enhancing Swagger/OpenAPI documentation in a NestJS application, supporting both Express and Fastify HTTP adapters. Thanks to [@xiaoymin](https://github.com/xiaoymin) for providing the WebUI.

[![NPM version](https://img.shields.io/npm/v/nestjs-knife4j-plus?style=for-the-badge)](https://www.npmjs.com/package/nestjs-knife4j-plus) [![License: MIT](https://img.shields.io/badge/License-MIT-green?style=for-the-badge)](LICENSE) [![GitHub issues](https://img.shields.io/github/issues/jkhuangfu/nestjs-knife4j-plus?style=for-the-badge)](https://github.com/jkhuangfu/nestjs-knife4j-plus/issues)

## 📦 Installation

```bash
# Install the package
npm install nestjs-knife4j-plus @nestjs/swagger

# For Fastify adapter, also install:
npm install @fastify/static
```

## 🔄 Compatibility Matrix

| @fastify/static version | Fastify version |
| ----------------------- | --------------- |
| `^8.x`                  | `^5.x`          |
| `^7.x`                  | `^4.x`          |
| `^5.x`                  | `^3.x`          |
| `^2.x`                  | `^2.x`          |
| `^1.x`                  | `^1.x`          |

## 🚀 Usage

```typescript
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger'
import { knife4jSetup } from 'nestjs-knife4j-plus'

// To use this with Fastify, first install @fastify/static. Please ensure version compatibility.

async function bootstrap() {
  const options = new DocumentBuilder()
    .setTitle('Cats example')
    .setDescription('The cats API description')
    .setVersion('1.0')
    .addTag('cats')
    .build()
  const document = SwaggerModule.createDocument(app, options)
  // 如果想自定义访问路径前缀，需要在 Swagger 配置中开启全局前缀（useGlobalPrefix:true）同时 knife4jSetup 也需要配置全局前缀(knife4jSetup第三个参数为前缀)
  // app.setGlobalPrefix('customerPrefix')
  SwaggerModule.setup('api', app, document)

  knife4jSetup(app, [
    {
      name: '2.0 version',
      url: `/api-json`,
    },
  ])
  await app.listen(3000)
}
```

then you can browse on [http://127.0.0.1:3000/doc.html](http://127.0.0.1:3000/doc.html)

if you set customerPrefix, then in Knife4j UI, the path to access will be '/customerPrefix/doc.html'

## 📈 Changelog

### [1.0.10] - 2026-10-29

#### ✨ feature

- **支持 @nestjs/platform-node 适配器**
- **Add support for @nestjs/platform-node adapter**

### [1.0.9] - 2026-05-15

#### 🐛 Fix

- **修复OAS3规范下allOf组合schema的响应示例解析能力**
- **Fix the issue with parsing response examples for allOf schema in OAS3.**

### [1.0.8] - 2026-05-12

#### 🐛 Fix

- **修复新增OAS3规范下allOf组合schema的解析能力**
- **add support for parsing allOf schema in OAS3**

### [1.0.7] - 2026-02-11

#### 🐛 Fix

- **修复使用自定义前缀的时候，UI层配置信息请求路径问题**

- **Fix the issue with the request path for UI layer configuration information when using a custom prefix.**

### [1.0.6] - 2026-02-09

#### 🐛 Fix

- **修复在自定义路径前缀下访问 Knife4j UI 时，请求路径多一层path的问题**

- **Fix the issue of an extra layer of path in request paths when accessing the Knife4j UI under a custom path prefix**

### [1.0.5] - 2026-02-09

#### ✨ feature [issues/1](https://github.com/jkhuangfu/nestjs-knife4j-plus/issues/1)

- **新增自定义路径前缀支持**
  支持在 Knife4j UI 中配置自定义访问路径前缀，方便在不同路径下部署。

- **Add custom path prefix support**
  Allows configuring custom path prefixes for Knife4j UI, enabling deployment under different paths.

### [1.0.4] - 2026-01-12

#### 🐛 Fix

- **修复多文件上传无法正常解析问题**

- **Fix multiple file uploads cannot be parsed correctly**

### [1.0.2] — 2025-12-19

#### ✨ Added

- **新增文件拖拽上传功能**
  支持通过拖拽方式快速上传文件，显著提升文件上传效率与整体使用体验。

- **Drag-and-drop file upload support**
  Enables quick file uploads via drag-and-drop interactions, significantly improving upload efficiency and overall user experience.

#### 🎨 Improved

- **界面样式优化**
  对部分页面样式与交互细节进行优化，提升整体视觉一致性与使用流畅度。

- **UI and style enhancements**
  Refined selected UI styles and interaction details to improve visual consistency and overall usability.
