const fs = require('fs');
const path = require('path');

module.exports.history = 'history.json'
module.exports.shells = 'shells.json'
module.exports.modifiers = 'modifiers.json'

module.exports.setup = function (fileName) {
  return new Promise((resolve, reject) => {
    const historyFileName = path.resolve(__dirname, `../${fileName}`);
    fs.open(historyFileName, (err, file) => {
      if (err) {
        fs.writeFile(historyFileName, '{}', (err) => {
          if (err) {
            reject(err);
          }
          resolve();
        });
      }
      resolve();
    });
  });
};

module.exports.readAsJson = function (fileName) {
  const historyJson = fs.readFileSync(
    path.resolve(__dirname, `../${fileName}`)
  );
  return JSON.parse(historyJson);
};

module.exports.update = function (fileName, json) {
  fs.writeFileSync(
    path.resolve(__dirname, `../${fileName}`),
    JSON.stringify(json, null, '\t')
  );
};
