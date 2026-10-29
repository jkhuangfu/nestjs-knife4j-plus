import type { INestApplication } from '@nestjs/common';
/**
 * Knife4j 多服务配置项
 */
export interface Service {
    /** 服务名称 */
    name: string;
    /**
     * OpenAPI JSON 地址，通常为 Swagger 配置路径 + '-json'
     * @example Swagger 路径为 '/api' 时，填 '/api-json'
     */
    url: string;
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
export declare function knife4jSetup(app: INestApplication, services: readonly Service[], prefix?: string): Promise<void>;
