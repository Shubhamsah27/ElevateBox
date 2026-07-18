import { redirect, type Handle } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { sessions, users } from '$lib/server/db/schema';
import { eq, and, gt } from 'drizzle-orm';

export const handle: Handle = async ({ event, resolve }) => {
	const sessionId = event.cookies.get('session_id');
	event.locals.user = null;

	if (sessionId) {
		const now = new Date();
		// Fetch session and user from DB
		const results = await db
			.select({
				session: sessions,
				user: users
			})
			.from(sessions)
			.innerJoin(users, eq(sessions.userId, users.id))
			.where(and(eq(sessions.id, sessionId), gt(sessions.expiresAt, now)))
			.limit(1);

		if (results.length > 0) {
			const { user } = results[0];
			event.locals.user = {
				id: user.id,
				name: user.name,
				email: user.email,
				role: user.role as 'author' | 'reviewer' | 'admin' | 'viewer'
			};
		} else {
			// Clear invalid cookie
			event.cookies.delete('session_id', { path: '/' });
		}
	}

	const path = event.url.pathname;

	// Route protection
	if (!event.locals.user && path !== '/login' && path !== '/') {
		throw redirect(302, '/login');
	}

	if (path === '/') {
		if (event.locals.user) {
			throw redirect(302, '/documents');
		} else {
			throw redirect(302, '/login');
		}
	}

	// Protect Admin Archive page
	if (path.startsWith('/archive')) {
		if (!event.locals.user || event.locals.user.role !== 'admin') {
			throw redirect(302, '/documents');
		}
	}

	return resolve(event);
};
