import type { INestApplication } from '@nestjs/common'
import type { NextFunction, Request, Response } from 'express'
// fastify is an optional peer dependency. This type-only import is erased from
// the emitted JavaScript, so consumers that only use Express do not need it.
// @ts-expect-error
import type { FastifyRequest, FastifyReply } from 'fastify'
import { resolve } from 'node:path'

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
 * 把用户传的 prefix 标准化：保证以 '/' 开头、以 '/' 结尾。
 *
 * @example
 *   ''         -> '/'
 *   'api'      -> '/api/'
 *   '/api'     -> '/api/'
 *   '/api/'    -> '/api/'
 *   '//api///v1' -> '/api/v1/'
 *   '  api/  ' -> '/api/'
 */
function normalizePrefix(prefix: string): string {
  if (typeof prefix !== 'string') {
    throw new TypeError('prefix must be a string')
  }
  const trimmed = prefix.trim().replace(/\/{2,}/g, '/')
  const withLeading = trimmed.startsWith('/') ? trimmed : `/${trimmed}`
  return withLeading.endsWith('/') ? withLeading : withLeading + '/'
}

/** 去掉 prefix 末尾的 '/'（用于不需要尾斜杠的 API，如 @fastify/static 的 prefix 选项） */
function stripTrailingSlash(prefix: string): string {
  return prefix.length > 1 && prefix.endsWith('/') ? prefix.slice(0, -1) : prefix
}

/** 统一生成 "package is not installed" 错误信息 */
function notInstalledError(pkg: string): Error {
  return new Error(`${pkg} is not installed. Please run \`npm install ${pkg}\` or \`yarn add ${pkg}\` and try again.`)
}

function isMissingModuleError(error: unknown, pkg: string): boolean {
  if (typeof error !== 'object' || error === null || !('code' in error) || !('message' in error)) {
    return false
  }
  const { code, message } = error as { code?: unknown; message?: unknown }
  return (
    (code === 'MODULE_NOT_FOUND' || code === 'ERR_MODULE_NOT_FOUND') &&
    typeof message === 'string' &&
    (message.includes(`'${pkg}'`) || message.includes(`\"${pkg}\"`))
  )
}

function validateServices(services: readonly Service[]): Service[] {
  if (!Array.isArray(services) || services.length === 0) {
    throw new Error('services must be a non-empty array')
  }

  return services.map((service, index) => {
    if (!service || typeof service.name !== 'string' || service.name.trim() === '') {
      throw new TypeError(`services[${index}].name must be a non-empty string`)
    }
    if (!service || typeof service.url !== 'string' || service.url.trim() === '') {
      throw new TypeError(`services[${index}].url must be a non-empty string`)
    }
    return { name: service.name.trim(), url: service.url.trim() }
  })
}

interface EXPRESS_INSTANCE {
  use: (path: string, ...handlers: ((req: Request, res: Response, next: NextFunction) => unknown)[]) => void
  get: (path: string, handler: (req: Request, res: Response) => void) => void
}

interface FASTIFY_INSTANCE {
  get: (path: string, handler: (req: FastifyRequest, reply: FastifyReply) => void) => void
  register: (plugin: unknown, options: Record<string, unknown>) => Promise<unknown>
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
export async function knife4jSetup(
  app: INestApplication,
  services: readonly Service[],
  prefix: string = '/',
): Promise<void> {
  const validatedServices = validateServices(services)
  const dynamicPrefix = normalizePrefix(prefix)
  const staticPrefix = stripTrailingSlash(dynamicPrefix)
  const servicePath = dynamicPrefix + 'services.json'
  const adapter = app.getHttpAdapter()
  const httpAdapter = adapter.getType()
  const instance = adapter.getInstance()
  const uiPath = resolve(__dirname, '../ui/')

  if (httpAdapter === 'express') {
    let expressStatic: (typeof import('express'))['static']
    try {
      ;({ static: expressStatic } = await import('express'))
    } catch (error) {
      if (isMissingModuleError(error, 'express')) {
        throw notInstalledError('express')
      }
      throw error
    }
    const expressApp = instance as EXPRESS_INSTANCE
    expressApp.get(servicePath, (_req, res) => {
      res.json(validatedServices)
    })
    expressApp.use(dynamicPrefix, expressStatic(uiPath))
    return
  }

  if (httpAdapter === 'fastify') {
    let fastifyStatic: { default: unknown }
    try {
      // @fastify/static 是 optional peerDep，没装时 TS 找不到模块；运行时靠 try/catch 兜底
      // @ts-expect-error optional peer dependency may not be installed
      fastifyStatic = await import('@fastify/static')
    } catch (error) {
      if (isMissingModuleError(error, '@fastify/static')) {
        throw notInstalledError('@fastify/static')
      }
      throw error
    }
    const fastifyApp = instance as FASTIFY_INSTANCE
    // service 路由先注册，避免被 @fastify/static 的 prefix 匹配拦截
    fastifyApp.get(servicePath, (_req, reply) => {
      reply.send(validatedServices)
    })
    await fastifyApp.register(fastifyStatic.default, {
      root: uiPath,
      prefix: staticPrefix,
      decorateReply: false,
    })
    return
  }

  throw new Error(`Unsupported HTTP adapter: "${httpAdapter}". Only "express" and "fastify" are supported.`)
}
