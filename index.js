const fileHelper = require('./src/fileHelper');
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

    const historyAsJson = fileHelper.readAsJson(fileHelper.history);

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

    const today = getDateString(new Date());
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

    fileHelper.update(fileHelper.history, historyAsJson);

    await reportProgress(historyAsJson, newActivities);
  } catch (err) {
    if (err.statusCode == 401) {
      await refreshStravaToken();
      await getStravaStats();
    }
    console.log(err);
  }
}

const participantSkipList = [
  'shrikanth k.',
  'mark k.',
  'denison w.',
  'chuck j.',
  'manindra s.',
  'michel k.',
  'anthony b.'
];

const participantMap = {
  'paul v.': '@Paul Volkman',
  'steven o.': '@Steven Odorczyk',
  'frank t.': '@Frank Tingle',
  'steve p.': '@Steve Palacios',
  'irina t.': '@Irina Tishelman',
  'yizhao l.': '@Yizhao',
  'david d.': '@David Doughty',
  'adam d.': '@Adam De Delva',
  'j t.': '@Joe Tom',
  'juan a.': '@Juan Aguirre',
  'mikaela b.': '@Mikaela Berst',
  'mark d.': '@Mark Dodgson',
  'guillermo antonio v.': '@Guillermo',
  'ryan d.': '@Ryan',
  'jean-pierre l.': '@JP Levac',
  'mike o.': '@Mike Oliverio',
  'troy n.': '@tneeriemer',
  'zachary c.': '@Zack Conord',
  'oleksiy v.': '@ovoronin',
  'timothy n.': '@Tim Newton',
  'john f.': '@John Flinchbaugh',
  'adam r.': '@Adam Rogers',
  'chris c.': '@Chris Carlucci',
  'adrian p.': '@Adrian Powell',
  'jon w.': '@Jon West',
  'melanie s.': '@Melanie Sexton',
  'ashlee h.': '@Ashlee Hall',
  'daniel t.': '@Dan T',
  'babs m.': '@Babs',
  'matthew w.': '@Matt Wood (Legal)',
  'mike h.': '@Mike Hansen',
  'john k.': '@JohnKr',
  'tim l.': '@timlevett',
  'joseph s.': '@Joseph Stephens',
  'justin y.': '@Justin',
  'andrés p.': '@promiscu-tea',
  'daryl h.': '@Daryl Handley'
};

async function reportProgress(historyAsJson, newActivities) {
  const todayDate = new Date();
  const todayMonth = todayDate.getMonth();
  const todayYear = todayDate.getFullYear();
  for (let day in historyAsJson) {
    if (historyAsJson.hasOwnProperty(day)) {
      historyAsJson[day].forEach((record) => {
        if (record.skip) {
          return;
        }

        if (participantSkipList.includes(`${record.firstname} ${record.lastname}`.toLowerCase())) {
          return;
        }

        let date = new Date(day.replace(/(\d{4})-(\d{2})-(\d{2})/, '$2/$3/$1'));
        if (date.getFullYear() === todayYear) {
          if (date.getMonth() == 2 && date.getDate() >= 14 || date.getMonth() > 2) {
            participants.calculate(record);
            monthlyTotal.calculate(record);
          }
          yearTotal.update(record);
        }
      });
    }
  }

  let armShellsMessage = await armShells();
  let fireShellsMessage = await fireShells();

  let monthlyChallengeMessage = monthlyChallenge.message();

  let mainMessage = monthlyChallengeMessage.main;
  if (armShellsMessage) {
    mainMessage += `

${armShellsMessage}`;
  }
  if (fireShellsMessage) {
    mainMessage += `

${fireShellsMessage}`;
  }

  let totalsMessage = totals.message() + `

${monthlyChallengeMessage.thread}`;

  await slack.send(mainMessage, totalsMessage);
}

async function armShells() {
  const todayDate = new Date();
  if (todayDate.getDay() !== 1) {
    return;
  }

  const shells = fileHelper.readAsJson(fileHelper.shells);
  const allParticipants = participants.getAll();
  const lifters = Object.keys(allParticipants);
  shuffleArray(lifters);
  shells[getDateString(todayDate)] = {
    'b': lifters[0],
    'r': lifters[1],
    'rrr': lifters[2]
  }
  fileHelper.update(fileHelper.shells, shells)

  return `${getMentionName(lifters[0])} has received a Blue Shell
${getMentionName(lifters[1])} has received a Red Shell
${getMentionName(lifters[2])} has received Three Red Shells

Shells will be fired on Friday, watch out!`;
}

async function fireShells() {
  const todayDate = new Date();
  // if (todayDate.getDay() !== 5) {
  //   return;
  // }
  const shellsJson = fileHelper.readAsJson(fileHelper.shells);
  const modifiers = fileHelper.readAsJson(fileHelper.modifiers);

  const fourDaysAgo = new Date();
  fourDaysAgo.setDate(todayDate.getDate() - 4)
  const shells = shellsJson['2021-04-10']; //getDateString(fourDaysAgo)]
  if (!shells) {
    return;
  }

  const liftersAndSquirrels = monthlyChallenge.getLiftersAndSquirrels();
  const lifters = liftersAndSquirrels.lifters;
  const sumElevation = monthlyChallenge.sumElevation;
  const blueElevation = (sumElevation(lifters[0]) - sumElevation(lifters[4])) / 2;

  let message = `${getMentionName(shells.b)} launched a Blue Shell and hit `;
  lifters.forEach((lifter) => {
    lifterModifier = modifiers[lifter.name] || {
      elevation: 0,
      time: 0
    };
    lifterModifier.elevation -= blueElevation;
    modifiers[lifter.name] = lifterModifier;
    message += `${getMentionName(lifter.name)} `;
  });
  message += `sending them back ${Math.round(blueElevation/10)/100} km`

  fileHelper.update(fileHelper.modifiers, modifiers);

  return message;
}

//https://stackoverflow.com/questions/2450954/how-to-randomize-shuffle-a-javascript-array/18650169#18650169
function shuffleArray(array) {
  for (let i = array.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [array[i], array[j]] = [array[j], array[i]];
  }
}

function getDateString(todayDate) {
  return todayDate.toISOString().split('T')[0];
}

function getMentionName(name) {
  return participantMap[name.toLowerCase()] || name;
}

async function main() {
  await fileHelper.setup(fileHelper.history);
  await fileHelper.setup(fileHelper.shells);
  await fileHelper.setup(fileHelper.modifiers);
  await strava.refreshStravaToken();
  await doWork();
}

main();
