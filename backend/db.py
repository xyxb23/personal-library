import sqlite3

DB_PATH = "library.db"

def get_db():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row # lets us access columns by name
    return conn

def init_db():
    conn = get_db()
    conn.execute("""
        CREATE TABLE IF NOT EXISTS books (
            id      INTEGER PRIMARY KEY AUTOINCREMENT,
            title   TEXT NOT NULL,
            author  TEXT NOT NULL,
            status  TEXT NOT NULL DEFAULT 'owned',
            cover   TEXT NOT NULL DEFAULT ''
        )
    """)

    conn.execute("""
        CREATE TABLE IF NOT EXISTS users (
            id            INTEGER PRIMARY KEY AUTOINCREMENT,
            username      TEXT NOT NULL UNIQUE,
            password_hash TEXT NOT NULL,
            created_at    TEXT NOT NULL DEFAULT (datetime('now'))
        )
    """)

    # Migrate existing books to have a user_id (nullable for now)
    cols = [r[1] for r in conn.execute("PRAGMA table_info(books)").fetchall()]
    if "user_id" not in cols:
        conn.execute("ALTER TABLE books ADD COLUMN user_id INTEGER REFERENCES users(id)")

    # If there are existing books with no owner, create a default user and assign them
    orphaned = conn.execute("SELECT COUNT(*) FROM books WHERE user_id IS NULL").fetchone()[0]
    if orphaned > 0:
        row = conn.execute("SELECT id FROM users WHERE username = ?", ("default",)).fetchone()
        if row is None:
            from werkzeug.security import generate_password_hash
            cur = conn.execute(
                "INSERT INTO users (username, password_hash) VALUES (?, ?)",
                ("default", generate_password_hash("changeme")),
            )
            default_user_id = cur.lastrowid
        else:
            default_user_id = row[0]
        conn.execute("UPDATE books SET user_id = ? WHERE user_id IS NULL", (default_user_id,))
        print(f"Migrated {orphaned} book(s) to user 'default'.")

    conn.commit()
    conn.close()

if __name__ == "__main__":
    init_db()
    print("Database initialized.")