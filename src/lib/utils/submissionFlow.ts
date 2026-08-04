import {
	INTERNAL_STATUS_LABELS,
	STATUS_COLORS,
	getInternalStatusLabel,
	getStatusColor,
	getAllowedStatuses
} from '$lib/constants/status';

/**
 * Backward-compatible re-exports from the single source of truth.
 * Typed as `Record<string, string>` so dynamic string indexing (e.g. `statusLabels[v]`)
 * remains valid throughout admin UI components.
 */
export const statusLabels: Record<string, string> = INTERNAL_STATUS_LABELS as Record<string, string>;
export const statusColors: Record<string, string> = STATUS_COLORS as Record<string, string>;

export function getStatusLabel(status: string): string {
	return getInternalStatusLabel(status);
}

export { getStatusColor, getAllowedStatuses };
