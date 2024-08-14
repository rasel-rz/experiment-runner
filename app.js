require('dotenv').config()
const express = require('express');
const https = require('https');
const fs = require('fs');
const path = require('path');
const sass = require('sass');
const rollup = require('rollup');
const color = require('picocolors');
const app = express();
const serverport = process.env.SERVER_PORT || 3001;
const wsport = process.env.WS_PORT || 3031;
const protocol = process.env.PROTOCOL || 'http';
const buildFormat = process.env.BUILD_FORMAT || 'cjs';
const toCopyToClipboard = (process.env.COPY_TO_CLIPBOARD || 'false') === 'true';
const cssFormat = (process.env.MINIFY_CSS || 'false') === 'true' ? 'compressed' : 'expanded';
const rollupAlias = require('@rollup/plugin-alias');
const rollupJson = require('@rollup/plugin-json');
const rollupCss = require('rollup-plugin-import-css');
const pluginConfigs = [
    rollupJson({ namedExports: false, preferConst: true }),
    rollupAlias({
        entries: [
            { find: /@utils\/(.*)/, replacement: "./../../../../utils/$1" },
        ],
    }),
    rollupCss(),
];
app.get('/', (req, res) => res.send('Hello World!'));

const rootPath = path.join(__dirname + '/src');
function getActiveVariation() {
    const websites = fs.readdirSync(rootPath);
    let activeVariation = null;
    websites.forEach(website => {
        const campaigns = fs.readdirSync(path.join(rootPath, website));
        campaigns.forEach(campaign => {
            const variations = fs.readdirSync(path.join(rootPath, website, campaign));
            variations.forEach(variation => {
                const isActiveNow = fs.existsSync(path.join(rootPath, website, campaign, variation, '.now'));
                if (!isActiveNow) return;
                activeVariation = { website, campaign, variation };
            });
        });
    });
    return activeVariation;
}
const activeVariation = getActiveVariation();
if (!activeVariation) return console.log(color.red(`No active variation found!\n${color.yellow(`Please select a variation first using ${color.red('`npm run select`')}.`)}`));
const variationDir = path.join(rootPath, activeVariation.website, activeVariation.campaign, activeVariation.variation);
if (!fs.existsSync(path.join(variationDir, 'dist'))) fs.mkdirSync(path.join(variationDir, 'dist'));

function bundleJs(variationPath) {
    return new Promise(async (resolve, reject) => {
        const bundle = await rollup.rollup({
            input: path.join(variationPath, 'index.js'),
            plugins: pluginConfigs
        });
        const { output } = await bundle.generate({ format: buildFormat, strict: false });
        const bundleJs = output[0].code;
        fs.writeFileSync(path.join(variationPath, 'dist', 'index.js'), bundleJs);
        resolve();
    });
}

app.get("/variation.js", (req, res) => {
    return res.sendFile(path.join(variationDir, 'dist', 'index.js'));
});
app.get("/variation.css", (req, res) => {
    const result = sass.compile(path.join(variationDir, 'style.scss'), { style: cssFormat });
    const cssPath = path.join(variationDir, 'dist', 'style.css');
    fs.writeFileSync(cssPath, result.css);
    res.sendFile(cssPath);
});
app.get("/experiment-runner.js", (req, res) => {
    const bundleJs = fs.readFileSync(path.join(__dirname, 'ops', 'bundle.js')).toString()
        .replace(/{{server_port}}/g, serverport)
        .replace(/{{ws_port}}/g, wsport)
        .replace(/{{hostname}}/g, req.hostname)
        .replace(/{{protocol}}/g, protocol);
    res.send(bundleJs).end();
});
app.get("/experiment-test.js", (req, res) => {
    const bundleJs = fs.readFileSync(path.join(__dirname, 'ops', 'bundle-no-socket.js')).toString()
        .replace(/{{server_port}}/g, serverport)
        .replace(/{{hostname}}/g, req.hostname)
        .replace(/{{protocol}}/g, protocol);
    res.send(bundleJs).end();
});

bundleJs(variationDir).then(() => {
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
wss.on('connection', ws => {
    if (connected) return;
    connected = true;
    let timer = null;

    const cssPath = path.join(variationDir, 'style.scss');
    fs.watch(cssPath, (event, filename) => {
        if (event !== 'change') return;
        clearTimeout(timer);
        timer = setTimeout(() => {
            filename = path.relative(__dirname, cssPath);
            console.log(color[lc ? 'green' : 'cyan'](`File ${filename} has been changed at ${new Date().toLocaleTimeString()}, updating...`));
            lc = !lc;
            wss.clients.forEach(tab => tab.send(JSON.stringify({ event, filename })));
        }, 1000);
    });

    jsWatcher.on('event', event => {
        if (event.code !== 'END' || !changedFilePath) return;
        console.log(color[lc ? 'green' : 'cyan'](`File ${changedFilePath} has been changed at ${new Date().toLocaleTimeString()}, reloading...`));
        lc = !lc;
        wss.clients.forEach(tab => tab.send(JSON.stringify({ event: 'change', filename: changedFilePath })));
    });
    console.log(color[lc ? 'green' : 'cyan']('Live reloading connected. Watching files for changes...'));
    lc = !lc;
});
if (toCopyToClipboard) {
    const clipboard = require('node-clipboardy');
    jsWatcher.on('event', event => {
        if (event.code !== 'END' || !changedFilePath) return;
        const textToCopy = fs.readFileSync(path.join(variationDir, 'dist', 'index.js')).toString();
        clipboard.writeSync(textToCopy);
        console.log(color[lc ? 'green' : 'cyan'](`File ${changedFilePath} has been changed at ${new Date().toLocaleTimeString()}, copied to clipboard.`));
        lc = !lc;
    });
}

console.log("--------------------------------------------------------------------------------------------------------------------")
console.log(`> Server port: \t\t ${color.italic(serverport)} \t\t|\t> WebSocket port: \t ${color.italic(wsport)}`);
console.log(`> Protocol: \t\t ${color.italic(protocol)} \t\t|\t> Copy to clipboard: \t ${color.italic(toCopyToClipboard)}`);
console.log(`> Build format: \t ${color.italic(buildFormat)} \t\t|\t> Active variation: \t ${color.italic(`${activeVariation.website} > ${activeVariation.campaign} > ${activeVariation.variation}`)}`);
console.log("--------------------------------------------------------------------------------------------------------------------")
