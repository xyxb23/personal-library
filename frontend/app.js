if (location.hostname !== "localhost" && location.hostname !== "127.0.0.1") {
    document.querySelector("#demo-banner").hidden = false;
}

function escapeHtml(str) {
    return String(str)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#39;");
  }

const API ="http://localhost:5000/api/books";
const AUTH_API = "http://localhost:5000/api/auth";

function getToken() {
    return localStorage.getItem("access_token");
}

function setToken(token) {
    localStorage.setItem("access_token", token);
}

function clearToken() {
    localStorage.removeItem("access_token");
}

function authHeaders() {
    const token = getToken();
    return token
        ? { "Authorization": `Bearer ${token}`, "Content-Type": "application/json" }
        : { "Content-Type": "application/json" };
}

let authMode = "login";   // "login" | "register"

const authScreen = document.querySelector("#auth-screen");
const authForm = document.querySelector("#auth-form");
const authError = document.querySelector("#auth-error");
const authToggleBtn = document.querySelector("#auth-toggle-btn");
const authModeText = document.querySelector("#auth-mode-text");
const authSubmit = document.querySelector("#auth-submit");
const logoutBtn = document.querySelector("#logout-btn");

function showAuthScreen() {
    authScreen.hidden = false;
    document.querySelector(".layout").hidden = true;
    logoutBtn.hidden = true;
}

function showApp() {
    authScreen.hidden = true;
    document.querySelector(".layout").hidden = false;
    logoutBtn.hidden = false;
}

authToggleBtn.addEventListener("click", () => {
    authMode = authMode === "login" ? "register" : "login";
    authSubmit.textContent = authMode === "login" ? "Log in" : "Register";
    authToggleBtn.textContent = authMode === "login" ? "Register" : "Log in";
    authModeText.textContent = authMode === "login" ? "No account?" : "Have an account?";
    authError.textContent = "";
});

authForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    authError.textContent = "";

    const username = document.querySelector("#auth-username").value.trim();
    const password = document.querySelector("#auth-password").value;

    if (!username || !password) {
        authError.textContent = "Username and password are required.";
        return;
    }

    const endpoint = authMode === "login" ? "login" : "register";
    try {
        const res = await fetch(`${AUTH_API}/${endpoint}`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ username, password }),
        });
        const data = await res.json();
        if (!res.ok) {
            authError.textContent = data.error || "Something went wrong.";
            return;
        }
        if (res.status === 401) {
            clearToken();
            showAuthScreen();
            throw new Error("Session expired");
        }
        setToken(data.access_token);
        authForm.reset();
        showApp();
        loadBooksFromServer();
    } catch (err) {
        console.error("Auth failed:", err);
        authError.textContent = "Couldn't reach the server. Is Flask running?";
    }
});

logoutBtn.addEventListener("click", () => {
    clearToken();
    showAuthScreen();
})

async function loadBooksFromServer() {
    try {
        const res = await fetch(API, { headers: authHeaders() });
        if (res.status === 401) {
            clearToken();
            showAuthScreen();
            return;
        }
        if (!res.ok) throw new Error(`Server returned ${res.status}`);
        books = await res.json();
        render();
    } catch (err) {
        console.error("Failed to load books:", err);
        bookListEl.innerHTML = `<p class="empty">Couldn't load books. Is the server running?</p>`;
    }
}

async function addBookToServer(data) {
    try {
        const res = await fetch(API, {
            method: "POST",
            headers: authHeaders(),
            body: JSON.stringify(data),
        });
        if (!res.ok) throw new Error(`Server returned ${res.status}`);
        if (res.status === 401) {
            clearToken();
            showAuthScreen();
            throw new Error("Session expired");
        }
        const created = await res.json();
        books.push(created);
        render();
        return true;
    } catch (err) {
        console.error("Failed to add book:", err);
        return false;
    }
}

async function deleteBookFromServer(id) {
    try {
        const res = await fetch(`${API}/${id}`, { method: "DELETE", headers: authHeaders(), });
        if (!res.ok) throw new Error(`Server returned ${res.status}`);
        if (res.status === 401) {
            clearToken();
            showAuthScreen();
            throw new Error("Session expired");
        }
        books = books.filter(b => b.id !== id);
        render();
        return true;
    } catch (err) {
        console.error("Failed to delete book:", err);
        return false;
    }
}

async function updateBookOnServer(id, data) {
    try {
        const res = await fetch(`${API}/${id}`, {
            method: "PATCH",
            headers: authHeaders(),
            body: JSON.stringify(data),
        });
        if (!res.ok) throw new Error(`Server returned ${res.status}`);
        if (res.status === 401) {
            clearToken();
            showAuthScreen();
            throw new Error("Session expired");
        }
        const updated = await res.json();
        const idx = books.findIndex(b => b.id === id);
        if (idx !== -1) books[idx] = updated;
        render();
        return true;
    } catch (err) {
        console.error("Failed to update book:", err);
        return false;
    }
}

// --- 1. STATE: the single source of truth ---
let books = [];

let searchTerm = "";
let statusFilter = "all";
let editingId = null;

// --- 2. Grab DOM elements once ---
const bookListEl = document.querySelector("#book-list");

// --- 3. RENDER: draw the screen from state ---
function renderCard(book) {
    return `
        <article class="book-card" data-id="${book.id}">
            <div class="book-cover">
                ${book.cover ? `<img src="${escapeHtml(book.cover)}" alt="${escapeHtml(book.title)}" />` : "📕"}
            </div>
            <div class="book-info">
                <h3>${escapeHtml(book.title)}</h3>
                <p class="author">${escapeHtml(book.author)}</p>
                <span class="badge badge--${escapeHtml(book.status)}">${escapeHtml(book.status)}</span>
            </div>
            <div class="book-actions">
                <button class="btn-edit" data-action="edit">Edit</button>
                <button class="btn-delete" data-action="delete">Delete</button>
            </div>
        </article>
    `;
}

function renderEditForm(book) {
    return `
        <article class="book-card book-card--editing" data-id="${book.id}">
            <form class="inline-edit" data-action="save">
                <input name="title" value="${escapeHtml(book.title)}" required />
                <input name="author" value="${escapeHtml(book.author)}" required />
                <select name="status">
                    <option value="owned"    ${book.status === "owned"    ? "selected" : ""}>Owned</option>
                    <option value="reading"  ${book.status === "reading"  ? "selected" : ""}>Reading</option>
                    <option value="read"     ${book.status === "read"     ? "selected" : ""}>Read</option>
                    <option value="wishlist" ${book.status === "wishlist" ? "selected" : ""}>Wishlist</option>
                </select>
                <div class="edit-actions">
                    <button type="submit">Save</button>
                    <button type="button" data-action="cancel">Cancel</button>
                </div>
            </form>
        </article>
    `;       
}

function render() {
    const filtered = books.filter((book) => {
        const matchesSearch = 
            book.title.toLowerCase().includes(searchTerm) ||
            book.author.toLowerCase().includes(searchTerm);
        const matchesStatus = 
            statusFilter === "all" || book.status === statusFilter;
        return matchesSearch && matchesStatus;
    });

    if (filtered.length === 0) {
        bookListEl.innerHTML = `<p class="empty">No matching books.</p>`;
        return;
    }
    bookListEl.innerHTML = filtered
        .map(book => book.id === editingId ? renderEditForm(book) : renderCard(book))
        .join(""); // join the array of strings into one big string
}

// --- Grab the form once ===
const formEl = document.querySelector("#book-form");

// --- 5. EVENT: add a book ---
formEl.addEventListener("submit", async (event) => {
    event.preventDefault(); // stop the browser from reloading the page

    // Read values from the form inputs
    const title = document.querySelector("#title").value.trim();
    const author = document.querySelector("#author").value.trim();
    const status = document.querySelector("#status").value;
    const cover = document.querySelector("#cover").value.trim();

    if (!isValidCoverUrl(cover)) {
        alert("Cover must be an http:// or https:// URL.");
        return;
    }
    // Guard: don't add empty books
    if (!title || !author) {
        alert("Title and author are required.");
        return;
    }

    const ok = await addBookToServer({ title, author, status, cover });
    if (!ok) { alert("Couldn't add book. Is the server running?"); return; }
    formEl.reset();
    document.querySelector("#title").focus();
});

// --- 6. EVENT DELEGATION: handle clicks on edit/delete buttons ---
bookListEl.addEventListener("click", (event) => {
    const button = event.target.closest("button[data-action]");
    if (!button) return; // click wasn't on an action button - ignore

    const card = button.closest(".book-card");
    const id = Number(card.dataset.id);
    const action = button.dataset.action;

    if (action === "delete") {
        if (!confirm("Delete this book?")) return;
        deleteBookFromServer(id);
    } else if (action === "edit") {
        editingId = id;
        render();
    } else if (action === "cancel") {
        editingId = null;
        render();
    }
});

bookListEl.addEventListener("submit", async (event) => {
    const form = event.target.closest("form[data-action='save']");
    if (!form) return;

    event.preventDefault();

    const card = form.closest(".book-card");
    const id = Number(card.dataset.id);
    const book = books.find(b => b.id === id);
    if (!book) return;

    const title  = form.querySelector("[name='title']").value.trim();
    const author = form.querySelector("[name='author']").value.trim();
    const status = form.querySelector("[name='status']").value;

    if (!title || !author) {
        alert("Title and author are required.");
        return;
    }

    const ok = await updateBookOnServer(id, { title, author, status });
    if (!ok) { alert("Couldn't save changes."); return; }

    editingId = null;
    render();
});

function isValidCoverUrl(str) {
    if (!str) return true;
    try {
        const url = new URL(str);
        return url.protocol === "http:" || url.protocol === "https:";
    } catch {
        return false;
    }
}

// --- 7. Search + filter listeners ---
const searchEl = document.querySelector("#search");
const filterEl = document.querySelector("#filter");

searchEl.addEventListener("input", (event) => {
    searchTerm = event.target.value.trim().toLowerCase();
    editingId = null;
    render();
});

filterEl.addEventListener("change", (event) => {
    statusFilter = event.target.value;
    editingId = null;
    render();
});

// --- 4. Go ---
if (getToken()) {
    showApp();
    loadBooksFromServer();
} else {
    showAuthScreen();
}
render();