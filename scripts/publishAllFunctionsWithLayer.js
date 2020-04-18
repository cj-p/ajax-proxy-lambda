const chalk = require('chalk');
const path = require('path');
const fs = require('fs');
const publishLayer = require('./publishLayer');
const publishFunction = require('./publishFunction');

(async () => {
    const targetPath = process.argv.slice(2).find(arg => !arg.startsWith('-'));
    const functionRootPath = path.resolve(targetPath);
    const readdirSync = fs.readdirSync(functionRootPath, {withFileTypes: true});
    const functionPaths = readdirSync
        .filter(entry => entry.isDirectory())
        .map(entry => path.resolve(functionRootPath, entry.name))
        .filter(functionPath => fs.existsSync(path.resolve(functionPath, 'lambda.json')))

    console.log(chalk.green.underline('\nPublishing Layer'));

    const {LayerVersionArn} = await publishLayer();

    console.log(chalk.green.underline('\nPublishing Functions'));

    for (const functionPath of functionPaths) {
        try {
            await publishFunction(functionPath, {
                Layers: [LayerVersionArn]
            })
        }catch (e) {
            console.error(e)
        }
    }
})();


