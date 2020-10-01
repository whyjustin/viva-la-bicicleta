const participants = require('./participants');

module.exports.totals = {
  bikeDistance: 0,
  bikeAltitude: 0,
  runDistance: 0,
  runAltitude: 0,
};

module.exports.calculate = function (record) {
  participant = participants.get(record.name);

  if (record.type === 'Ride' || record.type === 'VirtualRide') {
    this.totals.bikeDistance += record.distance;
    this.totals.bikeAltitude += record.total_elevation_gain;
  } else if (record.type === 'Run' || record.type === 'VirtualRun') {
    this.totals.runDistance += record.distance;
    this.totals.runAltitude += record.total_elevation_gain;
  }
};

module.exports.message = function (participants) {
  return `This month ${participants} Sonatypers have
  biked ${Math.round(this.totals.bikeDistance / 1000)} kilometers
  biked up ${Math.round(this.totals.bikeAltitude / 1000)} kilometers
  ran ${Math.round(this.totals.runDistance / 1000)} kilometers
  ran up ${Math.round(this.totals.runAltitude / 1000)} kilometers`;
};
