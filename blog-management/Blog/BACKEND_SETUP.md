# Blog Management System - Backend Setup Guide

## Prerequisites

- Python 3.8 or higher
- MongoDB running on localhost:27017 (default)
- pip (Python package manager)

## Installation & Setup

### 1. Create Virtual Environment

```bash
# Windows
python -m venv venv
venv\Scripts\activate

# Linux/Mac
python3 -m venv venv
source venv/bin/activate
```

### 2. Install Dependencies

```bash
pip install -r requirements.txt
```

### 3. Start MongoDB

Make sure MongoDB is running on `localhost:27017`

**Windows (if installed as service):**

```bash
mongod
```

**Or using MongoDB Community:**

```bash
mongod --dbpath "C:\data\db"
```

**Linux/Mac:**

```bash
mongod
```

### 4. Run Flask Backend

```bash
python app.py
```

The application will start at: `http://localhost:5000`

## Project Structure

```
Blog/
├── app.py                 # Flask backend with MongoDB integration
├── templates/
│   └── index.html        # Frontend HTML
├── static/
│   ├── css/
│   │   └── style.css     # Styling
│   └── js/
│       └── main.js       # Frontend JavaScript
├── requirements.txt      # Python dependencies
└── README.md            # This file
```

## API Endpoints

### Get All Posts

```
GET /api/posts
Response: [
  {
    "_id": "...",
    "title": "Post Title",
    "author": "Author Name",
    "content": "Post content...",
    "created_at": "2024-01-01T00:00:00",
    "updated_at": "2024-01-01T00:00:00"
  }
]
```

### Create New Post

```
POST /api/posts
Body: {
  "title": "Post Title",
  "author": "Author Name",
  "content": "Post content..."
}
```

### Update Post

```
PUT /api/posts/{post_id}
Body: {
  "title": "Updated Title",
  "author": "Updated Author",
  "content": "Updated content..."
}
```

### Delete Post

```
DELETE /api/posts/{post_id}
```

## Configuration

You can customize MongoDB connection by creating a `.env` file (see `.env.example`):

```
MONGO_URI=mongodb://localhost:27017/
DB_NAME=blog_db
```

## Troubleshooting

**MongoDB Connection Error:**

- Ensure MongoDB is running: `mongod`
- Check if it's listening on localhost:27017
- Verify MONGO_URI in .env file

**Port 5000 Already in Use:**

- Change port in app.py: `app.run(port=5001)`
- Or kill the process using port 5000

**Module Not Found:**

- Verify virtual environment is activated
- Run `pip install -r requirements.txt` again

## Features

✅ Create, Read, Update, Delete (CRUD) blog posts
✅ MongoDB integration for data persistence
✅ RESTful API
✅ Modern web interface with responsive design
✅ Real-time post updates
