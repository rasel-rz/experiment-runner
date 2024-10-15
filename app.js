require('dotenv').config()
const express = require('express');
const https = require('https');
const fs = require('fs');
const path = require('path');
const sass = require('sass');
const rollup = require('rollup');
const color = require('picocolors');
const getActiveVariation = require('./ops/active-variation');
const clipboard = require('node-clipboardy');
const app = express();
const serverport = process.env.SERVER_PORT || 3001;
const wsport = process.env.WS_PORT || 3031;
const protocol = process.env.PROTOCOL || 'http';
const buildFormat = process.env.BUILD_FORMAT || 'cjs';
const toCopyToClipboard = (process.env.COPY_TO_CLIPBOARD || 'false') === 'true';
const commentsOnBuild = process.env.COMMENTS || 'all';
const cssFormat = (process.env.MINIFY_CSS || 'false') === 'true' ? 'compressed' : 'expanded';
const isUsedAsSubmodule = (process.env.IS_SUBMODULE || 'false') === 'true';
const buildOnly = process.argv[2] === 'build';
const buildFormatCmd = buildOnly && process.argv[3];
const rollupAlias = require('@rollup/plugin-alias');
const rollupJson = require('@rollup/plugin-json');
const rollupCss = require('rollup-plugin-import-css');
const rollupImage = require('@rollup/plugin-image');
const { getBabelOutputPlugin } = require('@rollup/plugin-babel');
const rollupCleanup = require('rollup-plugin-cleanup');
const pluginConfigs = [
    rollupJson({ namedExports: false, preferConst: true }),
    rollupAlias({
        entries: [
            { find: /@utils\/(.*)/, replacement: `./../../../../${isUsedAsSubmodule ? 'experiment-runner/' : ''}utils/$1` },
        ],
    }),
    rollupCss(),
    rollupImage(),
    rollupCleanup({ comments: commentsOnBuild, maxEmptyLines: 1 })
];
app.get('/', (req, res) => res.send('Hello World!'));

const rootPath = path.join(__dirname + (isUsedAsSubmodule ? './..' : '') + '/src');
if (!fs.existsSync(rootPath)) fs.mkdirSync(rootPath);
const activeVariation = getActiveVariation();
if (!activeVariation) return console.log(color.red(`No active variation found!\n${color.yellow(`Please select a variation first using ${color.red('`npm run select`')}.`)}`));
const variationDir = path.join(rootPath, activeVariation.website, activeVariation.campaign, activeVariation.variation);
if (!fs.existsSync(path.join(variationDir, 'dist'))) fs.mkdirSync(path.join(variationDir, 'dist'));
if (!fs.existsSync(path.join(variationDir, 'index.js'))) fs.writeFileSync(path.join(variationDir, 'index.js'), '');
if (!fs.existsSync(path.join(variationDir, 'style.scss'))) fs.writeFileSync(path.join(variationDir, 'style.scss'), '');

function compileCss(variationDir) {
    try {
        const result = sass.compile(path.join(variationDir, 'style.scss'), { style: cssFormat });
        const cssPath = path.join(variationDir, 'dist', 'style.css');
        fs.writeFileSync(cssPath, result.css);
        return true;
    } catch (e) {
        console.log(color.red(`Error compiling SCSS file: ${e.message}`));
        return false;
    }
}

function buildToDist(variationPath, generateEs5Code = false, buildFormat_) {
    return new Promise(async (resolve, reject) => {
        const bundleConfig = {
            input: path.join(variationPath, 'index.js'),
            plugins: pluginConfigs
        };
        const bundle = await rollup.rollup(bundleConfig);
        buildFormat_ = buildFormatCmd || buildFormat;
        const { output } = await bundle.generate({ format: buildFormat_, strict: false });
        const bundledJs = output[0].code;
        fs.writeFileSync(path.join(variationPath, 'dist', 'index.js'), bundledJs);

        generateEs5Code && (async () => {
            try {
                bundleConfig.plugins.push(getBabelOutputPlugin({ allowAllFormats: true, presets: ['@babel/preset-env'] }));
                const bundle = await rollup.rollup(bundleConfig);
                const { output } = await bundle.generate({ format: buildFormat, strict: false });
                const bundledJs = output[0].code;
                fs.writeFileSync(path.join(variationPath, 'dist', 'index.es5.js'), bundledJs);
            } catch (e) {
                console.log(color.red(`Error generating ES5 code: ${e.message}`));
            }
        })();
        compileCss(variationPath);
        resolve();
    });
}
if (buildOnly) return buildToDist(variationDir, true).then(async () => {
    console.log(color.green(`Build completed successfully & copied @ ${color.italic(`${activeVariation.website} > ${activeVariation.campaign} > ${activeVariation.variation}`)}`));
    const cssToCopy = fs.readFileSync(path.join(variationDir, 'dist', 'style.css')).toString();
    clipboard.writeSync(cssToCopy);
    await (() => new Promise(r => setTimeout(r, 1e3)))();
    const jsToCopy = fs.readFileSync(path.join(variationDir, 'dist', 'index.js')).toString();
    clipboard.writeSync(jsToCopy);
});

app.get("/variation.js", (req, res) => {
    return res.sendFile(path.join(variationDir, 'dist', 'index.js'));
});
app.get("/variation.css", (req, res) => {
    return res.sendFile(path.join(variationDir, 'dist', 'style.css'));
});
app.get("/experiment-runner.js", (req, res) => {
    const bundledJs = fs.readFileSync(path.join(__dirname, 'ops', 'bundle.js')).toString()
        .replace(/{{server_port}}/g, serverport)
        .replace(/{{ws_port}}/g, wsport)
        .replace(/{{hostname}}/g, req.hostname)
        .replace(/{{protocol}}/g, protocol);
    res.send(bundledJs).end();
});
app.get("/experiment-test.js", (req, res) => {
    const bundledJs = fs.readFileSync(path.join(__dirname, 'ops', 'bundle-no-socket.js')).toString()
        .replace(/{{server_port}}/g, serverport)
        .replace(/{{hostname}}/g, req.hostname)
        .replace(/{{protocol}}/g, protocol);
    res.send(bundledJs).end();
});

buildToDist(variationDir).then(() => {
    if (protocol === 'http') app.listen(serverport, () => console.log(color.green(`Server is running at ${color.underline(`http://localhost:${serverport}`)}`)));
    else {
        try {
            const key = fs.readFileSync('./key.pem');
            const cert = fs.readFileSync('./cert.pem');
            const server = https.createServer({ key: key, cert: cert }, app);
            server.listen(serverport, () => console.log(color.green(`Server is running at ${color.underline(`https://localhost:${serverport}`)}`)))
        } catch (e) {
            console.error('Error reading key.pem or cert.pem file, please make sure they are available in the root directory');
        }
    }
});

let changedFilePath = null;
const jsWatcher = rollup.watch({
    input: path.join(variationDir, 'index.js'),
    output: { file: path.join(variationDir, 'dist', 'index.js'), format: buildFormat, strict: false },
    plugins: pluginConfigs,
});
jsWatcher.on('change', filename => {
    changedFilePath = path.relative(__dirname, filename);
});

let connected = false;
const ws = require('ws');
const wss = new ws.WebSocketServer({ port: wsport });
let lc = true;
function colorLog() {
    lc = !lc;
    return color[lc ? 'green' : 'cyan'];
}
wss.on('connection', ws => {
    if (connected) return;
    connected = true;
    console.log(colorLog()('Live reloading connected. Watching files for changes...'));
});

let timer = null;
const scssPath = path.join(variationDir, 'style.scss');
fs.watch(scssPath, (event, filename) => {
    if (event !== 'change') return;
    clearTimeout(timer);
    timer = setTimeout(() => {
        filename = path.relative(__dirname, scssPath);
        const cssDone = compileCss(variationDir);
        if (!connected || !cssDone) return;
        console.log(colorLog()(`File ${filename} has been changed at ${new Date().toLocaleTimeString()}, updating...`));
        wss.clients.forEach(tab => tab.send(JSON.stringify({ event, filename })));
    }, 1000);
});

jsWatcher.on('event', event => {
    if (event.code !== 'END' || !changedFilePath) return;
    if (!connected && !toCopyToClipboard) return;
    if (connected) {
        wss.clients.forEach(tab => tab.send(JSON.stringify({ event: 'change', filename: changedFilePath })));
    } else {
        const textToCopy = fs.readFileSync(path.join(variationDir, 'dist', 'index.js')).toString();
        clipboard.writeSync(textToCopy);
    }
    console.log(colorLog()(`File ${changedFilePath} has been changed at ${new Date().toLocaleTimeString()}, ${connected ? 'reloading..' : 'copied to clipboard'}.`));
});

console.log("--------------------------------------------------------------------------------------------------------------------");
console.log(`> Server port: \t\t ${color.italic(serverport)} \t\t|\t> WebSocket port: \t ${color.italic(wsport)}`);
console.log(`> Protocol: \t\t ${color.italic(protocol)} \t\t|\t> Copy to clipboard: \t ${color.italic(toCopyToClipboard)}`);
console.log(`> Build format: \t ${color.italic(buildFormat)} \t\t|\t> Active variation: \t ${color.italic(`${activeVariation.website} > ${activeVariation.campaign} > ${activeVariation.variation}`)}`);
console.log("--------------------------------------------------------------------------------------------------------------------");
