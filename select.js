const fs = require('fs');
const path = require('path');
const inq = require('inquirer').default;
console.log(">> Variation selection window");

const PromptConstants = {
    WEBSITE: 'Create new website',
    CAMPAIGN: 'Create new campaign',
    VARIATION: 'Create new variation',
    EXIT: 'Exit'
}

function pathValidator(input, name) {
    input = input.trim();
    if (!input) return name + ' name cannot be empty';
    if (input.match(/[^A-z0-9-\s]/i)) return name + ' name can only contain alphanumeric characters, dashes, and spaces';
    if (fs.existsSync(path.join(rootPath, input))) return name + ' name already exists';
    return true;
}
const rootPath = path.join(__dirname + '/src');
let selectedWebsite = null, selectedCampaign = null, selectedVariation = null;

function selectWebsite() {
    return new Promise((resolve, reject) => {
        const websites = fs.readdirSync(rootPath);
        if (websites.length) websites.push(new inq.Separator());
        websites.push(PromptConstants.WEBSITE, PromptConstants.EXIT);
        inq.prompt([{ type: 'list', message: 'Select a website', name: 'website', choices: websites }]).then((answers) => {
            if (answers.website === PromptConstants.EXIT) return reject();
            if (answers.website !== PromptConstants.WEBSITE) return resolve(selectedWebsite = answers.website);
            inq.prompt([{ type: 'input', message: 'Enter website name:', name: 'website', validate: () => pathValidator(answers.website, 'Website') }]).then((answers) => {
                selectedWebsite = answers.website;
                fs.mkdirSync(path.join(rootPath, selectedWebsite));
                return resolve(selectedWebsite);
            }).catch(reject);
        }).catch(reject);
    });
}

function selectCampaign() {
    return new Promise((resolve, reject) => {
        const campaigns = fs.readdirSync(path.join(rootPath, selectedWebsite));
        if (campaigns.length) campaigns.push(new inq.Separator());
        campaigns.push(PromptConstants.CAMPAIGN, PromptConstants.EXIT);
        inq.prompt([{ type: 'list', message: 'Select a campaign', name: 'campaign', choices: campaigns }]).then((answers) => {
            if (answers.campaign === PromptConstants.EXIT) return reject();
            if (answers.campaign !== PromptConstants.CAMPAIGN) return resolve(selectedCampaign = answers.campaign);
            inq.prompt([{ type: 'input', message: 'Enter campaign name:', name: 'campaign', validate: () => pathValidator(answers.campaign, 'Campaign') }]).then((answers) => {
                selectedCampaign = answers.campaign;
                fs.mkdirSync(path.join(rootPath, selectedWebsite, selectedCampaign));
                return resolve(selectedCampaign);
            }).catch(reject);
        }).catch(reject);
    });
}

function selectVariation() {
    return new Promise((resolve, reject) => {
        const variations = fs.readdirSync(path.join(rootPath, selectedWebsite, selectedCampaign));
        if (variations.length) variations.push(new inq.Separator());
        variations.push(PromptConstants.VARIATION, PromptConstants.EXIT);
        inq.prompt([{ type: 'list', message: 'Select a variation', name: 'variation', choices: variations }]).then((answers) => {
            if (answers.variation === PromptConstants.EXIT) return reject();
            if (answers.variation !== PromptConstants.VARIATION) return resolve(selectedVariation = answers.variation);
            inq.prompt([{ type: 'input', message: 'Enter variation name:', name: 'variation', validate: () => pathValidator(answers.variation, 'Variation') }]).then((answers) => {
                selectedVariation = answers.variation;
                fs.mkdirSync(path.join(rootPath, selectedWebsite, selectedCampaign, selectedVariation));
                fs.createWriteStream(path.join(rootPath, selectedWebsite, selectedCampaign, selectedVariation, 'index.js')).end();
                fs.createWriteStream(path.join(rootPath, selectedWebsite, selectedCampaign, selectedVariation, 'style.scss')).end();
                return resolve(selectedVariation);
            }).catch(reject);
        }).catch(reject);
    });
}

selectWebsite().then(selectCampaign).then(selectVariation).then(() => {
    fs.readdirSync(rootPath).forEach(website => {
        fs.readdirSync(path.join(rootPath, website)).forEach(campaign => {
            fs.readdirSync(path.join(rootPath, website, campaign)).forEach(variation => {
                const isActiveNow = fs.existsSync(path.join(rootPath, website, campaign, variation, '.now'));
                if (isActiveNow) fs.unlinkSync(path.join(rootPath, website, campaign, variation, '.now'));
            });
        });
    });
    console.log('>>> Selected variation: ' + [selectedWebsite, selectedCampaign, selectedVariation].join(' > '));
    fs.createWriteStream(path.join(rootPath, selectedWebsite, selectedCampaign, selectedVariation, '.now')).end();
}).catch(() => true);
