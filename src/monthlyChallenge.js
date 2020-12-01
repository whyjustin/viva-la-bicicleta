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
  `${p.name} ${Math.round(p.moveTime / 60 * p.activities)}`;

module.exports.message = function () {
  let message = '';
  let allParticipants = participants.getAll();

  message += buildMessage(
    (p) => true,
    (p) => p.moveTime / 60 * p.activities,
    ':confused_dog: what this stat is? Ask @timlevett.',
    buildMoveDistanceParticipantMessage,
    allParticipants
  );

  return message;
};
