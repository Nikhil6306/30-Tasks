# 📚 LibraryOS — Book Tracker

A full-stack Library Book Management System built with **Flask**, **MongoDB**, and a custom HTML/CSS/JS frontend.

---

## 🗂️ Project Structure

```
library-tracker/
├── app.py              # Flask backend (REST API)
├── requirements.txt    # Python dependencies
├── index.html          # Frontend (HTML + CSS + JS)
└── README.md
```

---

## 🚀 Setup & Run

### 1. Prerequisites

- Python 3.8+
- MongoDB running locally on port **27017**
  - Install: https://www.mongodb.com/try/download/community
  - Start: `mongod` (or `brew services start mongodb-community` on macOS)

### 2. Install Python dependencies

```bash
pip install -r requirements.txt
```

### 3. Start the Flask backend

```bash
python app.py
```

The API runs at → `http://localhost:5000`

### 4. Open the frontend

Simply open `index.html` in your browser:

```bash
# macOS
open index.html

# Linux
xdg-open index.html

# Windows
start index.html
```

> ⚠️ The frontend calls `http://localhost:5000/api` — make sure Flask is running before opening the page.

---

## 📡 REST API Reference

| Method | Endpoint            | Description              |
|--------|---------------------|--------------------------|
| GET    | `/api/books`        | Get all books (+ search/filter) |
| POST   | `/api/books`        | Add a new book           |
| GET    | `/api/books/<id>`   | Get a single book        |
| PUT    | `/api/books/<id>`   | Update a book            |
| DELETE | `/api/books/<id>`   | Delete a book            |
| GET    | `/api/stats`        | Dashboard statistics     |

### Query Parameters for GET `/api/books`
- `?search=gatsby` — search by title, author, or ISBN
- `?category=Fiction` — filter by category

### Example Book Payload (POST/PUT)
```json
{
  "title":    "The Great Gatsby",
  "author":   "F. Scott Fitzgerald",
  "isbn":     "978-0-7432-7356-5",
  "category": "Fiction",
  "quantity": 5
}
```

---

## 🎨 Features

- **Add books** with title, author, ISBN, category, and quantity
- **Edit books** inline — click Edit on any row
- **Delete books** with a confirmation modal
- **Search** by title, author, or ISBN (live debounced search)
- **Filter** by category
- **Dashboard stats** — total titles, total copies, number of categories
- **Duplicate ISBN** prevention
- Toast notifications for all actions
- Quantity indicators (red = low stock ≤ 2)

---

## 🛠️ Tech Stack

| Layer     | Technology         |
|-----------|--------------------|
| Backend   | Flask (Python)     |
| Database  | MongoDB (pymongo)  |
| Frontend  | HTML5 + CSS3 + JS  |
| CORS      | flask-cors         |
