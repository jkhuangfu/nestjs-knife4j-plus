import type { INestApplication } from '@nestjs/common'
import { resolve, join } from 'node:path'

/**
 * 服务配置接口
 */
export interface Service {
  /** 服务名称 */
  name: string
  /** 
   * OpenAPI JSON 地址，通常为 Swagger 配置的路径 + '-json'
   * @example 如果 Swagger 访问路径为 '/api'，则 OpenAPI JSON 地址为 '/api-json'
   */
  url: string
}

/**
 * 配置knife4j
 * 
 * @param app - NestFactory.create() 创建的应用实例 (支持 Express / Fastify)
 * @param services - Knife4j 多服务配置数组，每项需实现 {@link Service} 接口
 * @param prefix - Knife4j UI 路径前缀，默认 '/'，可自定义路径前缀 feature https://github.com/jkhuangfu/nestjs-knife4j-plus/issues/1
 * @example
 * ```typescript
 * // in main.ts
 * 
 * import { SwaggerModule, DocumentBuilder } from "@nestjs/swagger";
 * import { knife4jSetup, type Service } from 'nestjs-knife4j-plus';
 * // To use this with Fastify, first install `@fastify/static`. Please ensure version compatibility.
 * 
 * async function bootstrap() {
 *   const app = await NestFactory.create(AppModule);
 *   const config = new DocumentBuilder()
 *     .setTitle("API")
 *     .setDescription("API接口文档")
 *     .build();
 *   const document = SwaggerModule.createDocument(app, config);
 *   // 如果想同步使用全局前缀，需要在 Swagger 配置中开启全局前缀（useGlobalPrefix:true）同时 knife4jSetup 也需要配置全局前缀
 *   // 满足issues：https://github.com/jkhuangfu/nestjs-knife4j-plus/issues/1
 *   // 服务启动文件中配置app.setGlobalPrefix("customerPrefix");
 *   
 *   SwaggerModule.setup("api", app, document, { useGlobalPrefix:true });
 *   await knife4jSetup(app, [
 *     {
 *       name: '用户服务',
 *       url: '/api-json'
 *     }
 *   ],'customPrefix');
 *   await app.listen(3000);
 * }
 * bootstrap();
 * ```
 */
export async function knife4jSetup(app: INestApplication, services: Service[], prefix: string = '/') {
  // 配置路径前缀
  let prefixStr = prefix.trim()
  if (!prefixStr.startsWith('/')) {
    prefixStr = '/' + prefixStr
  }
  const httpAdapter = app.getHttpAdapter().getType()
  const instance = app.getHttpAdapter().getInstance()
  if (!['express', 'fastify'].includes(httpAdapter)) {
    throw new Error('http adapter only supported express and fastify')
  }
  if (httpAdapter === 'express') {
    try {
      const expressStatic = await import('express').then((mod) => mod.static)
      app.use(prefixStr, expressStatic(resolve(__dirname, '../ui/')))
      app.use('/services.json', (_: any, res: any) => {
        res.send(services)
      })
    } catch (error) {
      throw new Error('express is not installed please install it first ?, run `npm install express` or `yarn add express` try again')
    }
    return
  }
  // if fastify, register fastify-static plugin
  try {
    const fastifyStatic = await import('@fastify/static').then((mod) => mod.default)
    instance.register(fastifyStatic, {
      root: join(__dirname, '../ui'),
      prefix: prefixStr,
      decorateReply: false,
    })
    instance.get('/services.json', (_: any, repl: any) => {
      repl.send(services)
    })
  } catch (error) {
    throw new Error('@fastify/static is not installed please install it first? , run `npm install @fastify/static` or `yarn add @fastify/static` try again')
  }
}
