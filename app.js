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

// --- 2. Grab DOM elements once ---
const bookListEl = document.querySelector("#book-list");

// --- 3. RENDER: draw the screen from state ---
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
        .map(
            (book) => `
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
            `
        )
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
        editBook(id);
    }
});

function deleteBook(id) {
    if (!confirm("Delete this book?")) return;

    // Remove from state by filtering OUT the matching id
    const index = books.findIndex((b) => b.id === id);
    if (index !== -1) books.splice(index, 1);
    
    saveBooks();

    render();
}

function editBook(id) {
    const book = books.find((b) => b.id === id);
    if (!book) return;

    // For now: simple prompt-based edit. We'll upgrade to a proper form later.
    const newTitle = prompt("New title:", book.title);
    if (!newTitle.trim()) return;
    if (newTitle === null) return; // user cancelled
    const newAuthor = prompt("New author:", book.author);
    if (!newAuthor.trim()) return;
    if (newAuthor === null) return;

    book.title = newTitle.trim() || book.title;
    book.author = newAuthor.trim() || book.author;

    saveBooks();

    render();
}

// --- 7. Search + filter listeners ---
const searchEl = document.querySelector("#search");
const filterEl = document.querySelector("#filter");

searchEl.addEventListener("input", (event) => {
    searchTerm = event.target.value.trim().toLowerCase();
    render();
});

filterEl.addEventListener("change", (event) => {
    statusFilter = event.target.value;
    render();
});