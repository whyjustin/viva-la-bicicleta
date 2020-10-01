const fs = require('fs');
const path = require('path');

module.exports.setup = function () {
  return new Promise((resolve, reject) => {
    const historyFileName = path.resolve(__dirname, '../history.json');
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

module.exports.readAsJson = function () {
  const historyJson = fs.readFileSync(
    path.resolve(__dirname, '../history.json')
  );
  return JSON.parse(historyJson);
};

module.exports.update = function (json) {
  fs.writeFileSync(
    path.resolve(__dirname, '../history.json'),
    JSON.stringify(json, null, '\t')
  );
};
