(function () {
	"use strict";

	const USERS_KEY = "elg_users_v1";
	const SESSION_KEY = "elg_session_v1";
	const RECENT_ACTIVITY_KEY = "recent_activity";
	const GUEST_RECENT_ACTIVITY_KEY = "guest_recent_activity";
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

	function escapeHtml(value) {
		return String(value ?? "")
			.replace(/&/g, "&amp;")
			.replace(/</g, "&lt;")
			.replace(/>/g, "&gt;");
	}

	function escapeAttr(value) {
		return String(value ?? "")
			.replace(/&/g, "&amp;")
			.replace(/"/g, "&quot;")
			.replace(/</g, "&lt;")
			.replace(/>/g, "&gt;");
	}

	function getToastRoot() {
		let root = document.getElementById("elg-toast-root");
		if (!root) {
			root = document.createElement("div");
			root.id = "elg-toast-root";
			root.className = "elg-toast-root";
			root.setAttribute("aria-live", "polite");
			root.setAttribute("aria-atomic", "false");
			document.body.appendChild(root);
		}
		return root;
	}

	function showToast(message) {
		if (!message) return;
		const root = getToastRoot();
		const toast = document.createElement("div");
		toast.className = "elg-toast";
		toast.textContent = String(message);
		root.appendChild(toast);
		requestAnimationFrame(() => toast.classList.add("is-visible"));
		window.setTimeout(() => {
			toast.classList.remove("is-visible");
			window.setTimeout(() => toast.remove(), 220);
		}, 1800);
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
		// Also save to Firestore if logged in and it's a progress key
		const session = readSession();
		if (session && session.id && window.firebaseDb && rawKey.includes('__' + session.id)) {
			const docRef = window.firebaseDb.collection('users').doc(session.id);
			docRef.set({
				[rawKey]: Array.isArray(value) ? value : []
			}, { merge: true }).catch(err => console.error('Error saving to Firestore:', err));
		}
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
			Auth.loadProgressFromFirestore();
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
			Auth.logout();
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
		getStoredProgressArray(baseKey) {
			const normalizedBaseKey = String(baseKey || "");
			if (!normalizedBaseKey) return [];

			if (this.isLoggedIn()) {
				return readArrayKey(this.getProgressKey(normalizedBaseKey));
			}

			const guestValue = safeParseJson(sessionStorage.getItem(`guest_${normalizedBaseKey}`) || "[]", []);
			return Array.isArray(guestValue) ? guestValue : [];
		},
		renderCollectionMiniDashboard(root, totalCounts) {
			if (!root || !totalCounts) return;

			const loggedIn = this.isLoggedIn();
			const spiritFound = this.getStoredProgressArray("spirits_found").length;
			const relicFound = this.getStoredProgressArray("relics_found").length;
			const itemFound = this.getStoredProgressArray("items_found").length;
			const findingFound = this.getStoredProgressArray("findings_found").length;
			const totalFound = spiritFound + relicFound + itemFound + findingFound;
			const totalAll = (totalCounts.spirits || 0) + (totalCounts.relics || 0) + (totalCounts.items || 0) + (totalCounts.findings || 0);
			const progressPct = totalAll > 0 ? Math.round((totalFound / totalAll) * 100) : 0;
			const recentActivity = this.getRecentActivity();
			const recentMarkup = recentActivity.length > 0
				? recentActivity.slice(0, 2).map(entry => {
					   let actionLower = String(entry.action || "").toLowerCase();
					   let actionDisplay = entry.action === "Unfound" ? "Not Found" : entry.action;
					   const actionClass = (actionLower === "tracked" || actionLower === "found")
						   ? "collection-mini-action-positive"
						   : ((actionLower === "untracked" || actionLower === "unfound")
							   ? "collection-mini-action-negative"
							   : "");
					   // Capitalize type for display
					   let typeDisplay = "";
					   if (entry.type) {
						   const typeMap = { spirit: "Spirits", relic: "Relics", item: "Items", finding: "Findings" };
						   const typeKey = entry.type.toLowerCase();
						   typeDisplay = typeMap[typeKey] || (entry.type.charAt(0).toUpperCase() + entry.type.slice(1).toLowerCase());
					   }
					   const locationText = entry.location ? ` <span class="collection-mini-location">${escapeHtml(entry.location)}</span>` : "";
					   const untrackButton = loggedIn && actionLower === "tracked"
						   ? `<button class="collection-mini-untrack" data-id="${escapeAttr(entry.id)}" data-action="${escapeAttr(entry.action)}" data-type="${escapeAttr(entry.type)}" data-name="${escapeAttr(entry.name)}" title="Untrack/undo this entry">Untrack</button>`
						   : "";
					   return `<li class="collection-mini-recent-item"><span class="collection-mini-recent-text"><strong class="${actionClass}">${escapeHtml(actionDisplay)}</strong> ${escapeHtml(typeDisplay)}: ${escapeHtml(entry.name)}${locationText}</span>${untrackButton}</li>`;
				}).join("")
				: '<li class="collection-mini-recent-empty">No recent tracked or found activity yet.</li>';

			root.__dashTotalCounts = totalCounts;

			root.innerHTML = `
				${loggedIn ? "" : '<p class="collection-mini-note">Guest progress is temporary until you log in.</p>'}
				<div class="collection-mini-stats-grid">
					<div class="collection-mini-stat"><span>Spirits</span><strong>${spiritFound} / ${totalCounts.spirits || 0}</strong></div>
					<div class="collection-mini-stat"><span>Relics</span><strong>${relicFound} / ${totalCounts.relics || 0}</strong></div>
					<div class="collection-mini-stat"><span>Items</span><strong>${itemFound} / ${totalCounts.items || 0}</strong></div>
					<div class="collection-mini-stat"><span>Findings</span><strong>${findingFound} / ${totalCounts.findings || 0}</strong></div>
				</div>
				<p class="collection-mini-total">Overall: ${totalFound} / ${totalAll} (${progressPct}%)</p>
				<div class="collection-mini-recent">
					<p class="collection-mini-recent-title">Most Recent Tracked and Found</p>
					<ul class="collection-mini-recent-list">${recentMarkup}</ul>
				</div>
			`;

			if (!root.__miniUntrackBound) {
				root.__miniUntrackBound = true;
				root.addEventListener("click", event => {
					const button = event.target.closest(".collection-mini-untrack");
					if (!button) return;
					event.preventDefault();
					const action = String(button.dataset.action || "").toLowerCase();
					if (action !== "tracked") return;
					const type = String(button.dataset.type || "").toLowerCase();
					const name = String(button.dataset.name || "");
					const entryId = String(button.dataset.id || "");

					if (this.isLoggedIn()) {
						this.undoProgressEntry({ action, type, name, entryId });
						this.removeRecentActivity(entryId);
						// Add an 'Untracked' entry to recent activity
						this.recordRecentActivity({
							id: `${type}-${name}-${Date.now()}`,
							type: type.charAt(0).toUpperCase() + type.slice(1),
							action: "Untracked",
							name: name,
							location: "",
							timestamp: Date.now()
						});
						if (root.__dashTotalCounts) {
							this.renderCollectionMiniDashboard(root, root.__dashTotalCounts);
						}
						window.dispatchEvent(new CustomEvent("elg-progress-changed"));
					}
				});
			}
		},
		recordRecentActivity(entry) {
			if (!entry || typeof entry !== "object") return;

			const key = this.getProgressKey(RECENT_ACTIVITY_KEY) || GUEST_RECENT_ACTIVITY_KEY;
			const storage = this.isLoggedIn() ? localStorage : sessionStorage;

			const existing = safeParseJson(storage.getItem(key) || "[]", []);
			const next = [{
				id: String(entry.id || "") || `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
				type: String(entry.type || "").trim(),
				action: String(entry.action || "").trim(),
				name: String(entry.name || "").trim(),
				location: String(entry.location || "").trim(),
				timestamp: Number(entry.timestamp) || Date.now(),
			}].concat(existing.filter(item => item && item.id !== entry.id)).slice(0, 12);

			storage.setItem(key, JSON.stringify(next));
		},
		getRecentActivity() {
			const key = this.getProgressKey(RECENT_ACTIVITY_KEY) || GUEST_RECENT_ACTIVITY_KEY;
			const storage = this.isLoggedIn() ? localStorage : sessionStorage;
			const value = safeParseJson(storage.getItem(key) || "[]", []);
			return Array.isArray(value) ? value : [];
		},
		removeRecentActivity(entryId) {
			if (!entryId) return;
			const key = this.getProgressKey(RECENT_ACTIVITY_KEY) || GUEST_RECENT_ACTIVITY_KEY;
			const storage = this.isLoggedIn() ? localStorage : sessionStorage;
			const value = safeParseJson(storage.getItem(key) || "[]", []);
			const next = Array.isArray(value) ? value.filter(entry => String(entry && entry.id ? entry.id : "") !== String(entryId)) : [];
			storage.setItem(key, JSON.stringify(next));
		},
		undoProgressEntry(entry) {
			if (!entry || !this.isLoggedIn()) return;
			const type = String(entry.type || "").toLowerCase();
			const entryName = String(entry.name || "");
			const entryId = String(entry.entryId || "");
			if (!type || !entryName) return;

			const collectionKeyMap = {
				spirit: "spirits",
				relic: "relics",
				item: "items",
				finding: "findings",
			};
			const collectionKey = collectionKeyMap[type];
			if (!collectionKey) return;

			const targetKey = `${collectionKey}_tracked`;

			const scopedKey = this.getProgressKey(targetKey);
			if (!scopedKey) return;
			const existing = readArrayKey(scopedKey);

			let next = existing;
			if (type === "spirit") {
				const match = entryId.match(/-(\d+)$/);
				if (match) {
					const indexValue = Number(match[1]);
					next = existing.filter(item => Number(item) !== indexValue);
				} else {
					next = existing.filter(item => String(item) !== entryName);
				}
			} else {
				next = existing.filter(item => String(item) !== entryName);
			}

			writeArrayKey(scopedKey, next);
		},
		showNotification(message) {
			showToast(message);
		},
		loadProgressFromFirestore() {
			const session = readSession();
			if (!session || !session.id || !window.firebaseDb) return;
			const userId = session.id;
			const docRef = window.firebaseDb.collection('users').doc(userId);
			docRef.get().then(doc => {
				if (doc.exists) {
					const data = doc.data();
					for (const key in data) {
						if (key.includes('__' + userId)) {
							localStorage.setItem(key, JSON.stringify(data[key]));
						}
					}
					// Dispatch event to update UI
					window.dispatchEvent(new CustomEvent('elg-progress-loaded'));
				}
			}).catch(err => console.error('Error loading from Firestore:', err));
		},
		saveAllProgressToFirestore() {
			const session = readSession();
			if (!session || !session.id || !window.firebaseDb) return;
			const userId = session.id;
			const progressKeys = ['spirits_found', 'relics_found', 'items_found', 'findings_found', RECENT_ACTIVITY_KEY];
			const data = {};
			progressKeys.forEach(key => {
				const scopedKey = this.getProgressKey(key);
				const value = readArrayKey(scopedKey);
				data[scopedKey] = value;
			});
			const docRef = window.firebaseDb.collection('users').doc(userId);
			docRef.set(data, { merge: true }).catch(err => console.error('Error saving all progress to Firestore:', err));
		},
		requireLogin() {
	    return true; // temporarily disable login protection
        },
		logout() {
			writeSession(null);
		},
	};

		// requireLogin(redirectPath) {
		// 	if (readSession()) return true;
		// 	const target = normalizeText(redirectPath || window.location.pathname.split("/").pop() || "index.html");
		// 	window.location.href = "login.html?redirect=" + encodeURIComponent(target);
		// 	return false;
		// },
		

	window.Auth = Auth;

	ensureDemoUser();
	updateNavAuthState();
	setupLoginForm();
	setupSignupForm();

	// window.addEventListener('beforeunload', () => {
	// 	Auth.saveAllProgressToFirestore();
	// });
})();
