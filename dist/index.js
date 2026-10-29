"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.knife4jSetup = knife4jSetup;
const node_path_1 = require("node:path");
function normalizePrefix(prefix) {
    if (typeof prefix !== 'string')
        throw new TypeError('prefix must be a string');
    const trimmed = prefix.trim().replace(/\/{2,}/g, '/');
    const withLeading = trimmed.startsWith('/') ? trimmed : `/${trimmed}`;
    return withLeading.endsWith('/') ? withLeading : `${withLeading}/`;
}
const stripTrailingSlash = (p) => p.length > 1 && p.endsWith('/') ? p.slice(0, -1) : p;
const notInstalled = (pkg) => new Error(`${pkg} is not installed. Run \`npm install ${pkg}\` (or pnpm/yarn add ${pkg}) and try again.`);
function isMissingModuleError(error, pkg) {
    if (typeof error !== 'object' || error === null || !('code' in error))
        return false;
    const { code, message } = error;
    return ((code === 'MODULE_NOT_FOUND' || code === 'ERR_MODULE_NOT_FOUND') &&
        typeof message === 'string' &&
        (message.includes(`'${pkg}'`) || message.includes(`"${pkg}"`)));
}
async function loadPeerPackage(pkg) {
    try {
        return (await Promise.resolve(`${pkg}`).then(s => require(s)));
    }
    catch (error) {
        if (isMissingModuleError(error, pkg))
            throw notInstalled(pkg);
        throw error;
    }
}
function validateServices(services) {
    if (!Array.isArray(services) || services.length === 0) {
        throw new Error('services must be a non-empty array');
    }
    return services.map((s, i) => {
        if (typeof s?.name !== 'string' || s.name.trim() === '') {
            throw new TypeError(`services[${i}].name must be a non-empty string`);
        }
        if (typeof s?.url !== 'string' || s.url.trim() === '') {
            throw new TypeError(`services[${i}].url must be a non-empty string`);
        }
        return { name: s.name.trim(), url: s.url.trim() };
    });
}
async function knife4jSetup(app, services, prefix = '/') {
    const validated = validateServices(services);
    const dynamicPrefix = normalizePrefix(prefix);
    const staticPrefix = stripTrailingSlash(dynamicPrefix);
    const servicePath = `${dynamicPrefix}services.json`;
    const adapter = app.getHttpAdapter();
    const type = adapter.getType();
    const server = adapter.getInstance();
    const uiRoot = (0, node_path_1.resolve)(__dirname, '../ui/');
    server.get(servicePath, (_req, res) => {
        if (type === 'express')
            res.json(validated);
        else
            res.send(validated);
    });
    if (type === 'express') {
        const { static: serveStatic } = await loadPeerPackage('express');
        server.use(dynamicPrefix, serveStatic(uiRoot));
    }
    else if (type === 'fastify') {
        const mod = await loadPeerPackage('@fastify/static');
        await server.register(mod.default, {
            root: uiRoot,
            prefix: staticPrefix,
            decorateReply: false,
        });
    }
    else if (type === 'node') {
        ;
        app.useStaticAssets(uiRoot, { prefix: dynamicPrefix });
    }
    else {
        throw new Error(`Unsupported HTTP adapter: "${type}". Only "express", "fastify" and "node" are supported.`);
    }
}
