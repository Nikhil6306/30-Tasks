from flask import Flask, render_template, request, jsonify
from pymongo import MongoClient
from bson import ObjectId
from datetime import datetime
import os

app = Flask(__name__)

# MongoDB connection
MONGO_URI = os.environ.get("MONGO_URI", "mongodb://localhost:27017/")
client = MongoClient(MONGO_URI)
db = client["hostel_db"]
rooms_collection = db["room_allocations"]

def serialize_doc(doc):
    """Convert MongoDB document to JSON-serializable dict."""
    doc["_id"] = str(doc["_id"])
    if isinstance(doc.get("check_in_date"), datetime):
        doc["check_in_date"] = doc["check_in_date"].strftime("%Y-%m-%d")
    return doc

# ───────────────────────── Routes ─────────────────────────

@app.route("/")
def index():
    return render_template("index.html")

# CREATE
@app.route("/api/allocations", methods=["POST"])
def create_allocation():
    data = request.get_json()
    required = ["student_name", "room_number", "block", "floor", "check_in_date"]
    for field in required:
        if not data.get(field):
            return jsonify({"error": f"'{field}' is required"}), 400

    # Check if room is already occupied
    existing = rooms_collection.find_one({
        "room_number": data["room_number"],
        "block": data["block"]
    })
    if existing:
        return jsonify({"error": f"Room {data['room_number']} in Block {data['block']} is already allocated"}), 409

    doc = {
        "student_name": data["student_name"].strip(),
        "room_number": data["room_number"].strip(),
        "block": data["block"].strip().upper(),
        "floor": int(data["floor"]),
        "check_in_date": datetime.strptime(data["check_in_date"], "%Y-%m-%d"),
        "created_at": datetime.utcnow()
    }
    result = rooms_collection.insert_one(doc)
    doc["_id"] = str(result.inserted_id)
    doc["check_in_date"] = data["check_in_date"]
    doc.pop("created_at", None)
    return jsonify({"message": "Allocation created successfully", "data": doc}), 201

# READ ALL
@app.route("/api/allocations", methods=["GET"])
def get_all_allocations():
    search = request.args.get("search", "").strip()
    block_filter = request.args.get("block", "").strip().upper()
    floor_filter = request.args.get("floor", "").strip()

    query = {}
    if search:
        query["$or"] = [
            {"student_name": {"$regex": search, "$options": "i"}},
            {"room_number": {"$regex": search, "$options": "i"}}
        ]
    if block_filter:
        query["block"] = block_filter
    if floor_filter:
        try:
            query["floor"] = int(floor_filter)
        except ValueError:
            pass

    docs = list(rooms_collection.find(query).sort("created_at", -1))
    return jsonify([serialize_doc(d) for d in docs])

# READ ONE
@app.route("/api/allocations/<id>", methods=["GET"])
def get_allocation(id):
    try:
        doc = rooms_collection.find_one({"_id": ObjectId(id)})
    except Exception:
        return jsonify({"error": "Invalid ID"}), 400
    if not doc:
        return jsonify({"error": "Record not found"}), 404
    return jsonify(serialize_doc(doc))

# UPDATE
@app.route("/api/allocations/<id>", methods=["PUT"])
def update_allocation(id):
    data = request.get_json()
    try:
        oid = ObjectId(id)
    except Exception:
        return jsonify({"error": "Invalid ID"}), 400

    existing = rooms_collection.find_one({"_id": oid})
    if not existing:
        return jsonify({"error": "Record not found"}), 404

    # Check for room conflict (excluding current record)
    if data.get("room_number") and data.get("block"):
        conflict = rooms_collection.find_one({
            "room_number": data["room_number"],
            "block": data["block"].upper(),
            "_id": {"$ne": oid}
        })
        if conflict:
            return jsonify({"error": f"Room {data['room_number']} in Block {data['block'].upper()} is already allocated"}), 409

    update_data = {}
    if data.get("student_name"):
        update_data["student_name"] = data["student_name"].strip()
    if data.get("room_number"):
        update_data["room_number"] = data["room_number"].strip()
    if data.get("block"):
        update_data["block"] = data["block"].strip().upper()
    if data.get("floor") is not None:
        update_data["floor"] = int(data["floor"])
    if data.get("check_in_date"):
        update_data["check_in_date"] = datetime.strptime(data["check_in_date"], "%Y-%m-%d")

    rooms_collection.update_one({"_id": oid}, {"$set": update_data})
    updated = rooms_collection.find_one({"_id": oid})
    return jsonify({"message": "Updated successfully", "data": serialize_doc(updated)})

# DELETE
@app.route("/api/allocations/<id>", methods=["DELETE"])
def delete_allocation(id):
    try:
        oid = ObjectId(id)
    except Exception:
        return jsonify({"error": "Invalid ID"}), 400

    result = rooms_collection.delete_one({"_id": oid})
    if result.deleted_count == 0:
        return jsonify({"error": "Record not found"}), 404
    return jsonify({"message": "Allocation deleted successfully"})

# STATS
@app.route("/api/stats", methods=["GET"])
def get_stats():
    total = rooms_collection.count_documents({})
    blocks = rooms_collection.distinct("block")
    block_counts = []
    for b in sorted(blocks):
        count = rooms_collection.count_documents({"block": b})
        block_counts.append({"block": b, "count": count})
    floors = rooms_collection.distinct("floor")
    return jsonify({
        "total_allocations": total,
        "blocks_occupied": len(blocks),
        "block_breakdown": block_counts,
        "floors_used": sorted(floors)
    })

if __name__ == "__main__":
    app.run(debug=True, port=5000)
