const EARTH_RADIUS_KM = 6371;

export type Coordinates = {
  latitude: number;
  longitude: number;
};

export function distanceInKilometres(from: Coordinates, to: Coordinates) {
  const toRadians = (degrees: number) => (degrees * Math.PI) / 180;
  const latitudeDelta = toRadians(to.latitude - from.latitude);
  const longitudeDelta = toRadians(to.longitude - from.longitude);
  const latitudeOne = toRadians(from.latitude);
  const latitudeTwo = toRadians(to.latitude);

  const value =
    Math.sin(latitudeDelta / 2) ** 2 +
    Math.cos(latitudeOne) * Math.cos(latitudeTwo) * Math.sin(longitudeDelta / 2) ** 2;

  return EARTH_RADIUS_KM * 2 * Math.atan2(Math.sqrt(value), Math.sqrt(1 - value));
}
