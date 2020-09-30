const auth = require('./auth.json');

const open = require('open')
const strava = require('strava-v3');
const slack = require('slack')

const fs = require('fs');
const path = require('path');
const { promisify } = require('util')

const listActivities = promisify(strava.clubs.listActivities).bind(strava.clubs);

function setup() {
  return new Promise((resolve, reject) => {
    const historyFileName = path.resolve(__dirname, 'history.json');
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
    })
  });
}

function configStrava() {
  strava.config({
    'access_token': auth.strava.access_token,
    'client_id': auth.strava.client_id,
    'client_secret': auth.strava.client_secret
  });
}

async function getNewStravaToken() {
  return new Promise((resolve, reject) => {
    configStrava();
    const readline = require('readline');
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });
    console.log('Navigate to:');
    console.log(`http://www.strava.com/oauth/authorize?client_id=${auth.strava.client_id}&response_type=code&redirect_uri=http://localhost/exchange_token&approval_prompt=auto&scope=read,activity:read`)
    rl.question('Please enter the code:', code => {
      rl.close();
      strava.oauth.getToken(code, (err, payload) => {
        auth.strava.access_token = payload.body.access_token;
        auth.strava.refresh_token = payload.body.refresh_token;
        fs.writeFileSync(path.resolve(__dirname, 'auth.json'), JSON.stringify(auth, null, '\t'));
        resolve();
      });
    });
  });
}

async function refreshStravaToken() {
  if (!auth.strava.access_token || !auth.strava.refresh_token) {
    await getNewStravaToken();
    configStrava();
  }
  configStrava();
  try {
    const token = await strava.oauth.refreshToken(auth.strava.refresh_token);
    auth.strava.access_token = token.access_token;
    auth.strava.refresh_token = token.refresh_token;
    fs.writeFileSync(path.resolve(__dirname, 'auth.json'), JSON.stringify(auth, null, '\t'));
    configStrava();
  } catch (err) {
    console.log(err);
  }
}

async function doWork() {
  try {
    const activities = await listActivities({id: 322307, per_page: 100, page: 0, "access_token": auth.strava.access_token});
    const historyJson= fs.readFileSync(path.resolve(__dirname, 'history.json'));
    const history = JSON.parse(historyJson);

    const newActivities = activities.filter(activity => {
      return !Object.keys(history).some(day => {
        return history[day].some(record => {
          return activity.athlete.firstname == record.firstname &&
            activity.athlete.lastname == record.lastname &&
            activity.distance == record.distance &&
            activity.elapsed_time == record.elapsed_time &&
            activity.moving_time == record.moving_time &&
            activity.name == record.name &&
            activity.total_elevation_gain == record.total_elevation_gain &&
            activity.type == record.type &&
            activity.workout_type == record.workout_type;
        });
      });
    });

    const todayDate = new Date();
    const today = todayDate.toISOString().split('T')[0];
    if (!history[today]) {
      history[today] = [];
    }

    newActivities.forEach(activity => {
      history[today].push({
        firstname: activity.athlete.firstname,
        lastname: activity.athlete.lastname,
        distance: activity.distance,
        elapsed_time: activity.elapsed_time,
        moving_time: activity.moving_time,
        name: activity.name,
        total_elevation_gain: activity.total_elevation_gain,
        type: activity.type,
        workout_type: activity.workout_type
      });
    });

    fs.writeFileSync(path.resolve(__dirname, 'history.json'), JSON.stringify(history, null, '\t'));

    await reportProgress(history, newActivities)
  } catch (err) {
    if (err.statusCode == 401) {
      await refreshStravaToken();
      await getStravaStats();
    }
    console.log(err);
  }
}

async function reportProgress(history, newActivities) {
  let totalDistance = 0;
  let totalAltitude = 0;
  let bikeDistance = 0;
  let bikeAltitude = 0;
  let runDistance = 0;
  let runAltitude = 0;
  let participants = {};

  let todayDate = new Date();
  let todayMonth = todayDate.getMonth();
  for (let day in history) {
    if (history.hasOwnProperty(day)) {
      history[day].forEach(record => {
        if (record.skip) {
          return;
        }

        let date = new Date(day.replace(/(\d{4})-(\d{2})-(\d{2})/, "$2/$3/$1"))
        if (date.getMonth() === todayMonth) {
          const name = `${record.firstname} ${record.lastname}`;
          let participant = participants[name];
          if (!participant) {
            participants[name] = participant = {
              name: name,
              bikeDistance: 0,
              bikeAltitude: 0,
              runDistance: 0,
              runAltitude: 0,
              hikeAltitude: 0,
              moveTime: 0
            }
          }

          if (record.type === 'Ride' || record.type === 'VirtualRide') {
            participant.bikeDistance += record.distance;
            bikeDistance += record.distance;
            participant.bikeAltitude += record.total_elevation_gain;
            bikeAltitude += record.total_elevation_gain;
          } else if (record.type === 'Run') {
            participant.runDistance += record.distance;
            runDistance += record.distance;
            participant.runAltitude += record.total_elevation_gain;
            runAltitude += record.total_elevation_gain;
          } else if (record.type == 'Hike') {
            participant.hikeAltitude += record.total_elevation_gain;
          }
          participant.moveTime += record.moving_time;
        }
        totalDistance += record.distance;
        totalAltitude += record.total_elevation_gain;
      });
    }
  }

  let message = '';
  let threadMessage = '';

  const buildMessage = (filter, orderer, header, buildParticipantLine) => {
    let messagePart = '';
    const contest = Object.keys(participants).map(k => participants[k]).filter(filter).sort((a, b) => { return orderer(b) - orderer(a);});
    if (contest.length > 0) {
      messagePart += `${header}
`;
    contest.forEach(p => {
      messagePart += `${buildParticipantLine(p)}
`;
    });
    messagePart += `
`;
    }
    return messagePart;
  }

  const buildMoveDistanceParticipantMessage = p => `${p.name} ${Math.round((p.bikeDistance + p.runDistance * 3)/100)/10} km`;
  message += buildMessage(p => p.bikeDistance + p.runDistance * 3 > 0 && p.bikeDistance + p.runDistance * 3 < 400 * 1000,
    p => p.moveTime,
    'Keep that heart rate up. October Distance Challenge',
    buildMoveDistanceParticipantMessage
  );
  message += buildMessage(p => p.bikeDistance + p.runDistance * 3 >= 400 * 1000,
    p => p.moveTime,
    ':trophy: Congrats to the 400 km club!',
    buildMoveDistanceParticipantMessage
  );

  threadMessage += `This month ${Object.keys(participants).length} Sonatypers have
  biked ${Math.round(bikeDistance/1000)} kilometers
  biked up ${Math.round(bikeAltitude/1000)} kilometers
  ran ${Math.round(runDistance/1000)} kilometers
  ran up ${Math.round(runAltitude/1000)} kilometers

This year Sonatypers have traveled ${Math.round(totalDistance/1000)} kilometers or ${Math.round(totalDistance/10/40075)}% around the earth!
This year Sonatypers have climbed ${Math.round(totalAltitude/1000)} kilometers or ${Math.round(totalAltitude/8848)} times up Mount Everest!`

  // const slackBot = new slack(auth.slack.token);
  // await slackBot.conversations.join({
  //   token: auth.slack.token,
  //   channel: 'CCACNN4N8'
  // });
  // const messagesResponse = await slackBot.chat.postMessage({
  //   token: auth.slack.token,
  //   channel: 'CCACNN4N8',
  //   text: message
  // });
  // if (threadMessage) {
  //   await slackBot.chat.postMessage({
  //     token: auth.slack.token,
  //     channel: 'CCACNN4N8',
  //     thread_ts: messagesResponse.ts,
  //     text: threadMessage
  //   });
  // }
  console.log(message);
  console.log(threadMessage);
}

async function main() {
  await setup();
  await refreshStravaToken();
  await doWork();
}

main();