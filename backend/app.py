from flask import Flask, jsonify
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

if __name__ == "__main__":
    app.run(debug=True, port=5000)