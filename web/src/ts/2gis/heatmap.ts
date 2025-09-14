import type * as gis from "@2gis/mapgl/types/index";
import { Heatmap } from "../types/heatmap";

const polygonRemoveCallbacks: (() => void)[] = [];

export function killHeatmap() {
	polygonRemoveCallbacks.forEach((cb) => cb());
	polygonRemoveCallbacks.length = 0;
}

/**
 * Render heatmap grid onto a given mapgl.Map instance.
 */
export function renderHeatmap(
	mapgl: typeof gis,
	map: gis.Map,
	heatmap: Heatmap,
	colorblind: boolean
) {
	killHeatmap();

	const maxCount = Math.max(
		...heatmap.data.map((rect) => rect.count + rect.neighborCount * 0.125),
		1
	);
	heatmap.data.forEach((rect, idx) => {
		const polygon = new mapgl.Polygon(map, {
			coordinates: [
				[
					[rect.topLeft.lng, rect.topLeft.lat],
					[rect.bottomRight.lng, rect.topLeft.lat],
					[rect.bottomRight.lng, rect.bottomRight.lat],
					[rect.topLeft.lng, rect.bottomRight.lat],
					[rect.topLeft.lng, rect.topLeft.lat],
				],
			],
			color: getColorForCount(
				rect.count + rect.neighborCount * 0.125,
				maxCount,
				colorblind
			),
			strokeWidth: 0,
			zIndex: 1,
			interactive: true,
		});
		polygon.on("click", () => {
			alert(
				`Count: ${rect.count}\nNeighbor count: ${rect.neighborCount}`
			);
		});
		polygonRemoveCallbacks.push(() => polygon.destroy());
	});
}

function getColorForCount(count: number, maxCount: number, colorblind: boolean): string {
	if (count <= 0.2) return "rgba(0,0,0,0)";
	const ratio = count / maxCount;
	const leftHue = colorblind ? 260 : 160;
	const rightHue = colorblind ? 230 : 0;
	const hue = leftHue + (rightHue - leftHue) * ratio;
	return `hsl(${Math.floor(hue)}, 100%, ${colorblind ? Math.floor(ratio * 50 + 20) : 60}%, ${ratio * 0.5 + 0.2})`;
}
