# EduVault — Learning Management System

A full-stack LMS built with **Flask**, **MongoDB**, and vanilla **HTML/CSS/JS**.

## Features
- ✅ Create, Read, Update, Delete courses
- ✅ Each course: title, instructor, description, duration, modules
- ✅ Live search across courses
- ✅ Module management (add/remove modules per course)
- ✅ Stats dashboard (total courses, instructors, modules)
- ✅ Responsive, dark-themed UI

---

## Project Structure
```
lms/
├── app.py               # Flask backend + REST API
├── requirements.txt     # Python dependencies
├── templates/
│   └── index.html       # Single-page frontend
└── static/
    ├── css/style.css    # Styling
    └── js/app.js        # Frontend logic
```

---

## Setup & Run

### 1. Install dependencies
```bash
pip install -r requirements.txt
```

### 2. Make sure MongoDB is running
```bash
# Local MongoDB (default: localhost:27017)
mongod --dbpath /data/db

# Or set a custom URI via environment variable:
export MONGO_URI="mongodb://localhost:27017/"
```

### 3. Run the Flask server
```bash
python app.py
```

### 4. Open in browser
```
http://localhost:5000
```

---

## API Endpoints

| Method | Endpoint              | Description          |
|--------|-----------------------|----------------------|
| GET    | `/api/courses`        | List all courses     |
| GET    | `/api/courses?search=` | Search courses      |
| POST   | `/api/courses`        | Create a course      |
| GET    | `/api/courses/<id>`   | Get single course    |
| PUT    | `/api/courses/<id>`   | Update a course      |
| DELETE | `/api/courses/<id>`   | Delete a course      |
| GET    | `/api/stats`          | Dashboard stats      |

### Course JSON Schema
```json
{
  "title": "Introduction to Python",
  "instructor": "Dr. Anita Sharma",
  "description": "A beginner-friendly Python course.",
  "duration": "8 weeks",
  "modules": [
    { "title": "Variables & Data Types", "content": "Learn Python basics" },
    { "title": "Functions", "content": "Writing reusable code" }
  ]
}
```
