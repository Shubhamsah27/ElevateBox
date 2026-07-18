import { fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { createDraft, WorkflowError } from '$lib/server/workflow';

export const load: PageServerLoad = async ({ locals }) => {
	if (!locals.user) {
		throw redirect(302, '/login');
	}
	if (locals.user.role !== 'author') {
		throw redirect(302, '/documents');
	}
	return {};
};

export const actions: Actions = {
	default: async ({ request, locals }) => {
		const user = locals.user;
		if (!user) {
			throw redirect(302, '/login');
		}

		const data = await request.formData();
		const title = data.get('title') as string;
		const body = data.get('body') as string;

		try {
			const doc = await createDraft(user, title, body);
			throw redirect(302, `/documents/${doc.id}`);
		} catch (error) {
			if (error instanceof WorkflowError) {
				return fail(error.status, {
					message: error.message,
					title,
					body
				});
			}
			throw error;
		}
	}
};
