// Milestone 1: no logic yet - just prove the file is connected.
console.log("app.js loaded")

// --- 1. STATE: the single source of truth ---
const books = [
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

// --- 2. Grab DOM elements once ---
const bookListEl = document.querySelector("#book-list");

// --- 3. RENDER: draw the screen from state ---
function render() {
    // Build on HTML string from the array, then set it all at once
    bookListEl.innerHTML = books
        .map(
            (book) => `
            <article class="book-card" data-id="${book.id}">
                <div class="book-cover">
                ${book.cover ? `<img src="${book.cover}" alt="${book.title}" />` : "📕"}
                </div>
                <div class="book-info">
                    <h3>${book.title}</h3>
                    <p class="author">${book.author}</p>
                    <span class="badge badge--${book.status}">${book.status}</span>
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

    // Re-render and reset the form
    render();
    formEl.reset();
    document.querySelector("#title").focus(); // nice UX: ready for next entry
});