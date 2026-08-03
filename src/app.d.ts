// See https://svelte.dev/docs/kit/types#app.d.ts
// for information about these interfaces
declare global {
	namespace App {
		// interface Error {}
		interface Locals {
			user: {
				id: bigint;
				name: string;
				username: string;
				email: string;
				phone: string | null;
				role: string; // 'superadmin' | 'admin' | 'pic'
				agency_id: string | null;
				agency_name: string | null;
			} | null;
		}
		// interface PageData {}
		// interface PageState {}
		// interface Platform {}
	}
}

export {};
