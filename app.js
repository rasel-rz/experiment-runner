const express = require('express');
const fs = require('fs');
const path = require('path');
const sass = require('sass');
const app = express();
const port = 3001;

const ws = require('ws');
const wss = new ws.WebSocketServer({ port: 3031 });

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

app.get("/variation.js", (req, res) => {
    const activeVariation = getActiveVariation();
    if (!activeVariation) return res.status(404).send(JSON.stringify({ error: 'No active variation found' })).end();
    const variationPath = path.join(rootPath, activeVariation.website, activeVariation.campaign, activeVariation.variation, 'index.js');
    res.sendFile(variationPath);
});
app.get("/variation.css", (req, res) => {
    const activeVariation = getActiveVariation();
    if (!activeVariation) return res.status(404).send(JSON.stringify({ error: 'No active variation found' })).end();
    const variationDir = path.join(rootPath, activeVariation.website, activeVariation.campaign, activeVariation.variation);
    const result = sass.compile(path.join(variationDir, 'style.scss'), { style: "compressed" });
    const variationPath = path.join(variationDir, 'style.css');
    fs.writeFileSync(variationPath, result.css);
    res.sendFile(variationPath);
});
app.listen(port, () => console.log(`Server is running at http://localhost:${port}`));

let connected = false;
wss.on('connection', ws => {
    if (connected) return;
    connected = true;
    let timer = null;
    const activeVariation = getActiveVariation();
    const filesToWatch = [
        path.join(rootPath, activeVariation.website, activeVariation.campaign, activeVariation.variation, 'index.js'),
        path.join(rootPath, activeVariation.website, activeVariation.campaign, activeVariation.variation, 'style.scss'),
    ];
    filesToWatch.forEach(file => {
        fs.watch(file, (event, filename) => {
            if (event !== 'change') return;
            clearTimeout(timer);
            timer = setTimeout(() => {
                console.log(`File ${filename} has been changed at ${new Date().toISOString()}`);
                console.log(`Sending message to all(${wss.clients.size}) tabs...`);
                wss.clients.forEach(tab => tab.send(JSON.stringify({ event, filename })));
            }, 1000);
        });
    });
    console.log('Watching files for changes...');
});