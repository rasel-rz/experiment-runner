const path = require('path');
const fs = require('fs');
const readdirSync_f = require('./read-folders');
module.exports = function getActiveVariation() {
    const rootPath = path.join(__dirname + '/..' + '/src');
    const websites = readdirSync_f(rootPath);
    let activeVariation = null;
    websites.forEach(website => {
        const campaigns = readdirSync_f(path.join(rootPath, website));
        campaigns.forEach(campaign => {
            const variations = readdirSync_f(path.join(rootPath, website, campaign));
            variations.forEach(variation => {
                const isActiveNow = fs.existsSync(path.join(rootPath, website, campaign, variation, '.now'));
                if (!isActiveNow) return;
                activeVariation = { website, campaign, variation };
            });
        });
    });
    return activeVariation;
}