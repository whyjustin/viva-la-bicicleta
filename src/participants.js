let participants = [];

module.exports.calculate = function (record) {
  const name = `${record.firstname} ${record.lastname}`;
  let participant;
  if (!exists(name)) {
    participant = create(name);
  } else {
    participant = this.get(name);
  }

  if (record.type === 'Ride' || record.type === 'VirtualRide') {
    participant.bikeDistance += record.distance;
    participant.bikeAltitude += record.total_elevation_gain;
  } else if (record.type === 'Run' || record.type === 'VirtualRun') {
    participant.runDistance += record.distance;
    participant.runAltitude += record.total_elevation_gain;
  } else if (record.type === 'Hike') {
    participant.hikeAltitude += record.total_elevation_gain;
  } else if (record.type === 'Row') {
    participant.rowDistance += record.distance;
  }
  participant.moveTime += record.moving_time;

  participants[name] = participant;
};

module.exports.getAll = function () {
  return participants;
};

module.exports.getCount = function () {
  return Object.keys(participants).length;
};

function create(name) {
  participant = {
    name: name,
    bikeDistance: 0,
    bikeAltitude: 0,
    runDistance: 0,
    runAltitude: 0,
    hikeAltitude: 0,
    rowDistance: 0,
    moveTime: 0,
  };
  return participant;
}

function add(participant) {
  participants[participant.name] = participant;
}

function exists(name) {
  return participants.hasOwnProperty(name);
}

module.exports.get = function (name) {
  return participants[name];
};
