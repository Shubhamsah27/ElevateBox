import { redirect, fail } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { db } from '$lib/server/db';
import { sessions, users } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';

export const load: PageServerLoad = async ({ locals }) => {
	if (locals.user) {
		throw redirect(302, '/documents');
	}
	const allUsers = await db.select().from(users);
	return { allUsers };
};

export const actions: Actions = {
	login: async ({ request, cookies }) => {
		const data = await request.formData();
		const userId = data.get('userId') as string;

		if (!userId) {
			return fail(400, { message: 'User selection is required.' });
		}

		// Verify user exists
		const [user] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
		if (!user) {
			return fail(404, { message: 'User not found.' });
		}

		// Replace the current session when switching profiles so stale sessions do not accumulate.
		const currentSessionId = cookies.get('session_id');
		if (currentSessionId) {
			await db.delete(sessions).where(eq(sessions.id, currentSessionId));
		}

		// Create session
		const sessionId = crypto.randomUUID();
		const expiresAt = new Date();
		expiresAt.setHours(expiresAt.getHours() + 24);

		await db.insert(sessions).values({
			id: sessionId,
			userId: user.id,
			expiresAt
		});

		cookies.set('session_id', sessionId, {
			path: '/',
			httpOnly: true,
			sameSite: 'lax',
			maxAge: 60 * 60 * 24,
			secure: process.env.NODE_ENV === 'production' // 24 hours
		});

		const requestedRedirect = data.get('redirectTo');
		const redirectTo =
			typeof requestedRedirect === 'string' &&
			requestedRedirect.startsWith('/') &&
			!requestedRedirect.startsWith('//')
				? requestedRedirect
				: '/documents';
		throw redirect(302, redirectTo);
	},

	logout: async ({ cookies }) => {
		const sessionId = cookies.get('session_id');
		if (sessionId) {
			await db.delete(sessions).where(eq(sessions.id, sessionId));
			cookies.delete('session_id', { path: '/' });
		}
		throw redirect(302, '/login');
	}
};
