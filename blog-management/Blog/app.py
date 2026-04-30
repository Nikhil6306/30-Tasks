from flask import Flask, render_template, request, jsonify
from pymongo import MongoClient
from bson.objectid import ObjectId
from datetime import datetime
import os

app = Flask(__name__)

# MongoDB Connection
MONGO_URI = os.getenv('MONGO_URI', 'mongodb://localhost:27017/')
DB_NAME = os.getenv('DB_NAME', 'blog_db')
COLLECTION_NAME = 'posts'

try:
    client = MongoClient(MONGO_URI, serverSelectionTimeoutMS=5000)
    # Test connection
    client.admin.command('ping')
    db = client[DB_NAME]
    posts_collection = db[COLLECTION_NAME]
    print("✅ Connected to MongoDB successfully!")
except Exception as e:
    print(f"❌ Failed to connect to MongoDB: {e}")
    posts_collection = None


# Routes

@app.route('/')
def index():
    """Serve the main HTML page"""
    return render_template('index.html')


@app.route('/api/posts', methods=['GET'])
def get_posts():
    """Fetch all posts"""
    try:
        if posts_collection is None:
            return jsonify({"error": "Database connection failed"}), 500
        
        posts = list(posts_collection.find().sort('_id', -1))
        # Convert ObjectId to string for JSON serialization
        for post in posts:
            post['_id'] = str(post['_id'])
        return jsonify(posts), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route('/api/posts', methods=['POST'])
def create_post():
    """Create a new post"""
    try:
        if posts_collection is None:
            return jsonify({"error": "Database connection failed"}), 500
        
        data = request.get_json()
        
        # Validate required fields
        if not data or not data.get('title') or not data.get('author') or not data.get('content'):
            return jsonify({"error": "Missing required fields: title, author, content"}), 400
        
        new_post = {
            'title': data['title'],
            'author': data['author'],
            'content': data['content'],
            'created_at': datetime.utcnow(),
            'updated_at': datetime.utcnow()
        }
        
        result = posts_collection.insert_one(new_post)
        new_post['_id'] = str(result.inserted_id)
        
        return jsonify({
            "message": "Post created successfully",
            "_id": str(result.inserted_id)
        }), 201
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route('/api/posts/<post_id>', methods=['PUT'])
def update_post(post_id):
    """Update an existing post"""
    try:
        if posts_collection is None:
            return jsonify({"error": "Database connection failed"}), 500
        
        # Validate ObjectId
        try:
            object_id = ObjectId(post_id)
        except:
            return jsonify({"error": "Invalid post ID"}), 400
        
        data = request.get_json()
        
        # Validate required fields
        if not data or not data.get('title') or not data.get('author') or not data.get('content'):
            return jsonify({"error": "Missing required fields: title, author, content"}), 400
        
        update_data = {
            'title': data['title'],
            'author': data['author'],
            'content': data['content'],
            'updated_at': datetime.utcnow()
        }
        
        result = posts_collection.update_one(
            {'_id': object_id},
            {'$set': update_data}
        )
        
        if result.matched_count == 0:
            return jsonify({"error": "Post not found"}), 404
        
        return jsonify({
            "message": "Post updated successfully"
        }), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route('/api/posts/<post_id>', methods=['DELETE'])
def delete_post(post_id):
    """Delete a post"""
    try:
        if posts_collection is None:
            return jsonify({"error": "Database connection failed"}), 500
        
        # Validate ObjectId
        try:
            object_id = ObjectId(post_id)
        except:
            return jsonify({"error": "Invalid post ID"}), 400
        
        result = posts_collection.delete_one({'_id': object_id})
        
        if result.deleted_count == 0:
            return jsonify({"error": "Post not found"}), 404
        
        return jsonify({
            "message": "Post deleted successfully"
        }), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500


# Error handlers
@app.errorhandler(404)
def not_found(error):
    return jsonify({"error": "Not found"}), 404


@app.errorhandler(500)
def internal_error(error):
    return jsonify({"error": "Internal server error"}), 500


if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=8800)
