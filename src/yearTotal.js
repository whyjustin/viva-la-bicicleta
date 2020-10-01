let totals = {
  distance: 0,
  altitude: 0,
};

module.exports.message = function () {
  return `
This year Sonatypers have traveled ${Math.round(
    totals.distance / 1000
  )} kilometers or ${Math.round(
    totals.distance / 10 / 40075
  )}% around the earth!
This year Sonatypers have climbed ${Math.round(
    totals.altitude / 1000
  )} kilometers or ${Math.round(
    totals.altitude / 8848
  )} times up Mount Everest!`;
};

module.exports.update = function (record) {
  totals.distance += record.distance;
  totals.altitude += record.total_elevation_gain;
};
