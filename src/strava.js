const auth = require('../auth.json');

const strava = require('strava-v3');
const { promisify } = require('util');

const fs = require('fs');
const path = require('path');

_listActivities = promisify(strava.clubs.listActivities.bind(strava.clubs));

module.exports.listActivities = function () {
  return _listActivities({
    id: 322307,
    per_page: 100,
    page: 0,
    access_token: auth.strava.access_token,
  });
};

function configStrava() {
  strava.config({
    access_token: auth.strava.access_token,
    client_id: auth.strava.client_id,
    client_secret: auth.strava.client_secret,
  });
}

async function getNewStravaToken() {
  return new Promise((resolve, reject) => {
    configStrava();
    const readline = require('readline');
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });
    console.log('Navigate to:');
    console.log(
      `http://www.strava.com/oauth/authorize?client_id=${auth.strava.client_id}&response_type=code&redirect_uri=http://localhost/exchange_token&approval_prompt=auto&scope=read,activity:read`
    );
    rl.question('Please enter the code:', (code) => {
      rl.close();
      strava.oauth.getToken(code, (err, payload) => {
        auth.strava.access_token = payload.body.access_token;
        auth.strava.refresh_token = payload.body.refresh_token;
        fs.writeFileSync(
          path.resolve(__dirname, '../auth.json'),
          JSON.stringify(auth, null, '\t')
        );
        resolve();
      });
    });
  });
}

module.exports.refreshStravaToken = async function () {
  if (!auth.strava.access_token || !auth.strava.refresh_token) {
    await getNewStravaToken();
    configStrava();
  }
  configStrava();
  try {
    const token = await strava.oauth.refreshToken(auth.strava.refresh_token);
    auth.strava.access_token = token.access_token;
    auth.strava.refresh_token = token.refresh_token;
    fs.writeFileSync(
      path.resolve(__dirname, '../auth.json'),
      JSON.stringify(auth, null, '\t')
    );
    configStrava();
  } catch (err) {
    console.log(err);
  }
};
