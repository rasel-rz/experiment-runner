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

function pathValidator(input) {
    input = input.trim().replace(/[^a-zA-Z\d]/gi, '-');
    if (!input) return 'Cannot be empty';
    if (fs.existsSync(path.join(rootPath, input))) return 'Already exists';
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
    function selectWebsite(searchTerm) {
        return new Promise((resolve, reject) => {
            const websites = readdirSync_f(rootPath);
            if (searchTerm) {
                const matchedWebsites = fuzzy.filter(searchTerm, websites);
                if (matchedWebsites.length !== 1) return reject("No specific match found @website.");
                selectedWebsite = matchedWebsites[0].original;
                return resolve(selectedWebsite);
            }
            inqPrompt({
                message: 'Select a website',
                source: generateAutocompleteSource(websites, [PromptConstants.WEBSITE, PromptConstants.TEMPLATE, PromptConstants.EXIT], Separator),
            }).then((answeredWebsite) => {
                if (answeredWebsite === PromptConstants.EXIT) return reject();
                if (answeredWebsite === PromptConstants.TEMPLATE) return reject(createTemplate());
                if (answeredWebsite !== PromptConstants.WEBSITE) return resolve(selectedWebsite = answeredWebsite);
                inq.prompt([{ type: 'input', message: 'Enter website name:', name: 'website', validate: pathValidator }]).then((answers) => {
                    selectedWebsite = answers.website.replace(/[^a-zA-Z\d]/gi, '-');
                    fs.mkdirSync(path.join(rootPath, selectedWebsite));
                    return resolve(selectedWebsite);
                }).catch(reject);
            }).catch(reject);
        });
    }

    function selectCampaign(searchTerm) {
        return new Promise((resolve, reject) => {
            const campaigns = readdirSync_f(path.join(rootPath, selectedWebsite));
            if (searchTerm) {
                const matchedCampaigns = fuzzy.filter(searchTerm, campaigns);
                if (matchedCampaigns.length !== 1) return reject("No specific match found @campaign.");
                selectedCampaign = matchedCampaigns[0].original;
                return resolve(selectedCampaign);
            }
            inqPrompt({
                message: "Select a campaign",
                source: generateAutocompleteSource(campaigns, [PromptConstants.CAMPAIGN, PromptConstants.BACK, PromptConstants.EXIT], Separator),
            }).then((answeredCampaign) => {
                if (answeredCampaign === PromptConstants.EXIT) return reject();
                if (answeredCampaign === PromptConstants.BACK) return reject(selectWebsite().then(selectCampaign).then(selectVariation).then(selectVariationNow).catch(catch$));
                if (answeredCampaign !== PromptConstants.CAMPAIGN) return resolve(selectedCampaign = answeredCampaign);
                inq.prompt([{ type: 'input', message: 'Enter campaign name:', name: 'campaign', validate: pathValidator }]).then((answers) => {
                    selectedCampaign = answers.campaign.replace(/[^a-zA-Z\d]/gi, '-');
                    fs.mkdirSync(path.join(rootPath, selectedWebsite, selectedCampaign));
                    return resolve(selectedCampaign);
                }).catch(reject);
            }).catch(reject);
        });
    }

    function selectVariation(searchTerm) {
        return new Promise((resolve, reject) => {
            const variations = readdirSync_f(path.join(rootPath, selectedWebsite, selectedCampaign));
            if (searchTerm) {
                const matchedVariations = fuzzy.filter(searchTerm, variations);
                if (matchedVariations.length !== 1) return reject("No specific match found @variation.");
                selectedVariation = matchedVariations[0].original;
                return resolve(selectedVariation);
            }
            inqPrompt({
                message: "Select a variation",
                source: generateAutocompleteSource(variations, [PromptConstants.VARIATION, PromptConstants.BACK, PromptConstants.EXIT], Separator),
            }).then((answeredVariation) => {
                if (answeredVariation === PromptConstants.EXIT) return reject();
                if (answeredVariation === PromptConstants.BACK) return resolve(selectCampaign().then(selectVariation).then(selectVariationNow).catch(catch$));
                if (answeredVariation !== PromptConstants.VARIATION) return resolve(selectedVariation = answeredVariation);
                inq.prompt([{ type: 'input', message: 'Enter variation name:', name: 'variation', validate: pathValidator }]).then((answers) => {
                    selectedVariation = answers.variation.replace(/[^a-zA-Z\d]/gi, '-');
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
                            fs.cpSync(templatePath, variationPath, { recursive: true });
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
        inq.prompt([{ type: 'input', message: 'Enter template name:', name: 'template', validate: pathValidator }]).then((answers) => {
            const templatePath = path.join(templatesPath, answers.template.replace(/[^a-zA-Z\d]/gi, '-'));
            fs.mkdirSync(templatePath);
            fs.createWriteStream(path.join(templatePath, 'index.js')).end();
            fs.createWriteStream(path.join(templatePath, 'style.scss')).end();
        }).catch((e) => console.trace(e));
    }

    function catch$(e) { return true; }

    const directToCampaign = process.argv[2] === 'campaign';
    const directToVariation = process.argv[2] === 'variation';
    const jumpToVariation = process.argv[2] && process.argv[2].startsWith('q-');
    if (jumpToVariation) {
        const [w, c, v] = process.argv[2].replace(/^(q-)/gi, "").split('+');
        if (!w || !c || !v) return console.log("Please try proving whole path!");
        console.log(`Jumping to variation @query?w=${w}&c=${c}&v=${v}`);
        return selectWebsite(w).then(selectCampaign.bind(null, c))
            .then(selectVariation.bind(null, v)).then(selectVariationNow)
            .catch(e => console.log(e));
    }
    if (!directToCampaign && !directToVariation) return selectWebsite().then(selectCampaign).then(selectVariation).then(selectVariationNow).catch(catch$);
    const activeVariation = getActiveVariation();
    if (!activeVariation) return console.log('No active variation found! Try `npm run select` first.');
    selectedWebsite = activeVariation.website;
    if (directToCampaign) return selectCampaign().then(selectVariation).then(selectVariationNow).catch(catch$);
    selectedCampaign = activeVariation.campaign;
    if (directToVariation) return selectVariation().then(selectVariationNow).catch(catch$);
})();