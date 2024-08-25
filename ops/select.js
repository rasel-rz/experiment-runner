require('dotenv').config();
const isUsedAsSubmodule = (process.env.IS_SUBMODULE || 'false') === 'true';
const fs = require('fs');
const path = require('path');
const inq = require('inquirer').default;
const getActiveVariation = require('./active-variation');
const readdirSync_f = require('./read-folders');
const fuzzy = require('fuzzy');
console.log(">> Variation selection window");

const PromptConstants = {
    WEBSITE: 'Create new website',
    CAMPAIGN: 'Create new campaign',
    VARIATION: 'Create new variation',
    TEMPLATE: 'Create new template',
    EMPTY: 'Empty',
    BACK: 'Go back',
    EXIT: 'Exit'
}

function pathValidator(input, name) {
    input = input.trim();
    if (!input) return name + ' name cannot be empty';
    if (input.match(/[^A-z0-9-\s]/i)) return name + ' name can only contain alphanumeric characters, dashes, and spaces';
    if (fs.existsSync(path.join(rootPath, input))) return name + ' name already exists';
    return true;
}

function generateAutocompleteSource(choices, defaultChoices, Seperator) {
    const mappedChoices = choices.length && choices.map(x => { return { value: x } });
    const mappedDefaultChoices = defaultChoices.length && defaultChoices.map(x => { return { value: x } });
    return async function (input) {
        input = input || '';
        const fuzzyResult = fuzzy.filter(input, mappedChoices, { extract: (x) => x.value }).map(x => { return { value: x.original.value } });
        if (fuzzyResult.length) fuzzyResult.push(new Seperator());
        if (mappedDefaultChoices.length) fuzzyResult.push(...mappedDefaultChoices);
        return fuzzyResult
    }
}

const rootPath = path.join(__dirname + `./..${isUsedAsSubmodule ? `/..` : ''}/src`);
if (!fs.existsSync(rootPath)) fs.mkdirSync(rootPath);
const templatesPath = path.join(__dirname, `./..${isUsedAsSubmodule ? `/..` : ''}/templates`);
if (!fs.existsSync(templatesPath)) fs.mkdirSync(templatesPath);
let selectedWebsite = null, selectedCampaign = null, selectedVariation = null;

(async function () {
    const { default: inqPrompt, Separator } = await import('inquirer-autocomplete-standalone');

    let logTimer = null;
    function selectWebsite() {
        return new Promise((resolve, reject) => {
            const websites = readdirSync_f(rootPath);
            inqPrompt({
                message: 'Select a website',
                source: generateAutocompleteSource(websites, [PromptConstants.WEBSITE, PromptConstants.TEMPLATE, PromptConstants.EXIT], Separator),
            }).then((answeredWebsite) => {
                if (answeredWebsite === PromptConstants.EXIT) return reject();
                if (answeredWebsite === PromptConstants.TEMPLATE) return reject(createTemplate());
                if (answeredWebsite !== PromptConstants.WEBSITE) return resolve(selectedWebsite = answeredWebsite);
                inq.prompt([{ type: 'input', message: 'Enter website name:', name: 'website', validate: () => pathValidator(answeredWebsite, 'Website') }]).then((answers) => {
                    selectedWebsite = answers.website;
                    fs.mkdirSync(path.join(rootPath, selectedWebsite));
                    return resolve(selectedWebsite);
                }).catch(reject);
            }).catch(reject);
        });
    }

    function selectCampaign() {
        return new Promise((resolve, reject) => {
            const campaigns = readdirSync_f(path.join(rootPath, selectedWebsite));
            inqPrompt({
                message: "Select a campaign",
                source: generateAutocompleteSource(campaigns, [PromptConstants.CAMPAIGN, PromptConstants.BACK, PromptConstants.EXIT], Separator),
            }).then((answeredCampaign) => {
                if (answeredCampaign === PromptConstants.EXIT) return reject();
                if (answeredCampaign === PromptConstants.BACK) return reject(selectWebsite().then(selectCampaign).then(selectVariation).then(selectVariationNow).catch(catch$));
                if (answeredCampaign !== PromptConstants.CAMPAIGN) return resolve(selectedCampaign = answeredCampaign);
                inq.prompt([{ type: 'input', message: 'Enter campaign name:', name: 'campaign', validate: () => pathValidator(answeredCampaign, 'Campaign') }]).then((answers) => {
                    selectedCampaign = answers.campaign;
                    fs.mkdirSync(path.join(rootPath, selectedWebsite, selectedCampaign));
                    return resolve(selectedCampaign);
                }).catch(reject);
            }).catch(reject);
        });
    }

    function selectVariation() {
        return new Promise((resolve, reject) => {
            const variations = readdirSync_f(path.join(rootPath, selectedWebsite, selectedCampaign));
            inqPrompt({
                message: "Select a variation",
                source: generateAutocompleteSource(variations, [PromptConstants.VARIATION, PromptConstants.BACK, PromptConstants.EXIT], Separator),
            }).then((answeredVariation) => {
                if (answeredVariation === PromptConstants.EXIT) return reject();
                if (answeredVariation === PromptConstants.BACK) return resolve(selectCampaign().then(selectVariation).then(selectVariationNow).catch(catch$));
                if (answeredVariation !== PromptConstants.VARIATION) return resolve(selectedVariation = answeredVariation);
                inq.prompt([{ type: 'input', message: 'Enter variation name:', name: 'variation', validate: () => pathValidator(answeredVariation, 'Variation') }]).then((answers) => {
                    selectedVariation = answers.variation;
                    const templates = readdirSync_f(templatesPath);
                    inqPrompt({
                        message: "Select a template",
                        source: generateAutocompleteSource(templates, [PromptConstants.EMPTY, PromptConstants.BACK, PromptConstants.EXIT], Separator),
                    }).then((answeredTemplate) => {
                        if (answeredTemplate === PromptConstants.EXIT) return reject();
                        if (answeredTemplate === PromptConstants.BACK) return resolve(selectVariation().then(selectVariationNow).catch(catch$));
                        const variationPath = path.join(rootPath, selectedWebsite, selectedCampaign, selectedVariation);
                        fs.mkdirSync(variationPath);
                        if (answeredTemplate === PromptConstants.EMPTY) {
                            fs.createWriteStream(path.join(variationPath, 'index.js')).end();
                            fs.createWriteStream(path.join(variationPath, 'style.scss')).end();
                        } else {
                            const templatePath = path.join(templatesPath, answeredTemplate);
                            fs.copyFileSync(path.join(templatePath, 'index.js'), path.join(variationPath, 'index.js'));
                            fs.copyFileSync(path.join(templatePath, 'style.scss'), path.join(variationPath, 'style.scss'));
                        }
                        return resolve(selectedVariation);
                    }).catch(reject);
                }).catch(reject);
            }).catch(reject);
        });
    }

    function selectVariationNow() {
        readdirSync_f(rootPath).forEach(website => {
            readdirSync_f(path.join(rootPath, website)).forEach(campaign => {
                readdirSync_f(path.join(rootPath, website, campaign)).forEach(variation => {
                    const isActiveNow = fs.existsSync(path.join(rootPath, website, campaign, variation, '.now'));
                    if (isActiveNow) fs.unlinkSync(path.join(rootPath, website, campaign, variation, '.now'));
                });
            });
        });
        fs.createWriteStream(path.join(rootPath, selectedWebsite, selectedCampaign, selectedVariation, '.now')).end();
        clearTimeout(logTimer);
        logTimer = setTimeout(() => console.log('>>> Selected variation: ' + [selectedWebsite, selectedCampaign, selectedVariation].join(' > ')), 1e3);
    }

    function createTemplate() {
        inq.prompt([{ type: 'input', message: 'Enter template name:', name: 'template', validate: (input) => pathValidator(input, 'Template') }]).then((answers) => {
            const templatePath = path.join(templatesPath, answers.template);
            fs.mkdirSync(templatePath);
            fs.createWriteStream(path.join(templatePath, 'index.js')).end();
            fs.createWriteStream(path.join(templatePath, 'style.scss')).end();
        }).catch((e) => console.trace(e));
    }

    function catch$(e) { return true; }

    const directToCampaign = process.argv[2] === 'campaign';
    const directToVariation = process.argv[2] === 'variation';
    if (!directToCampaign && !directToVariation) return selectWebsite().then(selectCampaign).then(selectVariation).then(selectVariationNow).catch(catch$);
    const activeVariation = getActiveVariation();
    if (!activeVariation) return console.log('No active variation found! Try `npm run select` first.');
    selectedWebsite = activeVariation.website;
    if (directToCampaign) return selectCampaign().then(selectVariation).then(selectVariationNow).catch(catch$);
    selectedCampaign = activeVariation.campaign;
    if (directToVariation) return selectVariation().then(selectVariationNow).catch(catch$);
})();