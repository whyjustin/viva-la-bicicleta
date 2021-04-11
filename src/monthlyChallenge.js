const participants = require('./participants');

const buildMessage = (
  filter,
  orderer,
  header,
  buildParticipantLine,
  participants
) => {
  let messagePart = '';
  const contest = Object.keys(participants)
    .map((k) => participants[k])
    .filter(filter)
    .sort((a, b) => {
      return orderer(b) - orderer(a);
    });
  if (contest.length > 0) {
    messagePart += `${header}
`;
    contest.forEach((p) => {
      messagePart += `${buildParticipantLine(p)}
`;
    });
    messagePart += `
`;
  }
  return messagePart;
};

const sumElevation = p => p.bikeAltitude + p.runAltitude + p.hikeAltitude;

function getLiftersAndSquirrels() {
  let allParticipants = participants.getAll();

  const map = Object.keys(allParticipants)
  .map((k) => allParticipants[k]);

  const lifters = map
  .sort((a, b) => {
    return sumElevation(b) - sumElevation(a);
  }).slice(0, 5);

  const squirrels = map
  .sort((a, b) => {
    return b.moveTime - a.moveTime;
  }).filter(p => !lifters.includes(p)).slice(0, 5);

  return {
    all: allParticipants,
    map: map,
    lifters: lifters,
    squirrels: squirrels
  };
}

module.exports.getLiftersAndSquirrels = getLiftersAndSquirrels;
module.exports.sumElevation = sumElevation;

// const buildMoveDistanceParticipantMessage = (p) =>
//   `${p.name} ${Math.round(p.moveTime / 60 / 6) / 10}`;

module.exports.message = function () {
  let message = `Weekly Lift Challenge Leaderboard

Top 5 Lifters
`;
  const liftersAndSquirrels = getLiftersAndSquirrels();
  
  liftersAndSquirrels.lifters.forEach(p => {
    message += `${p.name} ${Math.round(sumElevation(p)/10)/100} km
`
  });

  message += `
Top 5 Squirrels
`;

liftersAndSquirrels.squirrels.forEach(p => {
    message += `${p.name} ${Math.round(p.moveTime / 60 / 6) / 10} hours
`
  });

  let threadMessage = `Lift Challenge Participants
  
`;

  Object.keys(liftersAndSquirrels.all)
  .map((k) => liftersAndSquirrels.all[k])
  .sort((a, b) => {
    return b.moveTime - a.moveTime;
  })
  .forEach(p => {
    threadMessage += `${p.name} ${Math.round(sumElevation(p)/10)/100} km ${Math.round(p.moveTime / 60 / 6) / 10} hours
`
  });
  // message += buildMessage(
  //   (p) => Math.round(p.moveTime / 60 / 6) / 10 >= 100,
  //   (p) => p.moveTime,
  //   `Century Club!`,
  //   buildMoveDistanceParticipantMessage,
  //   allParticipants
  // );


  // message += buildMessage(
  //   (p) => Math.round(p.moveTime / 60 / 6) / 10 >= 40 && Math.round(p.moveTime / 60 / 6) / 10 < 100,
  //   (p) => p.moveTime,
  //   `Exercised 40 hours`,
  //   buildMoveDistanceParticipantMessage,
  //   allParticipants
  // );

  // message += buildMessage(
  //   (p) => Math.round(p.moveTime / 60 / 6) / 10 >= 24 && Math.round(p.moveTime / 60 / 6) / 10 < 40,
  //   (p) => p.moveTime,
  //   `Exercised 24 hours`,
  //   buildMoveDistanceParticipantMessage,
  //   allParticipants
  // );

  // message += buildMessage(
  //   (p) => Math.round(p.moveTime / 60 / 6) / 10 >= 8 && Math.round(p.moveTime / 60 / 6) / 10 < 24,
  //   (p) => p.moveTime,
  //   `Exercised a full eight hour days worth`,
  //   buildMoveDistanceParticipantMessage,
  //   allParticipants
  // );

  // message += buildMessage(
  //   (p) => Math.round(p.moveTime / 60 / 6) / 10 < 8,
  //   (p) => p.moveTime,
  //   `Do you even lift bro?`,
  //   buildMoveDistanceParticipantMessage,
  //   allParticipants
  // );

  return {
    main: message,
    thread: threadMessage
  };
};
