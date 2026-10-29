import type { INestApplication } from '@nestjs/common'
import type { Response } from 'express'
import { resolve } from 'node:path'

/**
 * Knife4j 多服务配置项
 */
export interface Service {
  /** 服务名称 */
  name: string
  /**
   * OpenAPI JSON 地址，通常为 Swagger 配置路径 + '-json'
   * @example Swagger 路径为 '/api' 时，填 '/api-json'
   */
  url: string
}

/** 标准化路径前缀：保证以 '/' 开头、以 '/' 结尾 */
function normalizePrefix(prefix: string): string {
  if (typeof prefix !== 'string') throw new TypeError('prefix must be a string')
  const trimmed = prefix.trim().replace(/\/{2,}/g, '/')
  const withLeading = trimmed.startsWith('/') ? trimmed : `/${trimmed}`
  return withLeading.endsWith('/') ? withLeading : `${withLeading}/`
}

const stripTrailingSlash = (p: string): string => (p.length > 1 && p.endsWith('/') ? p.slice(0, -1) : p)

const notInstalled = (pkg: string): Error =>
  new Error(`${pkg} is not installed. Run \`npm install ${pkg}\` (or pnpm/yarn add ${pkg}) and try again.`)

function isMissingModuleError(error: unknown, pkg: string): boolean {
  if (typeof error !== 'object' || error === null || !('code' in error)) return false
  const { code, message } = error as { code?: unknown; message?: unknown }
  return (
    (code === 'MODULE_NOT_FOUND' || code === 'ERR_MODULE_NOT_FOUND') &&
    typeof message === 'string' &&
    (message.includes(`'${pkg}'`) || message.includes(`"${pkg}"`))
  )
}

/** 动态加载可选 peer 依赖，缺失时给出明确报错（变量式 import 不会被 TS 做强校验） */
async function loadPeerPackage<T = unknown>(pkg: string): Promise<T> {
  try {
    return (await import(pkg)) as T
  } catch (error) {
    if (isMissingModuleError(error, pkg)) throw notInstalled(pkg)
    throw error
  }
}

function validateServices(services: readonly Service[]): Service[] {
  if (!Array.isArray(services) || services.length === 0) {
    throw new Error('services must be a non-empty array')
  }
  return services.map((s, i) => {
    if (typeof s?.name !== 'string' || s.name.trim() === '') {
      throw new TypeError(`services[${i}].name must be a non-empty string`)
    }
    if (typeof s?.url !== 'string' || s.url.trim() === '') {
      throw new TypeError(`services[${i}].url must be a non-empty string`)
    }
    return { name: s.name.trim(), url: s.url.trim() }
  })
}

/** 底层 HTTP 实例的最小可用形态：Express 与 Fastify 均满足 */
interface Server {
  get(path: string, handler: (req: unknown, res: unknown) => void): void
  use?(path: string, ...handlers: unknown[]): void
  register?(plugin: unknown, options: Record<string, unknown>): Promise<unknown>
}

/**
 * 配置 Knife4j 文档 UI（支持 Express / Fastify / Node 三种 HTTP 适配器）。
 *
 * @param app     NestFactory.create() 创建的应用实例
 * @param services Knife4j 多服务配置数组，每项需满足 {@link Service}
 * @param prefix  UI 路径前缀，默认 '/'
 *
 * @example
 * ```typescript
 * import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger'
 * import { knife4jSetup } from 'nestjs-knife4j-plus'
 *
 * const config = new DocumentBuilder().setTitle('API').build()
 * const document = SwaggerModule.createDocument(app, config)
 * SwaggerModule.setup('api', app, document, { useGlobalPrefix: true })
 * await knife4jSetup(app, [{ name: '用户服务', url: '/api-json' }], 'customPrefix')
 * ```
 */
export async function knife4jSetup(app: INestApplication, services: readonly Service[], prefix = '/'): Promise<void> {
  const validated = validateServices(services)
  const dynamicPrefix = normalizePrefix(prefix)
  const staticPrefix = stripTrailingSlash(dynamicPrefix)
  const servicePath = `${dynamicPrefix}services.json`
  const adapter = app.getHttpAdapter()
  const type = adapter.getType()
  const server = adapter.getInstance() as Server
  const uiRoot = resolve(__dirname, '../ui/')

  // services.json 路由须在静态资源之前注册，避免被前缀匹配拦截
  server.get(servicePath, (_req, res) => {
    if (type === 'express') (res as Response).json(validated)
    else (res as { send(body: unknown): void }).send(validated)
  })

  if (type === 'express') {
    const { static: serveStatic } = await loadPeerPackage<typeof import('express')>('express')
    server.use!(dynamicPrefix, serveStatic(uiRoot))
  } else if (type === 'fastify') {
    const mod = await loadPeerPackage<{ default: unknown }>('@fastify/static')
    await server.register!(mod.default, {
      root: uiRoot,
      prefix: staticPrefix,
      decorateReply: false,
    })
  } else if (type === 'node') {
    // NodeAdapter（@nestjs/platform-node）：useStaticAssets 的 prefix 语义与
    // Express 的 app.use(prefix, static()) 挂载一致，故沿用带尾斜杠的 dynamicPrefix
    ;(app as unknown as { useStaticAssets(root: string, options?: { prefix?: string }): unknown }).useStaticAssets(
      uiRoot,
      { prefix: dynamicPrefix },
    )
  } else {
    throw new Error(`Unsupported HTTP adapter: "${type}". Only "express", "fastify" and "node" are supported.`)
  }
}
