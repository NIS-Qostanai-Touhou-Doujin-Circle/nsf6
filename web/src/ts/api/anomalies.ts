import { MapPoint } from "../types/common";

export type AnomalyRequest = {
    lat1: number;
    lng1: number;
    lat2: number;
    lng2: number;
    dateStart?: string; // ISO format datetime string
    dateEnd?: string;   // ISO format datetime string
}

export type AnomalyPoint = {
    timestamp: Date;
} & MapPoint;

export type Anomaly = {
    randomized_id: string;
    points: AnomalyPoint[];
}

export type AnomalyResponse = {
    anomalies: Anomaly[];
}

export default async function getAnomalies(
    req: AnomalyRequest
): Promise<AnomalyResponse | { error: string }> {
    const params = new URLSearchParams();
    params.set("lat1", req.lat1.toString());
    params.set("lng1", req.lng1.toString());
    params.set("lat2", req.lat2.toString());
    params.set("lng2", req.lng2.toString());
    if (req.dateStart) {
        params.set("dateStart", req.dateStart);
    }
    if (req.dateEnd) {
        params.set("dateEnd", req.dateEnd);
    }

    const response = await fetch(`/api/anomalies?` + params.toString(), {
        method: "GET",
    });
    if (!response.ok) {
        return { error: "Failed to fetch anomalies" };
    }
    const data = await response.json();
    return data as AnomalyResponse;
}

export function makeRequest(
    topLeft: MapPoint,
    bottomRight: MapPoint,
    dateStart?: Date,
    dateEnd?: Date
): AnomalyRequest {
    // Make sure topLeft and bottomRight are correctly oriented
    if (topLeft.lat < bottomRight.lat) {
        [topLeft.lat, bottomRight.lat] = [bottomRight.lat, topLeft.lat];
    }
    if (topLeft.lng > bottomRight.lng) {
        [topLeft.lng, bottomRight.lng] = [bottomRight.lng, topLeft.lng];
    }

    return {
        lat1: topLeft.lat,
        lng1: topLeft.lng,
        lat2: bottomRight.lat,
        lng2: bottomRight.lng,
        dateStart: dateStart?.toISOString(),
        dateEnd: dateEnd?.toISOString(),
    };
}