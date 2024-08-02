require('dotenv').config()
const express = require('express');
const fs = require('fs');
const path = require('path');
const sass = require('sass');
const rollup = require('rollup');
const app = express();
const serverport = process.env.SERVER_PORT || 3001;
const wsport = process.env.WS_PORT || 3031;
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
if (!activeVariation) return console.log('No active variation found!');
const variationDir = path.join(rootPath, activeVariation.website, activeVariation.campaign, activeVariation.variation);

function bundleJs(variationPath) {
    return new Promise(async (resolve, reject) => {
        const bundle = await rollup.rollup({
            input: path.join(variationPath, 'index.js')
        });
        const { output } = await bundle.generate({ format: 'iife', strict: false });
        const bundleJs = output[0].code;
        fs.writeFileSync(path.join(variationPath, 'build.js'), bundleJs);
        resolve();
    });
}


app.get("/variation.js", (req, res) => {
    const buildJSExists = fs.existsSync(path.join(variationDir, 'build.js'));
    if (buildJSExists) return res.sendFile(path.join(variationDir, 'build.js'));
    bundleJs(variationDir).then(res.sendFile.bind(res, path.join(variationDir, 'build.js')));
});
app.get("/variation.css", (req, res) => {
    const result = sass.compile(path.join(variationDir, 'style.scss'), { style: "compressed" });
    const cssPath = path.join(variationDir, 'style.css');
    fs.writeFileSync(cssPath, result.css);
    res.sendFile(cssPath);
});
app.get("/experiment-runner.js", (req, res) => {
    const bundleJs = fs.readFileSync(path.join(__dirname, 'bundle.js')).toString().replace(/{{server_port}}/g, serverport).replace(/{{ws_port}}/g, wsport);
    res.send(bundleJs).end();
});
app.listen(serverport, () => console.log(`Server is running at http://localhost:${serverport}`));

let connected = false;
const ws = require('ws');
const wss = new ws.WebSocketServer({ port: wsport });
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
            console.log(`File ${filename} has been changed at ${new Date().toLocaleTimeString()}, updating...`);
            wss.clients.forEach(tab => tab.send(JSON.stringify({ event, filename })));
        }, 1000);
    });

    let changedFilePath = null;
    const jsWatcher = rollup.watch({
        input: path.join(variationDir, 'index.js'),
        output: { file: path.join(variationDir, 'build.js'), format: (process.env.BUILD_FORMAT || 'cjs'), strict: false }
    });
    jsWatcher.on('event', event => {
        if (event.code !== 'END' || !changedFilePath) return;
        console.log(`File ${changedFilePath} has been changed at ${new Date().toLocaleTimeString()}, reloading...`);
        wss.clients.forEach(tab => tab.send(JSON.stringify({ event: 'change', filename: changedFilePath })));
    });
    jsWatcher.on('change', filename => {
        changedFilePath = path.relative(__dirname, filename);
    });
    console.log('Watching files for changes...');
});