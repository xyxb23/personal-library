function escapeHtml(str) {
    return String(str)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#39;");
  }

// --- 1. STATE: the single source of truth ---
let books = [
    {
        id: "1",
        title: "The Hobbit",
        author: "J.R.R. Tolkien",
        status: "read",
        cover: "",
    },
    {
        id: "2",
        title: "Dune",
        author: "Frank Herbert",
        status: "reading",
        cover: "",
    },
    {
        id: "3",
        title: "Project Hail Mary",
        author: "Andy Weir",
        status: "wishlist",
        cover: "",
    },
    {
        id: "4",
        title: "Cloud Atlas",
        author: "David Mitchell",
        status: "read",
        cover: "https://ir.ozone.ru/s3/multimedia-1/wc1000/6496323829.jpg",
    }
];

const STORAGE_KEY = "my-library-books";

function saveBooks() {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(books));
        return true;
    } catch (err) {
        console.warn("Could not save books:", err);
        return false;
    }    
}

function loadBooks() {
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (!raw) return null;
        const parsed = JSON.parse(raw);
        return Array.isArray(parsed) ? parsed : null;
    } catch (err) {
        console.warn("Could not load books:", err);
        return null;
    }
}

// load saved books on startup - replaces the starters if any saved data exists
const saved = loadBooks();
if (Array.isArray(saved)) books = saved;

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
                <input name="title" value="${escapeHtml(book.title)}}" required />
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
render();

// --- Grab the form once ===
const formEl = document.querySelector("#book-form");

// --- 5. EVENT: add a book ---
formEl.addEventListener("submit", (event) => {
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

    // Build a new book object and push it to state
    books.push({
        id: crypto.randomUUID(), // unique id - supported in modern browsers
        title,
        author,
        status,
        cover,
    });
    const saved = saveBooks();

    // Re-render and reset the form
    render();

    if (!saved) alert("⚠️ Couldn't save - changes won't persist after refresh.");
    formEl.reset();
    document.querySelector("#title").focus(); // nice UX: ready for next entry

    if (!saved) {
        // A one-line, dismissible banner - better than silence
        // showToast("⚠️ Couldn't save - this book won't persist after refresh.");
        alert("Couldn't save");
    }
});

// --- 6. EVENT DELEGATION: handle clicks on edit/delete buttons ---
bookListEl.addEventListener("click", (event) => {
    const button = event.target.closest("button[data-action]");
    if (!button) return; // click wasn't on an action button - ignore

    const card = button.closest(".book-card");
    const id = card.dataset.id;
    const action = button.dataset.action;

    if (action === "delete") {
        deleteBook(id);
    } else if (action === "edit") {
        editingId = id;
        render();
    } else if (action === "cancel") {
        editingId = null;
        render();
    }
});

bookListEl.addEventListener("submit", (event) => {
    const form = event.target.closest("form[data-action='save']");
    if (!form) return;

    event.preventDefault();

    const card = form.closest(".book-card");
    const id = card.dataset.id;
    const book = books.find(b => b.id === id);
    if (!book) return;

    const title  = form.querySelector("[name='title']").value.trim();
    const author = form.querySelector("[name='author']").value.trim();
    const status = form.querySelector("[name='status']").value;

    if (!title || !author) {
        alert("Title and author are required.");
        return;
    }

    book.title = title;
    book.author = author;
    book.status = status;

    editingId = null;
    const saved = saveBooks();
    render();
    if (!saved) alert("⚠️ Couldn't save - changes won't persist after refresh.");
});

function deleteBook(id) {
    if (!confirm("Delete this book?")) return;

    // Remove from state by filtering OUT the matching id
    const index = books.findIndex((b) => b.id === id);
    if (index !== -1) books.splice(index, 1);
    
    const saved = saveBooks();

    render();

    if (!saved) alert("⚠️ Couldn't save - changes won't persist after refresh.");
}

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