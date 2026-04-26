# Student Management System
### Flask + MongoDB + HTML/CSS/JavaScript

A full-stack CRUD application to manage student records.

---

## Project Structure

```
student_management/
├── app.py                  ← Flask backend + REST API
├── requirements.txt
├── templates/
│   └── index.html          ← Main frontend (single-page)
└── static/
    ├── css/
    │   └── style.css       ← Dark editorial design
    └── js/
        └── main.js         ← All CRUD logic (Fetch API)
```

---

## Setup & Run

### 1. Install MongoDB
- Download from https://www.mongodb.com/try/download/community
- Start the service: `mongod` (default port 27017)

### 2. Install Python dependencies
```bash
pip install -r requirements.txt
```

### 3. Run the Flask app
```bash
python app.py
```

### 4. Open in browser
```
http://localhost:5000
```

---

## REST API Endpoints

| Method | Endpoint                  | Description            |
|--------|---------------------------|------------------------|
| GET    | `/`                       | Serve frontend         |
| POST   | `/api/students`           | **Create** a student   |
| GET    | `/api/students`           | **Read** all students  |
| GET    | `/api/students/<id>`      | **Read** one student   |
| PUT    | `/api/students/<id>`      | **Update** a student   |
| DELETE | `/api/students/<id>`      | **Delete** a student   |
| GET    | `/api/stats`              | Dashboard statistics   |

### Query Parameters for GET /api/students
- `search` — search name, roll no, or email
- `branch` — filter by branch (CS, IT, EC, ME, CE, EE)
- `year`   — filter by year (1–4)

---

## CRUD Operations

| Operation | Frontend Trigger             | API Call                     |
|-----------|------------------------------|------------------------------|
| Create    | "Add Student" form submit    | POST /api/students            |
| Read      | Dashboard / Students view    | GET  /api/students            |
| Update    | "Edit" button → modal save   | PUT  /api/students/<id>       |
| Delete    | "Delete" button → confirm    | DELETE /api/students/<id>     |

---

## Technologies Used
- **Frontend**: HTML5, CSS3, Vanilla JavaScript (Fetch API)
- **Backend**: Python, Flask
- **Database**: MongoDB (via PyMongo)
