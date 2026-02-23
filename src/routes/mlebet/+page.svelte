<script lang="ts">
	import type { ActionData, PageData } from './$types';

	let { data, form }: { data: PageData; form: ActionData } = $props();
</script>

<svelte:head>
	<title>Login — Layanan Digital Kab. Semarang</title>
	<link rel="preconnect" href="https://fonts.googleapis.com" />
	<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin="anonymous" />
	<link
		href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap"
		rel="stylesheet"
	/>
</svelte:head>

<div class="login-page">
	<!-- Background decoration -->
	<div class="bg-decoration">
		<div class="circle circle-1"></div>
		<div class="circle circle-2"></div>
		<div class="circle circle-3"></div>
	</div>

	<div class="login-container">
		<!-- Logo & Header -->
		<div class="login-header">
			<div class="logo-wrapper">
				<svg
					xmlns="http://www.w3.org/2000/svg"
					width="56"
					height="56"
					viewBox="0 0 24 24"
					fill="none"
					stroke="currentColor"
					stroke-width="1.5"
					stroke-linecap="round"
					stroke-linejoin="round"
					class="logo-icon"
				>
					<path d="M3 21h18" />
					<path d="M5 21V7l8-4v18" />
					<path d="M19 21V11l-6-4" />
					<path d="M9 9v.01" />
					<path d="M9 12v.01" />
					<path d="M9 15v.01" />
					<path d="M9 18v.01" />
				</svg>
			</div>
			<h1 class="login-title">Layanan Digital</h1>
			<p class="login-subtitle">Kabupaten Semarang</p>
		</div>

		<!-- Login Form -->
		<form method="POST" class="login-form">
			{#if form?.error}
				<div class="error-message">
					<svg
						xmlns="http://www.w3.org/2000/svg"
						width="18"
						height="18"
						viewBox="0 0 24 24"
						fill="none"
						stroke="currentColor"
						stroke-width="2"
						stroke-linecap="round"
						stroke-linejoin="round"
					>
						<circle cx="12" cy="12" r="10" />
						<line x1="15" y1="9" x2="9" y2="15" />
						<line x1="9" y1="9" x2="15" y2="15" />
					</svg>
					<span>{form.error}</span>
				</div>
			{/if}

			<div class="form-group">
				<label for="username">Username atau Email</label>
				<div class="input-wrapper">
					<svg
						xmlns="http://www.w3.org/2000/svg"
						width="18"
						height="18"
						viewBox="0 0 24 24"
						fill="none"
						stroke="currentColor"
						stroke-width="2"
						stroke-linecap="round"
						stroke-linejoin="round"
					>
						<path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
						<circle cx="12" cy="7" r="4" />
					</svg>
					<input
						type="text"
						id="username"
						name="username"
						placeholder="Masukkan username atau email"
						value={form?.username || ''}
						autocomplete="username"
						required
					/>
				</div>
			</div>

			<div class="form-group">
				<label for="password">Password</label>
				<div class="input-wrapper">
					<svg
						xmlns="http://www.w3.org/2000/svg"
						width="18"
						height="18"
						viewBox="0 0 24 24"
						fill="none"
						stroke="currentColor"
						stroke-width="2"
						stroke-linecap="round"
						stroke-linejoin="round"
					>
						<rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
						<path d="M7 11V7a5 5 0 0 1 10 0v4" />
					</svg>
					<input
						type="password"
						id="password"
						name="password"
						placeholder="Masukkan password"
						autocomplete="current-password"
						required
					/>
				</div>
			</div>

			<div class="form-group">
				<label for="captcha">Verifikasi: <strong class="captcha-question">{data.captchaQuestion}</strong></label>
				<div class="input-wrapper">
					<svg
						xmlns="http://www.w3.org/2000/svg"
						width="18"
						height="18"
						viewBox="0 0 24 24"
						fill="none"
						stroke="currentColor"
						stroke-width="2"
						stroke-linecap="round"
						stroke-linejoin="round"
					>
						<path d="M9 9h.01" />
						<path d="M15 15h.01" />
						<path d="M16 8l-8 8" />
						<circle cx="12" cy="12" r="10" />
					</svg>
					<input
						type="text"
						id="captcha"
						name="captcha"
						placeholder="Jawaban"
						inputmode="numeric"
						autocomplete="off"
						required
					/>
				</div>
				<input type="hidden" name="captcha_answer" value={data.captchaAnswer} />
			</div>

			<button type="submit" class="login-button">
				<svg
					xmlns="http://www.w3.org/2000/svg"
					width="18"
					height="18"
					viewBox="0 0 24 24"
					fill="none"
					stroke="currentColor"
					stroke-width="2"
					stroke-linecap="round"
					stroke-linejoin="round"
				>
					<path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4" />
					<polyline points="10 17 15 12 10 7" />
					<line x1="15" y1="12" x2="3" y2="12" />
				</svg>
				Masuk
			</button>
		</form>

		<div class="login-footer">
			<p>© 2026 Layanan Digital Kabupaten Semarang</p>
		</div>
	</div>
</div>

<style>
	:global(body) {
		margin: 0;
		padding: 0;
	}

	.login-page {
		font-family: 'Inter', system-ui, -apple-system, sans-serif;
		min-height: 100vh;
		display: flex;
		align-items: center;
		justify-content: center;
		background: linear-gradient(135deg, #5c0a0a 0%, #800020 30%, #6b0f2e 60%, #3d0c11 100%);
		position: relative;
		overflow: hidden;
		padding: 1rem;
	}

	/* Background decorations */
	.bg-decoration {
		position: absolute;
		inset: 0;
		pointer-events: none;
	}

	.circle {
		position: absolute;
		border-radius: 50%;
		background: rgba(255, 255, 255, 0.03);
	}

	.circle-1 {
		width: 600px;
		height: 600px;
		top: -200px;
		right: -100px;
		animation: float 20s ease-in-out infinite;
	}

	.circle-2 {
		width: 400px;
		height: 400px;
		bottom: -100px;
		left: -100px;
		animation: float 15s ease-in-out infinite reverse;
	}

	.circle-3 {
		width: 200px;
		height: 200px;
		top: 50%;
		left: 60%;
		animation: float 10s ease-in-out infinite;
	}

	@keyframes float {
		0%,
		100% {
			transform: translate(0, 0) scale(1);
		}
		33% {
			transform: translate(30px, -30px) scale(1.05);
		}
		66% {
			transform: translate(-20px, 20px) scale(0.95);
		}
	}

	/* Login Container */
	.login-container {
		background: rgba(255, 255, 255, 0.95);
		backdrop-filter: blur(20px);
		border-radius: 20px;
		box-shadow:
			0 25px 50px -12px rgba(0, 0, 0, 0.4),
			0 0 0 1px rgba(255, 255, 255, 0.1);
		width: 100%;
		max-width: 420px;
		padding: 2.5rem 2rem;
		position: relative;
		z-index: 1;
		animation: slideUp 0.6s ease-out;
	}

	@keyframes slideUp {
		from {
			opacity: 0;
			transform: translateY(30px);
		}
		to {
			opacity: 1;
			transform: translateY(0);
		}
	}

	/* Header */
	.login-header {
		text-align: center;
		margin-bottom: 2rem;
	}

	.logo-wrapper {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		width: 80px;
		height: 80px;
		background: linear-gradient(135deg, #800020, #a80030);
		border-radius: 20px;
		margin-bottom: 1rem;
		box-shadow: 0 8px 20px rgba(128, 0, 32, 0.3);
	}

	.logo-icon {
		color: white;
	}

	.login-title {
		font-size: 1.5rem;
		font-weight: 700;
		color: #1a1a2e;
		margin: 0;
		letter-spacing: -0.02em;
	}

	.login-subtitle {
		font-size: 0.875rem;
		color: #6b7280;
		margin: 0.25rem 0 0;
		font-weight: 500;
	}

	/* Form */
	.login-form {
		display: flex;
		flex-direction: column;
		gap: 1.25rem;
	}

	.error-message {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		padding: 0.75rem 1rem;
		background: #fef2f2;
		color: #b91c1c;
		border-radius: 10px;
		font-size: 0.85rem;
		font-weight: 500;
		border: 1px solid #fecaca;
		animation: shake 0.5s ease-in-out;
	}

	@keyframes shake {
		0%,
		100% {
			transform: translateX(0);
		}
		25% {
			transform: translateX(-5px);
		}
		75% {
			transform: translateX(5px);
		}
	}

	.form-group {
		display: flex;
		flex-direction: column;
		gap: 0.4rem;
	}

	.form-group label {
		font-size: 0.825rem;
		font-weight: 600;
		color: #374151;
	}

	.captcha-question {
		color: #800020;
		font-size: 1rem;
	}

	.input-wrapper {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		padding: 0 1rem;
		background: #f9fafb;
		border: 1.5px solid #e5e7eb;
		border-radius: 12px;
		transition: all 0.2s ease;
	}

	.input-wrapper:focus-within {
		border-color: #800020;
		background: white;
		box-shadow: 0 0 0 3px rgba(128, 0, 32, 0.1);
	}

	.input-wrapper svg {
		color: #9ca3af;
		flex-shrink: 0;
	}

	.input-wrapper:focus-within svg {
		color: #800020;
	}

	.input-wrapper input {
		flex: 1;
		padding: 0.75rem 0;
		border: none;
		background: transparent;
		font-size: 0.9rem;
		color: #1f2937;
		outline: none;
		font-family: inherit;
	}

	.input-wrapper input::placeholder {
		color: #9ca3af;
	}

	/* Login Button */
	.login-button {
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 0.5rem;
		padding: 0.85rem;
		background: linear-gradient(135deg, #800020, #a80030);
		color: white;
		border: none;
		border-radius: 12px;
		font-size: 0.95rem;
		font-weight: 600;
		cursor: pointer;
		transition: all 0.2s ease;
		font-family: inherit;
		margin-top: 0.5rem;
		box-shadow: 0 4px 12px rgba(128, 0, 32, 0.3);
	}

	.login-button:hover {
		transform: translateY(-1px);
		box-shadow: 0 6px 20px rgba(128, 0, 32, 0.4);
		background: linear-gradient(135deg, #6b001a, #940028);
	}

	.login-button:active {
		transform: translateY(0);
	}

	/* Footer */
	.login-footer {
		text-align: center;
		margin-top: 1.5rem;
		padding-top: 1.25rem;
		border-top: 1px solid #e5e7eb;
	}

	.login-footer p {
		font-size: 0.75rem;
		color: #9ca3af;
		margin: 0;
	}

	/* Responsive */
	@media (max-width: 480px) {
		.login-container {
			padding: 2rem 1.5rem;
			border-radius: 16px;
		}

		.logo-wrapper {
			width: 64px;
			height: 64px;
			border-radius: 16px;
		}

		:global(.logo-icon) {
			width: 40px;
			height: 40px;
		}
	}
</style>
