from flask import Flask, request, jsonify, render_template, send_from_directory
from pymongo import MongoClient
from bson.objectid import ObjectId
from datetime import datetime
import os

app = Flask(__name__)

# Serve static files (CSS, JS)
@app.route('/style.css')
def serve_css():
    return send_from_directory('.', 'style.css')

@app.route('/app.js')
def serve_js():
    return send_from_directory('.', 'app.js')

# MongoDB Connection
MONGO_URI = os.environ.get("MONGO_URI", "mongodb://localhost:27017/")
client = MongoClient(MONGO_URI)
db = client["lms_db"]
courses_collection = db["courses"]

def serialize_course(course):
    """Convert MongoDB document to JSON-serializable dict."""
    course["_id"] = str(course["_id"])
    return course

# ──────────────────────────────────────────────
# Serve Frontend
# ──────────────────────────────────────────────
@app.route("/")
def index():
    return render_template("index.html")

# ──────────────────────────────────────────────
# CREATE Course
# ──────────────────────────────────────────────
@app.route("/api/courses", methods=["POST"])
def create_course():
    data = request.json
    required = ["title", "instructor", "description", "duration", "modules"]
    for field in required:
        if field not in data or not data[field]:
            return jsonify({"error": f"'{field}' is required"}), 400

    course = {
        "title": data["title"].strip(),
        "instructor": data["instructor"].strip(),
        "description": data["description"].strip(),
        "duration": data["duration"].strip(),
        "modules": data["modules"],   # list of {title, content}
        "created_at": datetime.utcnow().isoformat(),
        "updated_at": datetime.utcnow().isoformat(),
    }
    result = courses_collection.insert_one(course)
    course["_id"] = str(result.inserted_id)
    return jsonify({"message": "Course created successfully", "course": course}), 201

# ──────────────────────────────────────────────
# READ All Courses
# ──────────────────────────────────────────────
@app.route("/api/courses", methods=["GET"])
def get_courses():
    search = request.args.get("search", "").strip()
    query = {}
    if search:
        query = {
            "$or": [
                {"title": {"$regex": search, "$options": "i"}},
                {"instructor": {"$regex": search, "$options": "i"}},
                {"description": {"$regex": search, "$options": "i"}},
            ]
        }
    courses = [serialize_course(c) for c in courses_collection.find(query).sort("created_at", -1)]
    return jsonify(courses), 200

# ──────────────────────────────────────────────
# READ Single Course
# ──────────────────────────────────────────────
@app.route("/api/courses/<course_id>", methods=["GET"])
def get_course(course_id):
    try:
        course = courses_collection.find_one({"_id": ObjectId(course_id)})
    except Exception:
        return jsonify({"error": "Invalid course ID"}), 400
    if not course:
        return jsonify({"error": "Course not found"}), 404
    return jsonify(serialize_course(course)), 200

# ──────────────────────────────────────────────
# UPDATE Course
# ──────────────────────────────────────────────
@app.route("/api/courses/<course_id>", methods=["PUT"])
def update_course(course_id):
    try:
        oid = ObjectId(course_id)
    except Exception:
        return jsonify({"error": "Invalid course ID"}), 400

    data = request.json
    allowed = ["title", "instructor", "description", "duration", "modules"]
    update_data = {k: data[k] for k in allowed if k in data}
    if not update_data:
        return jsonify({"error": "No valid fields to update"}), 400

    update_data["updated_at"] = datetime.utcnow().isoformat()
    result = courses_collection.find_one_and_update(
        {"_id": oid},
        {"$set": update_data},
        return_document=True
    )
    if not result:
        return jsonify({"error": "Course not found"}), 404
    return jsonify({"message": "Course updated successfully", "course": serialize_course(result)}), 200

# ──────────────────────────────────────────────
# DELETE Course
# ──────────────────────────────────────────────
@app.route("/api/courses/<course_id>", methods=["DELETE"])
def delete_course(course_id):
    try:
        oid = ObjectId(course_id)
    except Exception:
        return jsonify({"error": "Invalid course ID"}), 400

    result = courses_collection.delete_one({"_id": oid})
    if result.deleted_count == 0:
        return jsonify({"error": "Course not found"}), 404
    return jsonify({"message": "Course deleted successfully"}), 200

# ──────────────────────────────────────────────
# Stats
# ──────────────────────────────────────────────
@app.route("/api/stats", methods=["GET"])
def get_stats():
    total = courses_collection.count_documents({})
    instructors = len(courses_collection.distinct("instructor"))
    pipeline = [{"$project": {"moduleCount": {"$size": "$modules"}}},
                {"$group": {"_id": None, "total": {"$sum": "$moduleCount"}}}]
    agg = list(courses_collection.aggregate(pipeline))
    total_modules = agg[0]["total"] if agg else 0
    return jsonify({"total_courses": total, "total_instructors": instructors, "total_modules": total_modules}), 200

if __name__ == "__main__":
    app.run(debug=True, port=5000)
