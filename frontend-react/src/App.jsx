import { useState, useEffect } from 'react';
import { getToken, setToken, clearToken, authHeaders } from './auth';

const API = "http://localhost:5000/api/books";
const AUTH_API = "http://localhost:5000/api/auth";

export default function App() {
  const [books, setBooks] = useState([]);
  const [loggedIn, setLoggedIn] = useState(!!getToken());
  const [authMode, setAuthMode] = useState("login"); // "login" | "register"
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [title, setTitle] = useState("");
  const [author, setAuthor] = useState("");
  const [status, setStatus] = useState("");
  const [cover, setCover] = useState("");
  const [editingId, setEditingId] = useState(null);
  const [editTitle, setEditTitle] = useState("");
  const [editAuthor, setEditAuthor] = useState("");
  const [editStatus, setEditStatus] = useState("owned");
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  // Load books whenever loggedIn becomes true
  useEffect(() => {
    if (!loggedIn) return;
    fetch(API, { headers: authHeaders() })
      .then((res) => {
        if (res.status === 401) {
          clearToken();
          setLoggedIn(false);
          throw new Error("Session expired");
        }
        return res.json();
      })
      .then(setBooks)
      .catch((err) => console.error("Failed to load books", err));
  }, [loggedIn]);

  async function handleAuth(e) {
    e.preventDefault();
    setError("");
    const endpoint = authMode === "login" ? "login" : "register";
    try {
      const res = await fetch(`${AUTH_API}/${endpoint}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Something went wrong");
        return;
      }
      setToken(data.access_token);
      setLoggedIn(true);
      setUsername("");
      setPassword("");
    } catch (err) {
      console.error("Auth error:", err);
      setError("Couldn't reach the server. Is Flask running?");
    }
  }

  async function handleAddBook(e) {
    e.preventDefault();
    if (!title.trim() || !author.trim()) {
      alert("Title and author are required.");
      return;
    }
    try {
      const res = await fetch(API, {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify({
          title: title.trim(),
          author: author.trim(),
          status,
          cover: cover.trim(),
        }),
      });
      if (res.status === 401) {
        clearToken();
        setLoggedIn(false);
        return;
      }
      if (!res.ok) throw new Error(`Server returned ${res.status}`);
      const created = await res.json();
      setBooks([...books, created]);
      setTitle("");
      setAuthor("");
      setStatus("owned");
      setCover("");
    } catch (err) {
      console.error("Failed to add book:", err);
      alert("Couldn't add book. Check the console.");
    }
  }

  async function handleDelete(id) {
    if (!confirm("Delete this book?")) return;
    try {
      const res = await fetch(`${API}/${id}`, {
        method: "DELETE",
        headers: authHeaders(),
      });
      if (res.status === 401) {
        clearToken()
        setLoggedIn(false);
        return;
      }
      if (!res.ok) throw new Error(`Server returned ${res.status}`);
      setBooks(books.filter((b) => b.id !== id));
    } catch (err) {
      console.error("Failed to delete book:", err);
      alert("Couldn't delete book. Check the console.");
    }
  }

  async function saveEdit(id) {
    if (!editTitle.trim() || !editAuthor.trim()) {
      alert("Title and author are required.");
      return;
    }
    try {
      const res = await fetch(`${API}/${id}`, {
        method: "PATCH",
        headers: authHeaders(),
        body: JSON.stringify({
          title: editTitle.trim(),
          author: editAuthor.trim(),
          status: editStatus,
        }),
      });
      if (res.status === 401) {
        clearToken();
        setLoggedIn(false);
        return;
      }
      if (!res.ok) throw new Error(`Server returned ${res.status}`);
      const updated = await res.json();
      setBooks(books.map((b) => (b.id === id ? updated : b)));
      setEditingId(null);
    } catch (err) {
      console.error("Failed to update book", err);
      alert("Couldn't save changes. Check the console.");
    }
  }

  function handleLogout() {
    clearToken();
    setLoggedIn(false);
    setBooks([]);
  }

  function startEdit(book) {
    setEditingId(book.id);
    setEditTitle(book.title);
    setEditAuthor(book.author);
    setEditStatus(book.status);
  }

  function cancelEdit() {
    setEditingId(null);
  }

  if (!loggedIn) {
    return (
      <div style={{ maxWidth: 360, margin: "3rem auto", padding: "1.5rem" }}>
        <h2>{authMode === "login" ? "Log in" : "Register"}</h2>
        <form onSubmit={handleAuth} style={{ display: "flex", flexDirection: "column", gap: "0.4rem" }}>
          <input
            placeholder="Username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            required
          />
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
          <button type="submit">{authMode === "login" ? "Log in" : "Register"}</button>
        </form>
        {error && <p style={{ color: "red" }}>{error}</p>}
        <p>
          {authMode === "login" ? "No account? " : "Have an account? "}
          <button
            type="button"
            onClick={() => setAuthMode(authMode === "login" ? "register" : "login" )}
            style={{ background: "none", border: 0, coloe: "blue", cursor: "pointer" }}
          >
            {authMode === "login" ? "Register" : "Log in"}
          </button>
        </p>
      </div>
    );
  }

  const visibleBooks = books.filter((book) => {
    const matchesSearch = 
      book.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      book.author.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === "all" || book.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div style={{ padding: "1.5rem" }}>
      <header style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <h1>📚 My Library</h1>
        <button onClick={handleLogout}>Log out</button>
      </header>
      <div style={{ display: "flex", gap: "0.5rem", marginBottom: "1rem" }}>
        <input
          placeholder="Search title or author..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          style={{ flex: 1 }}
        />
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
          <option value="all">All</option>
          <option value="owned">Owned</option>
          <option value="reading">Reading</option>
          <option value="read">Read</option>
          <option value="wishlist">Wishlist</option>
        </select>
      </div>
      <form onSubmit={handleAddBook} style={{ display: "flex", gap: "0.5rem", marginBottom: "1rem", flexWrap: "wrap" }}>
        <input
          placeholder="Title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          required
        />
        <input
          placeholder="Author"
          value={author}
          onChange={(e) => setAuthor(e.target.value)}
          required
        />
        <select value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="owned">Owned</option>
          <option value="reading">Reading</option>
          <option value="read">Read</option>
          <option value="wishlist">Wishlist</option>
        </select>
        <input
          placeholder="Cover URL (optional)"
          value={cover}
          onChange={(e) => setCover(e.target.value)}
        />
        <button type="submit">Add</button>
      </form>
      {visibleBooks.length === 0 ? (
        <p>No matching books.</p>
      ) : (
        visibleBooks.map((book) => (
          <div key={book.id} style={{ border: "1px solid #ddd", padding: "0.75rem", marginBottom: "0.5rem", borderRadius: 8 }}>
            {editingId === book.id ? (
              // -- Edit mode --
              <div style={{ display: "flex", flexDirection: "column", gap: "0.3rem" }}>
                <input value={editTitle} onChange={(e) => setEditTitle(e.target.value)} />
                <input value={editAuthor} onChange={(e) => setEditAuthor(e.target.value)} />
                <select value={editStatus} onChange={(e) => setEditStatus(e.target.value)}>
                  <option value="owned">Owned</option>
                  <option value="reading">Reading</option>
                  <option value="read">Read</option>
                  <option value="wishlist">Wishlist</option>
                </select>
                <div style={{ display: "flex", gap: "0.4rem" }}>
                  <button onClick={() => saveEdit(book.id)}>Save</button>
                  <button onClick={cancelEdit}>Cancel</button>
                </div>
              </div>
            ) : (
              // -- Display mode --
              <>
                <h3 style={{ margin: 0 }}>{book.title}</h3>
                <p style={{ margin: "0.2rem 0" }}>{book.author}</p>
                <span>{books.status}</span>
                <div style={{ display: "flex", gap: "0.4rem", marginTop: "0.5rem" }}>
                  <button onClick={() => startEdit(book)}>Edit</button>
                  <button onClick={() => handleDelete(book.id)}>Delete</button>
                </div>
              </>
            )}
          </div>
        ))
      )}
    </div>
  );
}