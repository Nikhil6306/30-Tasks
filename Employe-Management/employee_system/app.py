from flask import Flask, request, jsonify
from flask_cors import CORS
from pymongo import MongoClient
from bson import ObjectId
from bson.errors import InvalidId
import os
from dotenv import load_dotenv
import datetime

load_dotenv()

app = Flask(__name__, static_folder='static', static_url_path='')
CORS(app)

# MongoDB connection
MONGO_URI = os.getenv("MONGO_URI", "mongodb://localhost:27017/")
client = MongoClient(MONGO_URI)
db = client["employee_system"]
employees_col = db["employees"]

# ── Helpers ──────────────────────────────────────────────────────────────────

def serialize(doc):
    """Convert MongoDB document to JSON-serializable dict."""
    doc["_id"] = str(doc["_id"])
    return doc

def validate_employee(data, update=False):
    """Basic field validation. Returns (is_valid, error_msg)."""
    required = ["name", "email", "department", "position", "salary"]
    if not update:
        for field in required:
            if not data.get(field):
                return False, f"'{field}' is required."
    if "salary" in data:
        try:
            data["salary"] = float(data["salary"])
            if data["salary"] < 0:
                return False, "Salary must be a non-negative number."
        except (ValueError, TypeError):
            return False, "Salary must be a valid number."
    return True, None

# ── Routes ───────────────────────────────────────────────────────────────────

@app.route("/")
def index():
    return app.send_static_file("index.html")


# GET all employees (with optional search/filter)
@app.route("/api/employees", methods=["GET"])
def get_employees():
    query = {}
    search = request.args.get("search", "").strip()
    department = request.args.get("department", "").strip()

    if search:
        query["$or"] = [
            {"name": {"$regex": search, "$options": "i"}},
            {"email": {"$regex": search, "$options": "i"}},
            {"position": {"$regex": search, "$options": "i"}},
        ]
    if department:
        query["department"] = {"$regex": f"^{department}$", "$options": "i"}

    docs = list(employees_col.find(query).sort("created_at", -1))
    return jsonify([serialize(d) for d in docs]), 200


# GET single employee
@app.route("/api/employees/<emp_id>", methods=["GET"])
def get_employee(emp_id):
    try:
        doc = employees_col.find_one({"_id": ObjectId(emp_id)})
    except InvalidId:
        return jsonify({"error": "Invalid ID format."}), 400
    if not doc:
        return jsonify({"error": "Employee not found."}), 404
    return jsonify(serialize(doc)), 200


# POST create employee
@app.route("/api/employees", methods=["POST"])
def create_employee():
    data = request.get_json()
    if not data:
        return jsonify({"error": "No data provided."}), 400

    ok, err = validate_employee(data)
    if not ok:
        return jsonify({"error": err}), 422

    # Check duplicate email
    if employees_col.find_one({"email": data["email"]}):
        return jsonify({"error": "An employee with this email already exists."}), 409

    data["created_at"] = datetime.datetime.utcnow().isoformat()
    data["updated_at"] = data["created_at"]
    result = employees_col.insert_one(data)
    doc = employees_col.find_one({"_id": result.inserted_id})
    return jsonify(serialize(doc)), 201


# PUT update employee
@app.route("/api/employees/<emp_id>", methods=["PUT"])
def update_employee(emp_id):
    try:
        oid = ObjectId(emp_id)
    except InvalidId:
        return jsonify({"error": "Invalid ID format."}), 400

    data = request.get_json()
    if not data:
        return jsonify({"error": "No data provided."}), 400

    ok, err = validate_employee(data, update=True)
    if not ok:
        return jsonify({"error": err}), 422

    # Prevent duplicate email (excluding current doc)
    if "email" in data:
        dup = employees_col.find_one({"email": data["email"], "_id": {"$ne": oid}})
        if dup:
            return jsonify({"error": "Another employee with this email already exists."}), 409

    data["updated_at"] = datetime.datetime.utcnow().isoformat()
    result = employees_col.update_one({"_id": oid}, {"$set": data})
    if result.matched_count == 0:
        return jsonify({"error": "Employee not found."}), 404

    doc = employees_col.find_one({"_id": oid})
    return jsonify(serialize(doc)), 200


# DELETE employee
@app.route("/api/employees/<emp_id>", methods=["DELETE"])
def delete_employee(emp_id):
    try:
        oid = ObjectId(emp_id)
    except InvalidId:
        return jsonify({"error": "Invalid ID format."}), 400

    result = employees_col.delete_one({"_id": oid})
    if result.deleted_count == 0:
        return jsonify({"error": "Employee not found."}), 404
    return jsonify({"message": "Employee deleted successfully."}), 200


# GET distinct departments (for filter dropdown)
@app.route("/api/departments", methods=["GET"])
def get_departments():
    depts = employees_col.distinct("department")
    return jsonify(sorted(depts)), 200


# ── Stats endpoint ────────────────────────────────────────────────────────────
@app.route("/api/stats", methods=["GET"])
def get_stats():
    total = employees_col.count_documents({})
    dept_pipeline = [
        {"$group": {"_id": "$department", "count": {"$sum": 1}}}
    ]
    dept_counts = {d["_id"]: d["count"] for d in employees_col.aggregate(dept_pipeline)}
    avg_salary_pipeline = [
        {"$group": {"_id": None, "avg": {"$avg": "$salary"}}}
    ]
    avg_result = list(employees_col.aggregate(avg_salary_pipeline))
    avg_salary = round(avg_result[0]["avg"], 2) if avg_result else 0
    return jsonify({
        "total_employees": total,
        "by_department": dept_counts,
        "average_salary": avg_salary,
    }), 200


if __name__ == "__main__":
    app.run(debug=True, port=5000)
