from flask import Flask, request, jsonify
from flask_cors import CORS
from pymongo import MongoClient
from bson import ObjectId
from bson.errors import InvalidId
import datetime
import os

app = Flask(__name__)
CORS(app)

# MongoDB Connection
MONGO_URI = os.environ.get("MONGO_URI", "mongodb://localhost:27017/")
client = MongoClient(MONGO_URI)
db = client["library_db"]
books_collection = db["books"]

def serialize_book(book):
    """Convert MongoDB document to JSON-serializable dict."""
    book["_id"] = str(book["_id"])
    return book

# ─── CREATE ───────────────────────────────────────────────────────────────────
@app.route("/api/books", methods=["POST"])
def add_book():
    data = request.get_json()
    required = ["title", "author", "isbn", "category", "quantity"]
    for field in required:
        if not data.get(field):
            return jsonify({"error": f"'{field}' is required."}), 400

    # Check duplicate ISBN
    if books_collection.find_one({"isbn": data["isbn"]}):
        return jsonify({"error": "A book with this ISBN already exists."}), 409

    book = {
        "title":    data["title"].strip(),
        "author":   data["author"].strip(),
        "isbn":     data["isbn"].strip(),
        "category": data["category"].strip(),
        "quantity": int(data["quantity"]),
        "created_at": datetime.datetime.utcnow().isoformat(),
    }
    result = books_collection.insert_one(book)
    book["_id"] = str(result.inserted_id)
    return jsonify({"message": "Book added successfully!", "book": book}), 201

# ─── READ ALL ─────────────────────────────────────────────────────────────────
@app.route("/api/books", methods=["GET"])
def get_books():
    search = request.args.get("search", "").strip()
    category = request.args.get("category", "").strip()

    query = {}
    if search:
        query["$or"] = [
            {"title":  {"$regex": search, "$options": "i"}},
            {"author": {"$regex": search, "$options": "i"}},
            {"isbn":   {"$regex": search, "$options": "i"}},
        ]
    if category:
        query["category"] = {"$regex": f"^{category}$", "$options": "i"}

    books = [serialize_book(b) for b in books_collection.find(query).sort("title", 1)]
    return jsonify({"books": books, "total": len(books)}), 200

# ─── READ ONE ─────────────────────────────────────────────────────────────────
@app.route("/api/books/<book_id>", methods=["GET"])
def get_book(book_id):
    try:
        book = books_collection.find_one({"_id": ObjectId(book_id)})
    except InvalidId:
        return jsonify({"error": "Invalid book ID."}), 400
    if not book:
        return jsonify({"error": "Book not found."}), 404
    return jsonify(serialize_book(book)), 200

# ─── UPDATE ───────────────────────────────────────────────────────────────────
@app.route("/api/books/<book_id>", methods=["PUT"])
def update_book(book_id):
    try:
        oid = ObjectId(book_id)
    except InvalidId:
        return jsonify({"error": "Invalid book ID."}), 400

    data = request.get_json()
    update_fields = {}
    for field in ["title", "author", "isbn", "category"]:
        if field in data:
            update_fields[field] = data[field].strip()
    if "quantity" in data:
        update_fields["quantity"] = int(data["quantity"])

    if not update_fields:
        return jsonify({"error": "No valid fields to update."}), 400

    # Check ISBN conflict on update
    if "isbn" in update_fields:
        existing = books_collection.find_one({"isbn": update_fields["isbn"]})
        if existing and str(existing["_id"]) != book_id:
            return jsonify({"error": "Another book with this ISBN already exists."}), 409

    result = books_collection.update_one({"_id": oid}, {"$set": update_fields})
    if result.matched_count == 0:
        return jsonify({"error": "Book not found."}), 404

    updated = serialize_book(books_collection.find_one({"_id": oid}))
    return jsonify({"message": "Book updated successfully!", "book": updated}), 200

# ─── DELETE ───────────────────────────────────────────────────────────────────
@app.route("/api/books/<book_id>", methods=["DELETE"])
def delete_book(book_id):
    try:
        oid = ObjectId(book_id)
    except InvalidId:
        return jsonify({"error": "Invalid book ID."}), 400

    result = books_collection.delete_one({"_id": oid})
    if result.deleted_count == 0:
        return jsonify({"error": "Book not found."}), 404
    return jsonify({"message": "Book deleted successfully!"}), 200

# ─── STATS ────────────────────────────────────────────────────────────────────
@app.route("/api/stats", methods=["GET"])
def get_stats():
    total_books = books_collection.count_documents({})
    total_quantity = list(books_collection.aggregate([
        {"$group": {"_id": None, "total": {"$sum": "$quantity"}}}
    ]))
    categories = books_collection.distinct("category")
    return jsonify({
        "total_titles": total_books,
        "total_copies": total_quantity[0]["total"] if total_quantity else 0,
        "total_categories": len(categories),
        "categories": categories,
    }), 200

if __name__ == "__main__":
    app.run(debug=True, port=8000)
