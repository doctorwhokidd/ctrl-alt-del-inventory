(function () {
	"use strict";

	const USERS_KEY = "elg_users_v1";
	const SESSION_KEY = "elg_session_v1";
	const RECENT_ACTIVITY_KEY = "recent_activity";
	const PUBLIC_PAGES = new Set(["", "index.html", "about.html", "contact.html", "login.html", "signup.html"]);
	const RESTRICTED_PAGES = new Set(["spirits.html", "relics.html", "items.html", "findings.html", "map.html"]);
	const DEMO_USER = {
		id: "demo-bob",
		firstName: "Bob",
		lastName: "Demo",
		email: "bob@mail.com",
		username: "bob",
		password: "bobpass",
		createdAt: 0,
	};

	function safeParseJson(raw, fallback) {
		try {
			return JSON.parse(raw);
		} catch (_) {
			return fallback;
		}
	}

	function normalizeText(value) {
		return String(value || "").trim();
	}

	function normalizeLookup(value) {
		return normalizeText(value).toLowerCase();
	}

	function readUsers() {
		const users = safeParseJson(localStorage.getItem(USERS_KEY) || "[]", []);
		return Array.isArray(users) ? users : [];
	}

	function writeUsers(users) {
		localStorage.setItem(USERS_KEY, JSON.stringify(users));
	}

	function ensureDemoUser() {
		const users = readUsers();
		const hasDemo = users.some(item => normalizeLookup(item.username) === normalizeLookup(DEMO_USER.username)
			|| normalizeLookup(item.email) === normalizeLookup(DEMO_USER.email));
		if (hasDemo) return;
		users.push({ ...DEMO_USER, createdAt: Date.now() });
		writeUsers(users);
	}

	function readSession() {
		const session = safeParseJson(localStorage.getItem(SESSION_KEY) || "null", null);
		if (!session || !session.id) return null;
		return session;
	}

	function writeSession(session) {
		if (!session) {
			localStorage.removeItem(SESSION_KEY);
			return;
		}
		localStorage.setItem(SESSION_KEY, JSON.stringify(session));
	}

	function readArrayKey(rawKey) {
		if (!rawKey) return [];
		const value = safeParseJson(localStorage.getItem(rawKey) || "[]", []);
		return Array.isArray(value) ? value : [];
	}

	function writeArrayKey(rawKey, value) {
		if (!rawKey) return;
		localStorage.setItem(rawKey, JSON.stringify(Array.isArray(value) ? value : []));
	}

	function deriveUserId(username, email) {
		const seed = normalizeLookup(username || email || "user");
		const cleaned = seed.replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") || "user";
		return cleaned + "-" + Date.now();
	}

	function buildSessionFromUser(user) {
		return {
			id: user.id,
			username: user.username,
			email: user.email,
			displayName: user.firstName || user.username || "Player",
		};
	}

	function getCurrentPageName() {
		const path = String(window.location.pathname || "");
		const raw = path.split("/").pop() || "";
		return normalizeText(raw).toLowerCase();
	}

	function resolveInternalPage(href) {
		const text = normalizeText(href);
		if (!text || text.startsWith("#") || /^https?:/i.test(text) || /^mailto:/i.test(text) || /^tel:/i.test(text)) {
			return "";
		}
		const noHash = text.split("#")[0];
		const noQuery = noHash.split("?")[0];
		return normalizeText(noQuery.split("/").pop() || "").toLowerCase();
	}

	function redirectToLogin(targetPage) {
		const target = normalizeText(targetPage || "index.html").toLowerCase();
		window.location.href = "login.html?redirect=" + encodeURIComponent(target);
	}

	function enforcePageAccess() {
		const session = readSession();
		if (session) return;

		const page = getCurrentPageName();
		if (RESTRICTED_PAGES.has(page)) {
			redirectToLogin(page);
		}
	}

	function gateRestrictedLinksForGuests() {
		const session = readSession();
		if (session) return;

		document.querySelectorAll("a[href]").forEach(link => {
			const href = link.getAttribute("href") || "";
			const page = resolveInternalPage(href);
			if (!page || !RESTRICTED_PAGES.has(page)) return;

			link.setAttribute("href", "login.html?redirect=" + encodeURIComponent(page));
			link.setAttribute("title", "Log in required");
		});
	}

	function removeRestrictedNavForGuests() {
		const session = readSession();
		if (session) return;

		const nav = document.querySelector(".site-nav");
		if (!nav) return;

		nav.querySelectorAll("a[href]").forEach(link => {
			const href = link.getAttribute("href") || "";
			const page = resolveInternalPage(href);
			if (RESTRICTED_PAGES.has(page)) {
				link.remove();
			}
		});
	}

	function createStatusNode(form) {
		let node = form.querySelector(".auth-status");
		if (!node) {
			node = document.createElement("p");
			node.className = "auth-status";
			node.style.marginTop = "0.75rem";
			node.style.fontSize = "0.95rem";
			form.appendChild(node);
		}
		return node;
	}

	function setStatus(form, message, isError) {
		const node = createStatusNode(form);
		node.textContent = message || "";
		node.style.color = isError ? "#ffb4b4" : "#b9f0c7";
	}

	function setupLoginForm() {
		const form = document.querySelector(".auth-form");
		if (!form) return;
		if (!form.querySelector("input[name='loginIdentifier']")) return;

		form.addEventListener("submit", event => {
			event.preventDefault();
			const identifierInput = form.querySelector("input[name='loginIdentifier']");
			const passwordInput = form.querySelector("input[name='password']");
			const identifier = normalizeText(identifierInput ? identifierInput.value : "");
			const password = normalizeText(passwordInput ? passwordInput.value : "");

			if (!identifier || !password) {
				setStatus(form, "Enter both your username/email and password.", true);
				return;
			}

			const users = readUsers();
			const ident = normalizeLookup(identifier);
			const user = users.find(item => normalizeLookup(item.username) === ident || normalizeLookup(item.email) === ident);
			if (!user || user.password !== password) {
				setStatus(form, "Invalid login credentials.", true);
				return;
			}

			writeSession(buildSessionFromUser(user));
			setStatus(form, "Login successful. Redirecting...", false);
			const params = new URLSearchParams(window.location.search);
			const redirect = params.get("redirect");
			window.location.href = redirect || "index.html";
		});
	}

	function setupSignupForm() {
		const form = document.querySelector(".auth-form");
		if (!form) return;
		if (!form.querySelector("input[name='confirmPassword']")) return;

		form.addEventListener("submit", event => {
			event.preventDefault();
			const firstName = normalizeText(form.querySelector("input[name='firstName']")?.value);
			const lastName = normalizeText(form.querySelector("input[name='lastName']")?.value);
			const email = normalizeText(form.querySelector("input[name='email']")?.value);
			const username = normalizeText(form.querySelector("input[name='username']")?.value);
			const password = normalizeText(form.querySelector("input[name='password']")?.value);
			const confirmPassword = normalizeText(form.querySelector("input[name='confirmPassword']")?.value);

			if (!firstName || !lastName || !email || !username || !password) {
				setStatus(form, "Please complete all required fields.", true);
				return;
			}
			if (password !== confirmPassword) {
				setStatus(form, "Passwords do not match.", true);
				return;
			}

			const users = readUsers();
			const emailLookup = normalizeLookup(email);
			const usernameLookup = normalizeLookup(username);
			const existing = users.find(item => normalizeLookup(item.email) === emailLookup || normalizeLookup(item.username) === usernameLookup);
			if (existing) {
				setStatus(form, "Email or username already exists.", true);
				return;
			}

			const newUser = {
				id: deriveUserId(username, email),
				firstName,
				lastName,
				email,
				username,
				password,
				createdAt: Date.now(),
			};

			users.push(newUser);
			writeUsers(users);
			writeSession(buildSessionFromUser(newUser));
			setStatus(form, "Account created. Redirecting...", false);
			window.location.href = "index.html";
		});
	}

	function updateNavAuthState() {
		const navLogin = document.querySelector(".site-nav .nav-login");
		if (!navLogin) return;
		const nav = navLogin.closest(".site-nav");
		let navUsername = nav ? nav.querySelector(".nav-username") : null;

		const session = readSession();
		if (!session) {
			if (navUsername) {
				navUsername.remove();
				navUsername = null;
			}
			navLogin.textContent = "Log In";
			navLogin.setAttribute("href", "login.html");
			navLogin.removeAttribute("data-auth-action");
			navLogin.removeAttribute("title");
			return;
		}

		const usernameLabel = normalizeText(session.username || session.displayName || session.email || "user");
		if (nav && !navUsername) {
			navUsername = document.createElement("span");
			navUsername.className = "nav-username";
			nav.insertBefore(navUsername, navLogin);
		}
		if (navUsername) {
			navUsername.textContent = usernameLabel;
			navUsername.title = "Logged in user";
		}

		navLogin.textContent = "Log Out";
		navLogin.setAttribute("href", "#");
		navLogin.setAttribute("data-auth-action", "logout");
		navLogin.setAttribute("title", "Logged in as " + usernameLabel);

		navLogin.addEventListener("click", event => {
			event.preventDefault();
			writeSession(null);
			window.location.href = "login.html";
		}, { once: true });
	}

	const Auth = {
		isLoggedIn() {
			return Boolean(readSession());
		},
		getSession() {
			return readSession();
		},
		getProgressKey(baseKey) {
			const session = readSession();
			if (!session || !session.id) return null;
			return String(baseKey || "") + "__" + session.id;
		},
		recordRecentActivity(entry) {
			const key = this.getProgressKey(RECENT_ACTIVITY_KEY);
			if (!key || !entry || typeof entry !== "object") return;

			const existing = readArrayKey(key);
			const next = [{
				id: String(entry.id || "") || `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
				type: String(entry.type || "").trim(),
				action: String(entry.action || "").trim(),
				name: String(entry.name || "").trim(),
				location: String(entry.location || "").trim(),
				timestamp: Number(entry.timestamp) || Date.now(),
			}].concat(existing.filter(item => item && item.id !== entry.id)).slice(0, 12);

			writeArrayKey(key, next);
		},
		getRecentActivity() {
			const key = this.getProgressKey(RECENT_ACTIVITY_KEY);
			return readArrayKey(key);
		},
		requireLogin(redirectPath) {
			if (readSession()) return true;
			const target = normalizeText(redirectPath || window.location.pathname.split("/").pop() || "index.html");
			window.location.href = "login.html?redirect=" + encodeURIComponent(target);
			return false;
		},
		logout() {
			writeSession(null);
		},
	};

	window.Auth = Auth;

	ensureDemoUser();
	enforcePageAccess();
	removeRestrictedNavForGuests();
	gateRestrictedLinksForGuests();
	updateNavAuthState();
	setupLoginForm();
	setupSignupForm();
})();
