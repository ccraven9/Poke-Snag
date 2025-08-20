const fs = require("fs");
const { mkdir } = require("fs/promises");
const { Readable } = require('stream');
const { finished } = require('stream/promises');
const path = require("path");
const expansionNamesJson = require('./expansion-names.json');
const { CONSTANTS } = require('./constants');

let downloadPath = CONSTANTS.DEFAULT_DOWNLOAD_PATH;
let expansionName;

function main() {
    getArguments();
    if (expansionName) getAllImages();
}

/**
 * Makes HTTP request to card image, and saves image to download folder
 */
async function getImage(url, count, setId, expansionName) {
    const fetchUrl = `${url}${count}${CONSTANTS.PNG}`;
    try {
        const imageResponse = await fetch(fetchUrl);
        const dlPath = `./${downloadPath}/${expansionName}`
        const destination = path.resolve(dlPath, `${setId}${count}${CONSTANTS.PNG}`);
        const contentType = imageResponse.headers.get("content-type") || "";
        if (!contentType.startsWith("image/")) {
            throw new Error(`End image scrape: No more images to scrape`);
        }
        const fileStream = fs.createWriteStream(destination, { flags: 'wx' });
        await finished(Readable.fromWeb(imageResponse.body).pipe(fileStream));
        console.log(`Downloading image: ${setId}${count}${CONSTANTS.PNG} to ${dlPath}`)
    } catch (error) {
        throw error;
    }
}


/**
 * Gets command line flags
 */
function getArguments() {
    const args = process.argv.slice(2); // Remove 'node' and script path
    const flags = {};

    args.forEach((arg, index) => {
        if (arg.startsWith("--")) {
            const key = arg.substring(2);
            const value = args[index + 1] && !args[index + 1].startsWith("--") ? args[index + 1] : true;
            flags[key] = value;
        }
    });

    if (!flags.expansion) {
        console.error('No expansion defined in flags, indicate which expansion by using --expansion <expansion name>');
        return;
    }

    expansionName = flags.expansion;

    if (!flags.path) {
        console.info("Downloading to default download path: ./downloads")
        return;
    }

    downloadPath = path;
}


/**
 * Checks if download path already exsits, and starts the image scrape loop.
 */
async function getAllImages() {
    let expansion;

    try {
        expansion = getImageUrl(expansionName);
    } catch (e) {
        console.error(`${e.name}: ${e.message}`);
        return;
    }

    if (downloadPath === CONSTANTS.DEFAULT_DOWNLOAD_PATH) {
        if (fs.existsSync(`${downloadPath}/${expansionName}`)) {
            console.error(`Download path: ${downloadPath} already exists, please indicate a new download path with the --path flag`);
            return;
        }
        console.log('making download path')
        const path = `${downloadPath}/${expansionName}`
        await mkdir(path, { recursive: true });
    }

    let hasNext = true;
    let cardCounter = 0;

    while (hasNext) {
        try {
            await getImage(expansion.url, ++cardCounter, expansion.setId, expansion.name);
        } catch (e) {
            hasNext = false;
            console.error(e.message);
        }
    }
}


/**
 * Builds URL for HTTP Request.
 * @param {string} expansion 
 * @returns  String
 */
function getImageUrl(expansion) {
    const expansionNames = JSON.parse(JSON.stringify(expansionNamesJson));
    if (expansionNames[expansion]) {
        let expansionObj = {};
        expansionObj.url = `${CONSTANTS.TCG_URL}/${expansion}/${CONSTANTS.EN_US}/${expansionNames[expansion]}`;
        expansionObj.setId = expansionNames[expansion]
        expansionObj.name = expansion
        return expansionObj;
    }

    //If expansion isn't found within expansion-names.json, 
    throw new Error("The expansion name was not found.");
}

module.exports = { main }
