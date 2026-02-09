"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.knife4jSetup = knife4jSetup;
const node_path_1 = require("node:path");
async function knife4jSetup(app, services, prefix = '/') {
    let prefixStr = prefix.trim();
    if (!prefixStr.startsWith('/')) {
        prefixStr = '/' + prefixStr;
    }
    const httpAdapter = app.getHttpAdapter().getType();
    const instance = app.getHttpAdapter().getInstance();
    if (!['express', 'fastify'].includes(httpAdapter)) {
        throw new Error('http adapter only supported express and fastify');
    }
    if (httpAdapter === 'express') {
        try {
            const expressStatic = await Promise.resolve().then(() => require('express')).then((mod) => mod.static);
            app.use(prefixStr, expressStatic((0, node_path_1.resolve)(__dirname, '../ui/')));
            app.use('/services.json', (_, res) => {
                res.send(services);
            });
        }
        catch (error) {
            throw new Error('express is not installed please install it first ?, run `npm install express` or `yarn add express` try again');
        }
        return;
    }
    try {
        const fastifyStatic = await Promise.resolve().then(() => require('@fastify/static')).then((mod) => mod.default);
        instance.register(fastifyStatic, {
            root: (0, node_path_1.join)(__dirname, '../ui'),
            prefix: prefixStr,
            decorateReply: false,
        });
        instance.get('/services.json', (_, repl) => {
            repl.send(services);
        });
    }
    catch (error) {
        throw new Error('@fastify/static is not installed please install it first? , run `npm install @fastify/static` or `yarn add @fastify/static` try again');
    }
}
