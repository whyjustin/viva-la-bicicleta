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
  'adam d.': '@Adam de Delva',
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

  //let armShellsMessage = await armShells();
  let monthlyChallengeMessage = monthlyChallenge.message();
  //let fireShellsMessage = await fireShells();

  let mainMessage = monthlyChallengeMessage.main;
//   if (armShellsMessage) {
//     mainMessage += `

// ${armShellsMessage}`;
//   }
//   if (fireShellsMessage) {
//     mainMessage += `

// ${fireShellsMessage}`;
//   }

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
  const blueOrStar = getWeekNumber(todayDate)[1] % 2 === 1 ? 'b' : 's';
  shells[getDateString(todayDate)] = {
    'r': lifters[1],
    'rrr': lifters[2]
  }
  shells[getDateString(todayDate)][blueOrStar] = lifters[0];
  fileHelper.update(fileHelper.shells, shells)

  return `${getMentionName(lifters[0])} has received a ${blueOrStar === 'b' ? 'Blue Shell' : 'Star'}
${getMentionName(lifters[1])} has received a Red Shell
${getMentionName(lifters[2])} has received Three Red Shells

Shells will be fired on Friday, watch out!`;
}

async function fireShells() {
  const todayDate = new Date();
  if (todayDate.getDay() !== 5) {
    return;
  }
  const shellsJson = fileHelper.readAsJson(fileHelper.shells);
  const modifiers = fileHelper.readAsJson(fileHelper.modifiers);

  const fourDaysAgo = new Date();
  fourDaysAgo.setDate(todayDate.getDate() - 4)
  const shells = shellsJson[getDateString(fourDaysAgo)]
  if (!shells) {
    return;
  }

  let message = '';
  const liftersAndSquirrels = monthlyChallenge.getLiftersAndSquirrels();
  const sumModifiedElevation = monthlyChallenge.sumModifiedElevation;
  if (shells.b) {
    const lifters = liftersAndSquirrels.map.sort((a, b) => {
      return sumModifiedElevation(b) - sumModifiedElevation(a);
    });

    message += `${getMentionName(shells.b)} launched a Blue Shell and hit 
`;
    for (let i = 0; i <= 4; i++) {
      const lifter = lifters[i];
      lifterModifier = modifiers[lifter.name] || {
        elevation: 0,
        time: 0
      };

      let blueElevation = sumModifiedElevation(lifter) - sumModifiedElevation(lifters[5]);
      lifterModifier.elevation -= blueElevation;
      modifiers[lifter.name] = lifterModifier;
      message += `${getMentionName(lifter.name)} ${Math.round(blueElevation/10)/100} km
`;
    };
    message += `
${getMentionName(shells.b)} launched a Blue Shell and hit 
`;

    const squirrels = liftersAndSquirrels.map.sort((a, b) => {
      return (b.moveTime + b.modifiedTime) - (a.moveTime + a.modifiedTime);
    }).filter(p => !liftersAndSquirrels.lifters.includes(p));

    for (let i = 0; i <= 4; i++) {
      const squirrel = squirrels[i];
      squirrelModifier = modifiers[squirrel.name] || {
        elevation: 0,
        time: 0
      };

      let blueTime = (squirrel.moveTime + squirrel.modifiedTime) - (squirrels[5].moveTime + squirrels[5].modifiedTime);
      squirrelModifier.time -= blueTime;
      modifiers[squirrel.name] = squirrelModifier;
      message += `${getMentionName(squirrel.name)} ${Math.round(blueTime / 60 / 6) / 10} hours
`;
    };
    message += `
`;
  }

  const orderedParticipants = liftersAndSquirrels.map.sort((a, b) => {
    return b.moveTime - a.moveTime;
  });
  let rIndex, rrrIndex, sIndex;
  for (let i = 0; i < orderedParticipants.length; i++) {
    if (orderedParticipants[i].name.toLowerCase() === shells.r.toLowerCase()) {
      rIndex = i;
    }
    if (orderedParticipants[i].name.toLowerCase() === shells.rrr.toLowerCase()) {
      rrrIndex = i;
    }
    if (shells.s) {
      if (orderedParticipants[i].name.toLowerCase() === shells.s.toLowerCase()) {
        sIndex = i;
      } 
    }
  }
  message += `${getMentionName(shells.r)} launched a Red Shell and hit 
`;
  if (rIndex > 0) {
    message += hitRedShell(rIndex, rIndex - 1, orderedParticipants, modifiers, sumModifiedElevation);
  }
  message += `
`;
  message += `${getMentionName(shells.rrr)} launched Three Red Shells and hit 
`;
  for (let i = 0; i < 3; i++) {
    if (rrrIndex - i > 0) {
      message += hitRedShell(rrrIndex, rrrIndex - i - 1, orderedParticipants, modifiers, sumModifiedElevation);
    }
  }

  if (shells.s) {
    message += `
${getMentionName(shells.s)} used their star and gained `;
    const target = orderedParticipants[sIndex];
    targetModifier = modifiers[target.name] || {
      elevation: 0,
      time: 0
    };
    let caughtIndex = Math.max(sIndex - 3, 0);
    let targetTime = (orderedParticipants[caughtIndex].moveTime + orderedParticipants[caughtIndex].modifiedTime) - (target.moveTime + target.modifiedTime);
    targetModifier.time += targetTime;
    let targetElevation = Math.max(sumModifiedElevation(orderedParticipants[caughtIndex]) - sumModifiedElevation(target), 0);
    targetModifier.elevation += targetElevation;
    modifiers[target.name] = targetModifier;
    message += `${Math.round(targetTime / 60 / 6) / 10} hours, ${Math.round(targetElevation/10)/100} km
`;
  }

  fileHelper.update(fileHelper.modifiers, modifiers);

  return message;
}

function hitRedShell(index, hitIndex, orderedParticipants, modifiers, sumModifiedElevation) {
  const target = orderedParticipants[hitIndex];
  targetModifier = modifiers[target.name] || {
    elevation: 0,
    time: 0
  };

  let targetTime = target.moveTime - orderedParticipants[index].moveTime;
  targetModifier.time -= targetTime;
  let targetElevation = Math.max(sumModifiedElevation(target) - sumModifiedElevation(orderedParticipants[index]), 0);
  targetModifier.elevation -= targetElevation;
  modifiers[target.name] = targetModifier;
  return `${getMentionName(target.name)} ${Math.round(targetTime / 60 / 6) / 10} hours, ${Math.round(targetElevation/10)/100} km
`;
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

/* For a given date, get the ISO week number
 *
 * Based on information at:
 *
 *    http://www.merlyn.demon.co.uk/weekcalc.htm#WNR
 *
 * Algorithm is to find nearest thursday, it's year
 * is the year of the week number. Then get weeks
 * between that date and the first day of that year.
 *
 * Note that dates in one year can be weeks of previous
 * or next year, overlap is up to 3 days.
 *
 * e.g. 2014/12/29 is Monday in week  1 of 2015
 *      2012/1/1   is Sunday in week 52 of 2011
 */
function getWeekNumber(d) {
  // Copy date so don't modify original
  d = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  // Set to nearest Thursday: current date + 4 - current day number
  // Make Sunday's day number 7
  d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay()||7));
  // Get first day of year
  var yearStart = new Date(Date.UTC(d.getUTCFullYear(),0,1));
  // Calculate full weeks to nearest Thursday
  var weekNo = Math.ceil(( ( (d - yearStart) / 86400000) + 1)/7);
  // Return array of year and week number
  return [d.getUTCFullYear(), weekNo];
}

async function main() {
  await fileHelper.setup(fileHelper.history);
  await fileHelper.setup(fileHelper.shells);
  await fileHelper.setup(fileHelper.modifiers);
  await strava.refreshStravaToken();
  await doWork();
}

main();
