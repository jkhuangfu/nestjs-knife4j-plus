const fs = require('node:fs')
const { execSync } = require('node:child_process')

function run(cmd, opts = {}) {
  console.log(`\n> ${cmd}`)
  execSync(cmd, { stdio: 'inherit', ...opts })
}

function cleanDist() {
  if (fs.existsSync('dist')) {
    fs.rmSync('dist', { recursive: true, force: true })
    console.log('Cleaned dist directory')
  }
}

function buildDist() {
  run('npx tsc -p tsconfig.js.json')
  run('npx tsc -p tsconfig.esm.json')
  run('npx tsc -p tsconfig.dts.json')
}

function patchDirname() {
  const cjsDirnameImpl = `
function getDirname() {
    return (0, node_path_1.dirname)(__dirname);
}
`
  const esmDirnameImpl = `
function getDirname() {
    return dirname(dirname(fileURLToPath(import.meta.url)));
}
`
  function replaceDirname(filePath, replacement) {
    let content = fs.readFileSync(filePath, 'utf8')
    const pattern = /function getDirname\(\) \{[\s\S]*?\n\}/
    content = content.replace(pattern, replacement.trim())
    fs.writeFileSync(filePath, content)
  }
  replaceDirname('dist/cjs/index.js', cjsDirnameImpl)
  replaceDirname('dist/esm/index.js', esmDirnameImpl)
  console.log('Patched getDirname functions')
}

function minify() {
  run('npx esbuild dist/cjs/index.js --minify --keep-names --allow-overwrite --outfile=dist/cjs/index.js')
  run('npx esbuild dist/esm/index.js --minify --keep-names --allow-overwrite --outfile=dist/esm/index.js')
  console.log('Minified JS output')
}

function buildFront() {
  run('npm run build', { cwd: 'front' })
}

function buildServer() {
  cleanDist()
  buildDist()
  patchDirname()
  minify()
}

function build() {
  buildFront()
  buildServer()
}

function typecheck() {
  run('npx tsc -p tsconfig.build.json --noEmit')
}

const args = process.argv.slice(2)
const task = args[0] || 'build'

switch (task) {
  case 'build':
    build()
    break
  case 'build-server':
    buildServer()
    break
  case 'build-front':
    buildFront()
    break
  case 'typecheck':
    typecheck()
    break
  default:
    console.error(`Unknown task: ${task}`)
    process.exit(1)
}
