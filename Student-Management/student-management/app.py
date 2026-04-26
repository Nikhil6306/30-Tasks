from flask import Flask, request, jsonify, render_template
from pymongo import MongoClient
from bson.objectid import ObjectId
from bson.errors import InvalidId
import os

app = Flask(__name__, template_folder=".", static_folder=".", static_url_path="/")

# ── MongoDB Connection ──────────────────────────────────────────────────────
MONGO_URI = os.environ.get("MONGO_URI", "mongodb://localhost:27017/")
client = MongoClient(MONGO_URI)
db = client["student_management"]
students_col = db["students"]

# ── Helper ──────────────────────────────────────────────────────────────────
def student_serializer(student):
    return {
        "_id":     str(student["_id"]),
        "name":    student.get("name", ""),
        "roll_no": student.get("roll_no", ""),
        "email":   student.get("email", ""),
        "branch":  student.get("branch", ""),
        "year":    student.get("year", ""),
        "cgpa":    student.get("cgpa", ""),
        "phone":   student.get("phone", ""),
    }

# ── Frontend ────────────────────────────────────────────────────────────────
@app.route("/")
def index():
    return render_template("index.html")

# ── CREATE ───────────────────────────────────────────────────────────────────
@app.route("/api/students", methods=["POST"])
def create_student():
    data = request.get_json()
    required = ["name", "roll_no", "email", "branch", "year"]
    for field in required:
        if not data.get(field):
            return jsonify({"error": f"'{field}' is required"}), 400

    # Check duplicate roll number
    if students_col.find_one({"roll_no": data["roll_no"]}):
        return jsonify({"error": "Roll number already exists"}), 409

    result = students_col.insert_one({
        "name":    data["name"].strip(),
        "roll_no": data["roll_no"].strip(),
        "email":   data["email"].strip(),
        "branch":  data["branch"].strip(),
        "year":    data["year"],
        "cgpa":    data.get("cgpa", ""),
        "phone":   data.get("phone", ""),
    })
    student = students_col.find_one({"_id": result.inserted_id})
    return jsonify({"message": "Student created successfully", "student": student_serializer(student)}), 201

# ── READ ALL ─────────────────────────────────────────────────────────────────
@app.route("/api/students", methods=["GET"])
def get_all_students():
    search = request.args.get("search", "").strip()
    branch = request.args.get("branch", "").strip()
    year   = request.args.get("year", "").strip()

    query = {}
    if search:
        query["$or"] = [
            {"name":    {"$regex": search, "$options": "i"}},
            {"roll_no": {"$regex": search, "$options": "i"}},
            {"email":   {"$regex": search, "$options": "i"}},
        ]
    if branch:
        query["branch"] = branch
    if year:
        query["year"] = year

    students = list(students_col.find(query).sort("roll_no", 1))
    return jsonify([student_serializer(s) for s in students]), 200

# ── READ ONE ─────────────────────────────────────────────────────────────────
@app.route("/api/students/<student_id>", methods=["GET"])
def get_student(student_id):
    try:
        student = students_col.find_one({"_id": ObjectId(student_id)})
    except InvalidId:
        return jsonify({"error": "Invalid ID format"}), 400
    if not student:
        return jsonify({"error": "Student not found"}), 404
    return jsonify(student_serializer(student)), 200

# ── UPDATE ───────────────────────────────────────────────────────────────────
@app.route("/api/students/<student_id>", methods=["PUT"])
def update_student(student_id):
    try:
        oid = ObjectId(student_id)
    except InvalidId:
        return jsonify({"error": "Invalid ID format"}), 400

    data = request.get_json()
    if not data:
        return jsonify({"error": "No data provided"}), 400

    # Check duplicate roll_no for OTHER students
    if "roll_no" in data:
        existing = students_col.find_one({"roll_no": data["roll_no"], "_id": {"$ne": oid}})
        if existing:
            return jsonify({"error": "Roll number already used by another student"}), 409

    update_fields = {k: v for k, v in data.items()
                     if k in ["name", "roll_no", "email", "branch", "year", "cgpa", "phone"]}

    result = students_col.update_one({"_id": oid}, {"$set": update_fields})
    if result.matched_count == 0:
        return jsonify({"error": "Student not found"}), 404

    updated = students_col.find_one({"_id": oid})
    return jsonify({"message": "Student updated successfully", "student": student_serializer(updated)}), 200

# ── DELETE ───────────────────────────────────────────────────────────────────
@app.route("/api/students/<student_id>", methods=["DELETE"])
def delete_student(student_id):
    try:
        oid = ObjectId(student_id)
    except InvalidId:
        return jsonify({"error": "Invalid ID format"}), 400

    result = students_col.delete_one({"_id": oid})
    if result.deleted_count == 0:
        return jsonify({"error": "Student not found"}), 404
    return jsonify({"message": "Student deleted successfully"}), 200

# ── STATS ────────────────────────────────────────────────────────────────────
@app.route("/api/stats", methods=["GET"])
def get_stats():
    total     = students_col.count_documents({})
    branches  = students_col.distinct("branch")
    pipeline  = [{"$group": {"_id": "$branch", "count": {"$sum": 1}}}]
    by_branch = {doc["_id"]: doc["count"] for doc in students_col.aggregate(pipeline)}
    return jsonify({"total": total, "branches": len(branches), "by_branch": by_branch}), 200

if __name__ == "__main__":
    app.run(debug=True, port=5000)
