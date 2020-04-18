const chalk = require('chalk')
const md5File = require('md5-file')
const fs = require('fs');
const path = require('path');
const {zip} = require('zip-a-folder');
const util = require('util');
const prettyBytes = require('pretty-bytes');
const {packageJson, packageJsonPath} = require("./awsConfig");
const {getProcessArgObject} = require("./util");
const execFile = util.promisify(require('child_process').execFile);
const {AWS} = require('./awsConfig')

const buildLayer = async dest => {
    const nodejsPath = path.resolve(dest, 'nodejs')
    console.log(chalk.white.bold(`\nbuilding layer...`));
    fs.mkdirSync(nodejsPath, {recursive: true})
    fs.copyFileSync(path.resolve('package.json'), path.resolve(nodejsPath, 'package.json'))
    fs.copyFileSync(path.resolve('package-lock.json'), path.resolve(nodejsPath, 'package-lock.json'))
    try {
        await execFile('npm', ['i', '--only=production', '--prefix', nodejsPath]);
    } catch (e) {
        throw e;
    }
};

const zipLayer = async (src, dest) => {
    console.log('creating zip archive');
    await zip(src, dest);
    console.log(`${dest} - ${prettyBytes(fs.statSync(dest).size)}`);
    return fs.readFileSync(dest);
};

const publishLayer = async ({
    layerName: LayerName,
    description: Description,
    license: LicenseInfo,
    zipFile: ZipFile,
    runtimes: CompatibleRuntimes = ["nodejs12.x"],
}) => {
    console.log(chalk.white.bold('\npublishing layer...'));
    return await new AWS.Lambda().publishLayerVersion({
        Content: {ZipFile},
        LayerName,
        CompatibleRuntimes,
        Description,
        LicenseInfo
    }).promise();
};

const clean = dest => {
    if (fs.existsSync(dest)) {
        fs.rmdirSync(dest, {recursive: true})
    }
};

const findSameVersion = async (LayerName, hash) => {
    const {LayerVersions} = await new AWS.Lambda().listLayerVersions({LayerName}).promise();
    return LayerVersions.find(layerVersion => {
        const match = layerVersion.Description.match(/\[hash:(.*?)]/);
        return match && match[1] === hash;
    });
};

const getZippedLayer = async (fileName, basePath) => {
    const buildPath = path.resolve(basePath, 'build');
    const layerPath = path.resolve(buildPath, 'layer');
    clean(layerPath);
    await buildLayer(layerPath)
    const zipFile = await zipLayer(layerPath, path.resolve(buildPath, `${fileName}.zip`));
    clean(layerPath);
    return zipFile;
};

const publishNodeModulesAsLayer = async ({name} = {}) => {
    const {
        name: packageName,
        license,
        dependencies,
    } = packageJson;

    const layerName = name || `${packageName}_node_modules`;
    const hash = md5File.sync(packageJsonPath);
    const description = `production dependencies in package '${packageName}' [hash:${hash}]`;
    const packageRootPath = path.resolve(packageJsonPath, '..');

    console.log(chalk.yellow.bold(`\n❏ ${layerName}`) + chalk.grey(` - ${description}`))
    console.log('including:');
    console.log(chalk.magenta(Object
        .keys(dependencies)
        .map(packageName => `∙ ${packageName}`)
        .join('\n')));

    const sameVersion = await findSameVersion(layerName, hash);
    if (sameVersion) {
        console.log(chalk.red('The same version is already published.'));
        return sameVersion
    }

    const zipFile = await getZippedLayer(`${layerName}.${hash}`, packageRootPath);
    const publishedLayer = await publishLayer({layerName, license, description, zipFile});
    console.log('done.');
    return publishedLayer

};

if (require.main === module) {
    publishNodeModulesAsLayer(getProcessArgObject()).then(console.log)
} else {
    module.exports = publishNodeModulesAsLayer
}
