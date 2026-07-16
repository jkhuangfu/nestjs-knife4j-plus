"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.knife4jSetup = knife4jSetup;
const node_path_1 = require("node:path");
function normalizePrefix(prefix) {
    if (typeof prefix !== 'string') {
        throw new TypeError('prefix must be a string');
    }
    const trimmed = prefix.trim().replace(/\/{2,}/g, '/');
    const withLeading = trimmed.startsWith('/') ? trimmed : `/${trimmed}`;
    return withLeading.endsWith('/') ? withLeading : withLeading + '/';
}
function stripTrailingSlash(prefix) {
    return prefix.length > 1 && prefix.endsWith('/') ? prefix.slice(0, -1) : prefix;
}
function notInstalledError(pkg) {
    return new Error(`${pkg} is not installed. Please run \`npm install ${pkg}\` or \`yarn add ${pkg}\` and try again.`);
}
function isMissingModuleError(error, pkg) {
    if (typeof error !== 'object' || error === null || !('code' in error) || !('message' in error)) {
        return false;
    }
    const { code, message } = error;
    return ((code === 'MODULE_NOT_FOUND' || code === 'ERR_MODULE_NOT_FOUND') &&
        typeof message === 'string' &&
        (message.includes(`'${pkg}'`) || message.includes(`\"${pkg}\"`)));
}
function validateServices(services) {
    if (!Array.isArray(services) || services.length === 0) {
        throw new Error('services must be a non-empty array');
    }
    return services.map((service, index) => {
        if (!service || typeof service.name !== 'string' || service.name.trim() === '') {
            throw new TypeError(`services[${index}].name must be a non-empty string`);
        }
        if (!service || typeof service.url !== 'string' || service.url.trim() === '') {
            throw new TypeError(`services[${index}].url must be a non-empty string`);
        }
        return { name: service.name.trim(), url: service.url.trim() };
    });
}
async function knife4jSetup(app, services, prefix = '/') {
    const validatedServices = validateServices(services);
    const dynamicPrefix = normalizePrefix(prefix);
    const staticPrefix = stripTrailingSlash(dynamicPrefix);
    const servicePath = dynamicPrefix + 'services.json';
    const adapter = app.getHttpAdapter();
    const httpAdapter = adapter.getType();
    const instance = adapter.getInstance();
    const uiPath = (0, node_path_1.resolve)(__dirname, '../ui/');
    if (httpAdapter === 'express') {
        let expressStatic;
        try {
            ;
            ({ static: expressStatic } = await Promise.resolve().then(() => require('express')));
        }
        catch (error) {
            if (isMissingModuleError(error, 'express')) {
                throw notInstalledError('express');
            }
            throw error;
        }
        const expressApp = instance;
        expressApp.get(servicePath, (_req, res) => {
            res.json(validatedServices);
        });
        expressApp.use(dynamicPrefix, expressStatic(uiPath));
        return;
    }
    if (httpAdapter === 'fastify') {
        let fastifyStatic;
        try {
            fastifyStatic = await Promise.resolve().then(() => require('@fastify/static'));
        }
        catch (error) {
            if (isMissingModuleError(error, '@fastify/static')) {
                throw notInstalledError('@fastify/static');
            }
            throw error;
        }
        const fastifyApp = instance;
        fastifyApp.get(servicePath, (_req, reply) => {
            reply.send(validatedServices);
        });
        await fastifyApp.register(fastifyStatic.default, {
            root: uiPath,
            prefix: staticPrefix,
            decorateReply: false,
        });
        return;
    }
    throw new Error(`Unsupported HTTP adapter: "${httpAdapter}". Only "express" and "fastify" are supported.`);
}
