const express = require('express');
const fs = require('fs');
const path = require('path');
const app = express();
const port = 3001;
app.get('/', (req, res) => {
    res.send('Hello World!');
});
app.get("/variation.js", (req, res) => {
    const rootPath = path.join(__dirname + '/src');
    const websites = fs.readdirSync(rootPath);
    let variationFound = false;
    websites.forEach(website => {
        const campaigns = fs.readdirSync(path.join(rootPath, website));
        campaigns.forEach(campaign => {
            const variations = fs.readdirSync(path.join(rootPath, website, campaign));
            variations.forEach(variation => {
                const isActiveNow = fs.existsSync(path.join(rootPath, website, campaign, variation, '.now'));
                if (!isActiveNow) return;
                const hasIndexJs = fs.existsSync(path.join(rootPath, website, campaign, variation, 'index.js'));
                if (!hasIndexJs) return;
                res.sendFile(path.join(rootPath, website, campaign, variation, 'index.js'));
                variationFound = true;
            });
        });
    });
    if (variationFound) return;
    res.status(404).send(JSON.stringify({ error: 'No active variation found' })).end();
});
app.listen(port, () => {
    console.log(`Server is running at http://localhost:${port}`);
});