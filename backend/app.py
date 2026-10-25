from flask import Flask, jsonify, request
from flask_cors import CORS
from db import get_db
from flask_jwt_extended import (
    JWTManager, create_access_token, jwt_required, get_jwt_identity
)
from werkzeug.security import (generate_password_hash, check_password_hash)

app = Flask(__name__)
app.config["JWT_SECRET_KEY"] = "dev-secret-change-in-production"
CORS(app)
jwt = JWTManager(app)

@app.post("/api/auth/register")
def register():
    data = request.get_json(silent=True) or {}
    username = (data.get("username") or "").strip()
    password = (data.get("password") or "").strip()

    if not username or not password:
        return jsonify({"error": "username and password are required"}), 400
    if len(password) < 6:
        return jsonify({"error": "password must be at least 6 characters"}), 400
    
    conn = get_db()
    existing = conn.execute(
        "SELECT id FROM users WHERE username = ?", (username,)
    ).fetchone()
    if existing:
        conn.close()
        return jsonify({"error": "username already taken"}), 409
    
    password_hash = generate_password_hash(password)
    cur = conn.execute(
        "INSERT INTO users (username, password_hash) VALUES (?, ?)",
        (username, password_hash),
    )
    conn.commit()
    user_id = cur.lastrowid
    conn.close()

    # Log the in immediately by returning a token
    token = create_access_token(identity=str(user_id))
    return jsonify({"access_token": token, "user_id": user_id, "username": username}), 201

@app.post("/api/auth/login")
def login():
    data = request.get_json(silent=True) or {}
    username = (data.get("username") or "").strip()
    password = (data.get("password") or "").strip()

    if not username or not password:
        return jsonify({"error": "username and password are required"}), 400

    conn = get_db()
    row = conn.execute(
        "SELECT id, username, password_hash FROM users WHERE username = ?",
        (username,),
    ).fetchone()
    conn.close()

    if row is None or not check_password_hash(row["password_hash"], password):
        return jsonify({"error": "invalid username or password"}), 401
    
    token = create_access_token(identity=str(row["id"]))
    return jsonify({
        "access_token": token,
        "user_id": row["id"],
        "username": row["username"],
    }), 200

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
        "INSERT INTO books (title, author, status, cover, user_id) VALUES (?, ?, ?, ?, ?)",
        (title, author, status, cover, 1),
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