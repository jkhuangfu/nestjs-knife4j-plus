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

## 📈 Changelog
