import { redirect, fail } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { db } from '$lib/server/db';
import { verifyPassword, createSession, generateCaptcha, checkRateLimit } from '$lib/server/auth';

export const load: PageServerLoad = async ({ locals }) => {
	// If already logged in, redirect to admin
	if (locals.user) {
		throw redirect(302, '/admin');
	}

	const captcha = generateCaptcha();

	return {
		captchaQuestion: captcha.question,
		captchaAnswer: captcha.answer
	};
};

export const actions: Actions = {
	default: async ({ request, cookies, getClientAddress }) => {
		const ip = getClientAddress();

		// Rate limiting
		const rateLimit = checkRateLimit(ip);
		if (!rateLimit.allowed) {
			return fail(429, {
				error: 'Terlalu banyak percobaan login. Silakan coba lagi dalam 1 menit.',
				username: ''
			});
		}

		const formData = await request.formData();
		const username = formData.get('username')?.toString()?.trim() || '';
		const password = formData.get('password')?.toString() || '';
		const captchaInput = formData.get('captcha')?.toString()?.trim() || '';
		const captchaExpected = formData.get('captcha_answer')?.toString() || '';

		// Validate fields
		if (!username || !password || !captchaInput) {
			return fail(400, {
				error: 'Semua field wajib diisi.',
				username
			});
		}

		// Validate captcha
		if (captchaInput !== captchaExpected) {
			return fail(400, {
				error: 'Jawaban captcha salah.',
				username
			});
		}

		// Find user by username
		const user = await db.users.findFirst({
			where: {
				OR: [
					{ username: username },
					{ email: username }
				]
			}
		});

		if (!user) {
			return fail(401, {
				error: 'Username atau password salah.',
				username
			});
		}

		// Verify password
		const valid = await verifyPassword(password, user.password);
		if (!valid) {
			return fail(401, {
				error: 'Username atau password salah.',
				username
			});
		}

		// Create session
		await createSession(user.id, cookies);

		// Redirect to admin dashboard
		throw redirect(302, '/admin');
	}
};
