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

@app.patch("/api/books/<int:book_id>")
def update_book(book_id):
    data = request.get_json(silent=True) or {}

    conn = get_db()
    row = conn.execute("SELECT * FROM books WHERE id = ?", (book_id,)).fetchone()
    if row is None:
        conn.close()
        return jsonify({"error": "book not found"}), 404
    
    # Only update fields that were provided; keep existing values otherwise
    title  = (data.get("title")  if "title"  in data else row["title"])
    author = (data.get("author") if "author" in data else row["author"])
    status = (data.get("status") if "status" in data else row["status"])
    cover  = (data.get("cover")  if "cover"  in data else row["cover"])

    title  = (title  or "").strip()
    author = (author or "").strip()
    status = (status or "").strip()
    cover  = (cover  or "").strip()

    if not title or not author:
        conn.close()
        return jsonify({"error": "title and author are required"}), 400
    
    allowed_statuses = {"owned", "reading", "read", "wishlist"}
    if status not in allowed_statuses:
        conn.close()
        return jsonify({"error": "invalid status"}), 400
    
    if cover and not (cover.startswith("http://") or cover.startswith("https://")):
        conn.close()
        return jsonify({"error": "cover must be an http(s) URL"}), 400
    
    conn.execute(
        "UPDATE books SET title = ?, author = ?, status = ?, cover = ? WHERE id = ?",
        (title, author, status, cover, book_id),
    )
    conn.commit()
    row = conn.execute("SELECT * FROM books WHERE id = ?", (book_id,)).fetchone()
    conn.close()

    return jsonify(dict(row)), 200

@app.delete("/api/books/<int:book_id>")
def delete_book(book_id):
    conn = get_db()
    row = conn.execute("SELECT id FROM books WHERE id = ?", (book_id,)).fetchone()
    if row is None:
        conn.close()
        return jsonify({"error": "book not found"}), 404
    
    conn.execute("DELETE FROM books WHERE id = ?", (book_id,))
    conn.commit()
    conn.close()

    return "", 204

if __name__ == "__main__":
    app.run(debug=True, port=5000)