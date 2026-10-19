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