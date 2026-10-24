function escapeHtml(str) {
    return String(str)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#39;");
  }

const API ="https://personal-library-jr8b.onrender.com:10000/api/books";

async function loadBooksFromServer() {
    try {
        const res = await fetch(API);
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
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(data),
        });
        if (!res.ok) throw new Error(`Server returned ${res.status}`);
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
        const res = await fetch(`${API}/${id}`, { method: "DELETE" });
        if (!res.ok) throw new Error(`Server returned ${res.status}`);
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
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(data),
        });
        if (!res.ok) throw new Error(`Server returned ${res.status}`);
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

// --- 4. Go ---
render();               // initial empty paint
loadBooksFromServer();  // then fetch and re-render

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