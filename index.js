const history = require('./src/history');
const monthlyTotal = require('./src/monthlyTotal');
const yearTotal = require('./src/yearTotal');
const totals = require('./src/totals');
const monthlyChallenge = require('./src/monthlyChallenge');
const participants = require('./src/participants');

const open = require('open');
const strava = require('./src/strava');
const slack = require('./src/slack');

async function doWork() {
  try {
    const activities = await strava.listActivities();

    const historyAsJson = history.readAsJson();

    const newActivities = activities.filter((activity) => {
      return !Object.keys(historyAsJson).some((day) => {
        return historyAsJson[day].some((record) => {
          return (
            activity.athlete.firstname == record.firstname &&
            activity.athlete.lastname == record.lastname &&
            activity.distance == record.distance &&
            activity.elapsed_time == record.elapsed_time &&
            activity.moving_time == record.moving_time &&
            activity.name == record.name &&
            activity.total_elevation_gain == record.total_elevation_gain &&
            activity.type == record.type &&
            activity.workout_type == record.workout_type
          );
        });
      });
    });

    const todayDate = new Date();
    const today = todayDate.toISOString().split('T')[0];
    if (!historyAsJson[today]) {
      historyAsJson[today] = [];
    }

    newActivities.forEach((activity) => {
      historyAsJson[today].push({
        firstname: activity.athlete.firstname,
        lastname: activity.athlete.lastname,
        distance: activity.distance,
        elapsed_time: activity.elapsed_time,
        moving_time: activity.moving_time,
        name: activity.name,
        total_elevation_gain: activity.total_elevation_gain,
        type: activity.type,
        workout_type: activity.workout_type,
      });
    });

    history.update(historyAsJson);

    await reportProgress(historyAsJson, newActivities);
  } catch (err) {
    if (err.statusCode == 401) {
      await refreshStravaToken();
      await getStravaStats();
    }
    console.log(err);
  }
}

async function reportProgress(historyAsJson, newActivities) {
  let todayDate = new Date();
  let todayMonth = todayDate.getMonth();
  let participantList = {};
  for (let day in historyAsJson) {
    if (historyAsJson.hasOwnProperty(day)) {
      historyAsJson[day].forEach((record) => {
        if (record.skip) {
          return;
        }

        let date = new Date(day.replace(/(\d{4})-(\d{2})-(\d{2})/, '$2/$3/$1'));
        if (date.getMonth() === todayMonth) {
          let name = `${record.firstname} ${record.lastname}`;
          let participant = participantList[name] = participantList[name] || [];
          let week = getWeekNumber(date);
          participant[week] = participant[week] || 0;
          participant[week]++;
          participants.calculate(record);
          monthlyTotal.calculate(record);
        }
        yearTotal.update(record);
      });
    }
  }

  let participantListTwo = [];
  for (const [key, value] of Object.entries(participantList)) {
    let max = 0;
    value.forEach(activities => {
      max = Math.max(max, activities);
    })
    participantListTwo.push({
      name: key,
      activities: max
    });
  }
  participantListTwo = participantListTwo.sort((a, b) => {
    return b.activities - a.activities;
  });
  let message = `Make December Count! Maximize your activites per week.
`;
  for (const [key, value] of Object.entries(participantListTwo)) {
    message += `${value.name} ${value.activities} activities
`;
  }

  let monthlyChallengeMessage = message; //monthlyChallenge.message();
  let totalsMessage = totals.message();

  await slack.send(monthlyChallengeMessage, totalsMessage);
}

function getWeekNumber(d) {
  var dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  var yearStart = new Date(Date.UTC(d.getUTCFullYear(),0,1));
  return Math.ceil((((d - yearStart) / 86400000) + 1)/7)
};

async function main() {
  await history.setup();
  await strava.refreshStravaToken();
  await doWork();
}

main();
