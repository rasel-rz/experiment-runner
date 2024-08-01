const fs = require('fs');
const path = require('path');
const inq = require('inquirer').default;
console.log(">> Variation selection window");

const PromptConstants = {
    WEBSITE: 'Create new website',
    CAMPAIGN: 'Create new campaign',
    VARIATION: 'Create new variation',
    TEMPLATE: 'Create new template',
    EMPTY: 'Empty',
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
const templatesPath = path.join(__dirname, 'templates');
let selectedWebsite = null, selectedCampaign = null, selectedVariation = null;

function selectWebsite() {
    return new Promise((resolve, reject) => {
        const websites = fs.readdirSync(rootPath);
        if (websites.length) websites.push(new inq.Separator());
        websites.push(PromptConstants.WEBSITE, PromptConstants.TEMPLATE, PromptConstants.EXIT);
        inq.prompt([{ type: 'list', message: 'Select a website', name: 'website', choices: websites }]).then((answers) => {
            if (answers.website === PromptConstants.EXIT) return reject();
            if (answers.website === PromptConstants.TEMPLATE) return reject(createTemplate());
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
                const templates = fs.readdirSync(templatesPath);
                if (templates.length) templates.unshift(new inq.Separator());
                templates.unshift(PromptConstants.EMPTY);
                inq.prompt([{ type: 'list', message: 'Select a template', name: 'template', choices: templates }]).then((answers) => {
                    const variationPath = path.join(rootPath, selectedWebsite, selectedCampaign, selectedVariation);
                    fs.mkdirSync(variationPath);
                    if (answers.template === PromptConstants.EMPTY) {
                        fs.createWriteStream(path.join(variationPath, 'index.js')).end();
                        fs.createWriteStream(path.join(variationPath, 'style.scss')).end();
                    } else {
                        const templatePath = path.join(templatesPath, answers.template);
                        fs.copyFileSync(path.join(templatePath, 'index.js'), path.join(variationPath, 'index.js'));
                        fs.copyFileSync(path.join(templatePath, 'style.scss'), path.join(variationPath, 'style.scss'));
                    }
                    return resolve(selectedVariation);
                }).catch(reject);
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

function createTemplate() {
    inq.prompt([{ type: 'input', message: 'Enter template name:', name: 'template', validate: (input) => pathValidator(input, 'Template') }]).then((answers) => {
        const templatePath = path.join(templatesPath, answers.template);
        if (fs.existsSync(templatePath)) return console.log('Template already exists');
        fs.mkdirSync(templatePath);
        fs.createWriteStream(path.join(templatePath, 'index.js')).end();
        fs.createWriteStream(path.join(templatePath, 'style.scss')).end();
    }).catch((e) => console.trace(e));
}