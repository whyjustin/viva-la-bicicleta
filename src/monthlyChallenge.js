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

const buildMoveDistanceParticipantMessage = (p) =>
  `${p.name} ${Math.round((p.bikeDistance + p.runDistance * 3) / 100) / 10} km`;

module.exports.message = function () {
  let message = '';
  let allParticipants = participants.getAll();

  message += buildMessage(
    (p) =>
      p.bikeDistance + p.runDistance * 3 > 0 &&
      p.bikeDistance + p.runDistance * 3 < 400 * 1000,
    (p) => p.bikeDistance + p.runDistance * 3,
    'Keep that heart rate up. October Distance Challenge',
    buildMoveDistanceParticipantMessage,
    allParticipants
  );

  message += buildMessage(
    (p) => p.bikeDistance + p.runDistance * 3 >= 400 * 1000,
    (p) => p.bikeDistance + p.runDistance * 3,
    ':trophy: Congrats to the 400 km club!',
    buildMoveDistanceParticipantMessage,
    allParticipants
  );

  return message;
};
