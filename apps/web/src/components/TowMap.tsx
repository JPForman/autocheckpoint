import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import iconUrl from 'leaflet/dist/images/marker-icon.png';
import iconRetinaUrl from 'leaflet/dist/images/marker-icon-2x.png';
import shadowUrl from 'leaflet/dist/images/marker-shadow.png';
import { useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMapEvents, useMap } from 'react-leaflet';

delete (L.Icon.Default.prototype as unknown as Record<string, unknown>)._getIconUrl;
L.Icon.Default.mergeOptions({ iconUrl, iconRetinaUrl, shadowUrl });

const greenIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-green.png',
  shadowUrl,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

const redIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png',
  shadowUrl,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

const orangeIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-orange.png',
  shadowUrl,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

type EditProps = {
  mode: 'edit';
  pickupLat: number | null;
  pickupLng: number | null;
  destinationLat: number | null;
  destinationLng: number | null;
  currentLat?: number | null;
  currentLng?: number | null;
  pinTarget: 'pickup' | 'destination' | 'current';
  onPickupSet: (lat: number, lng: number) => void;
  onDestinationSet: (lat: number, lng: number) => void;
  onCurrentSet: (lat: number, lng: number) => void;
};

type ViewProps = {
  mode: 'view';
  pickupLat: number;
  pickupLng: number;
  pickupLabel: string | null;
  destinationLat: number;
  destinationLng: number;
  destinationLabel: string | null;
  currentLat: number | null;
  currentLng: number | null;
  currentUpdatedAt: string | null;
};

type TowMapProps = EditProps | ViewProps;

function ClickHandler({ pinTarget, onPickupSet, onDestinationSet, onCurrentSet }: {
  pinTarget: 'pickup' | 'destination' | 'current';
  onPickupSet: (lat: number, lng: number) => void;
  onDestinationSet: (lat: number, lng: number) => void;
  onCurrentSet: (lat: number, lng: number) => void;
}) {
  useMapEvents({
    click(e) {
      const { lat, lng } = e.latlng;
      if (pinTarget === 'pickup') onPickupSet(lat, lng);
      else if (pinTarget === 'destination') onDestinationSet(lat, lng);
      else onCurrentSet(lat, lng);
    },
  });
  return null;
}

function BoundsFitter({ coords }: { coords: [number, number][] }) {
  const map = useMap();
  useEffect(() => {
    if (coords.length === 0) return;
    if (coords.length === 1) {
      map.setView(coords[0], 14);
      return;
    }
    map.fitBounds(L.latLngBounds(coords), { padding: [40, 40] });
  }, [map, coords]);
  return null;
}

export function TowMap(props: TowMapProps) {
  const defaultCenter: [number, number] = [39.8283, -98.5795]; // US center
  const defaultZoom = 4;

  if (props.mode === 'edit') {
    const { pickupLat, pickupLng, destinationLat, destinationLng, currentLat, currentLng, pinTarget, onPickupSet, onDestinationSet, onCurrentSet } = props;

    const fitCoords: [number, number][] = [];
    if (pickupLat != null && pickupLng != null) fitCoords.push([pickupLat, pickupLng]);
    if (destinationLat != null && destinationLng != null) fitCoords.push([destinationLat, destinationLng]);
    if (currentLat != null && currentLng != null) fitCoords.push([currentLat, currentLng]);

    const cursorClass = 'cursor-crosshair';

    return (
      <MapContainer
        center={defaultCenter}
        zoom={defaultZoom}
        className={`h-72 w-full rounded-lg ${cursorClass}`}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <ClickHandler
          pinTarget={pinTarget}
          onPickupSet={onPickupSet}
          onDestinationSet={onDestinationSet}
          onCurrentSet={onCurrentSet}
        />
        <BoundsFitter coords={fitCoords} />
        {pickupLat != null && pickupLng != null && (
          <Marker position={[pickupLat, pickupLng]} icon={greenIcon}>
            <Popup>Pickup</Popup>
          </Marker>
        )}
        {destinationLat != null && destinationLng != null && (
          <Marker position={[destinationLat, destinationLng]} icon={redIcon}>
            <Popup>Destination</Popup>
          </Marker>
        )}
        {currentLat != null && currentLng != null && (
          <Marker position={[currentLat, currentLng]} icon={orangeIcon}>
            <Popup>Current location</Popup>
          </Marker>
        )}
      </MapContainer>
    );
  }

  // view mode
  const { pickupLat, pickupLng, destinationLat, destinationLng, currentLat, currentLng, currentUpdatedAt } = props;

  const fitCoords: [number, number][] = [[pickupLat, pickupLng], [destinationLat, destinationLng]];
  if (currentLat != null && currentLng != null) fitCoords.push([currentLat, currentLng]);

  const polylinePoints: [number, number][] = [[pickupLat, pickupLng]];
  if (currentLat != null && currentLng != null) polylinePoints.push([currentLat, currentLng]);
  polylinePoints.push([destinationLat, destinationLng]);

  const formattedUpdate = currentUpdatedAt
    ? new Date(currentUpdatedAt).toLocaleString()
    : null;

  return (
    <MapContainer
      center={defaultCenter}
      zoom={defaultZoom}
      className="h-full w-full rounded-lg"
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <BoundsFitter coords={fitCoords} />
      <Marker position={[pickupLat, pickupLng]} icon={greenIcon}>
        <Popup>Pickup{props.pickupLabel ? `: ${props.pickupLabel}` : ''}</Popup>
      </Marker>
      <Marker position={[destinationLat, destinationLng]} icon={redIcon}>
        <Popup>Destination{props.destinationLabel ? `: ${props.destinationLabel}` : ''}</Popup>
      </Marker>
      {currentLat != null && currentLng != null && (
        <Marker position={[currentLat, currentLng]} icon={orangeIcon}>
          <Popup>
            Current location
            {formattedUpdate ? <><br />Last updated: {formattedUpdate}</> : ''}
          </Popup>
        </Marker>
      )}
      <Polyline
        positions={polylinePoints}
        pathOptions={{ color: '#94a3b8', weight: 2, dashArray: '6 4' }}
      />
    </MapContainer>
  );
}
