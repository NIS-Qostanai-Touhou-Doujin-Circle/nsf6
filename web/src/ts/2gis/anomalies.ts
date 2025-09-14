import type * as gis from "@2gis/mapgl/types/index";
import { Anomaly } from "../api/anomalies";

const polylineRemoveCallbacks: (() => void)[] = [];

export function killAnomalies() {
	polylineRemoveCallbacks.forEach((cb) => cb());
	polylineRemoveCallbacks.length = 0;
}

export default function renderAnomalies(mapgl: typeof gis, map: gis.Map, anomalies: Anomaly[]) {
    killAnomalies();

	anomalies.forEach((anomaly) => {
		const polyline = new mapgl.Polyline(map, {
			coordinates: anomaly.points.map((p) => [p.lng, p.lat]),
		});
		polylineRemoveCallbacks.push(() => polyline.destroy());
	});
}
