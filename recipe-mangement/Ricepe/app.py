from flask import Flask, render_template, request, jsonify
from pymongo import MongoClient
from bson import ObjectId
import json
from flask_cors import CORS

app = Flask(__name__)
CORS(app)

# MongoDB Configuration
# Replace with your MongoDB URI if necessary
client = MongoClient("mongodb://localhost:27017/")
db = client["recipe_management_db"]
recipes_collection = db["recipes"]

def parse_json(data):
    return json.loads(json.dumps(data, default=str))

@app.route('/')
def index():
    return render_template('index.html')

# Get all recipes
@app.route('/api/recipes', methods=['GET'])
def get_recipes():
    try:
        recipes = list(recipes_collection.find())
        return jsonify(parse_json(recipes)), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500

# Add a new recipe
@app.route('/api/recipes', methods=['POST'])
def add_recipe():
    try:
        data = request.json
        required_fields = ['title', 'ingredients', 'steps', 'category', 'prep_time']
        
        for field in required_fields:
            if field not in data:
                return jsonify({"error": f"Missing field: {field}"}), 400
        
        result = recipes_collection.insert_one(data)
        return jsonify({"message": "Recipe added successfully", "id": str(result.inserted_id)}), 201
    except Exception as e:
        return jsonify({"error": str(e)}), 500

# Update a recipe
@app.route('/api/recipes/<id>', methods=['PUT'])
def update_recipe(id):
    try:
        data = request.json
        result = recipes_collection.update_one(
            {"_id": ObjectId(id)},
            {"$set": data}
        )
        if result.matched_count == 0:
            return jsonify({"error": "Recipe not found"}), 404
        return jsonify({"message": "Recipe updated successfully"}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500

# Delete a recipe
@app.route('/api/recipes/<id>', methods=['DELETE'])
def delete_recipe(id):
    try:
        result = recipes_collection.delete_one({"_id": ObjectId(id)})
        if result.deleted_count == 0:
            return jsonify({"error": "Recipe not found"}), 404
        return jsonify({"message": "Recipe deleted successfully"}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500

if __name__ == '__main__':
    app.run(debug=True, port=5000)
