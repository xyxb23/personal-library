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
    conn.commit()
    conn.close()

if __name__ == "__main__":
    init_db()
    print("Database initialized.")