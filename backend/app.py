from flask import Flask, jsonify, request
from flask_cors import CORS
from db import get_db

app = Flask(__name__)
CORS(app)

@app.get("/api/books")
def get_books():
    conn = get_db()
    rows = conn.execute("SELECT * FROM books ORDER BY id").fetchall()
    conn.close()
    books = [dict(row) for row in rows]
    return jsonify(books)

@app.post("/api/books")
def create_book():
    data = request.get_json(silent=True) or {}

    title  = (data.get("title")  or "").strip()
    author = (data.get("author") or "").strip()
    status = (data.get("status") or "owned").strip()
    cover  = (data.get("cover")  or "").strip()

    #validation
    if not title or not author:
        return jsonify({"error": "title and author are required"}), 400

    allowed_statuses = {"owned", "reading", "read", "wishlist"}
    if status not in allowed_statuses:
        return jsonify({"error": "invalid status"}), 400
    
    if cover and not (cover.startswith("http://") or cover.startswith("https://")):
        return jsonify({"error": "cover must be an http(s) URL"}), 400
    
    conn = get_db()
    cur = conn.execute(
        "INSERT INTO books (title, author, status, cover) VALUES (?, ?, ?, ?)",
        (title, author, status, cover),
    )
    conn.commit()
    new_id = cur.lastrowid
    row = conn.execute("SELECT * FROM books WHERE id = ?", (new_id,)).fetchone()
    conn.close()

    return jsonify(dict(row)), 201

if __name__ == "__main__":
    app.run(debug=True, port=5000)