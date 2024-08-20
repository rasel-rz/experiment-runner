const fs = require('fs');
module.exports = function readdirSync_f(directory) {
    return fs.readdirSync(directory, { withFileTypes: true })
        .filter(dirent => dirent.isDirectory())
        .map(dirent => dirent.name);
}