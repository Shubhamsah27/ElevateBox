import type { LayoutServerLoad } from './$types';
import { db } from '$lib/server/db';
import { users } from '$lib/server/db/schema';

export const load: LayoutServerLoad = async ({ locals }) => {
	const allUsers = await db.select().from(users);
	return {
		user: locals.user,
		allUsers
	};
};
