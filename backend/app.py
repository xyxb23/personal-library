from flask import Flask, jsonify
from flask_cors import CORS

app = Flask(__name__)
CORS(app) # allow the frontend (different port) to call this

@app.get("/api/books")
def get_books():
    books = [
        {"id": "1", "title": "The Hobbit", "author": "J.R.R. Tolkien", "status": "read", "cover": ""},
        {"id": "2", "title": "Dune", "author": "Frank Herbert", "status": "reading", "cover": ""}
    ]
    return jsonify(books)

if __name__ == "__main__":
    app.run(debug=True, port=5000)