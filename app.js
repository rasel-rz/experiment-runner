require('dotenv').config()
const express = require('express');
const fs = require('fs');
const path = require('path');
const sass = require('sass');
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

app.get("/variation.js", (req, res) => {
    const variationPath = path.join(rootPath, activeVariation.website, activeVariation.campaign, activeVariation.variation, 'index.js');
    res.sendFile(variationPath);
});
app.get("/variation.css", (req, res) => {
    const variationDir = path.join(rootPath, activeVariation.website, activeVariation.campaign, activeVariation.variation);
    const result = sass.compile(path.join(variationDir, 'style.scss'), { style: "compressed" });
    const variationPath = path.join(variationDir, 'style.css');
    fs.writeFileSync(variationPath, result.css);
    res.sendFile(variationPath);
});
app.get("/bundle.js", (req, res) => {
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
    const filesToWatch = [
        path.join(rootPath, activeVariation.website, activeVariation.campaign, activeVariation.variation, 'index.js'),
        path.join(rootPath, activeVariation.website, activeVariation.campaign, activeVariation.variation, 'style.scss'),
    ];
    filesToWatch.forEach(file => {
        fs.watch(file, (event, filename) => {
            if (event !== 'change') return;
            clearTimeout(timer);
            timer = setTimeout(() => {
                console.log(`File ${filename} has been changed at ${new Date().toLocaleTimeString()}`);
                console.log(`Sending message to all(${wss.clients.size}) opened tab(s).`);
                wss.clients.forEach(tab => tab.send(JSON.stringify({ event, filename })));
            }, 1000);
        });
    });
    console.log('Watching files for changes...');
});