# HostelOS — Room Allocation System

A full-stack hostel room management application built with **Flask**, **MongoDB**, and vanilla **HTML/CSS/JavaScript**.

---

## 🗂 Project Structure

```
hostel-system/
├── app.py                  # Flask backend + REST API
├── requirements.txt        # Python dependencies
├── templates/
│   └── index.html          # Main UI template
└── static/
    ├── css/style.css       # Stylesheet
    └── js/app.js           # Frontend logic
```

---

## ⚙️ Setup & Run

### 1. Install Dependencies

```bash
pip install -r requirements.txt
```

### 2. Start MongoDB

Make sure MongoDB is running locally:

```bash
# macOS (Homebrew)
brew services start mongodb-community

# Ubuntu/Debian
sudo systemctl start mongod

# Windows
net start MongoDB
```

MongoDB will connect to: `mongodb://localhost:27017/hostel_db`

### 3. Run the App

```bash
python app.py
```

Visit: [http://localhost:5000](http://localhost:5000)

---

## 📡 REST API Endpoints

| Method | Endpoint                  | Description              |
|--------|---------------------------|--------------------------|
| GET    | `/api/allocations`        | Fetch all allocations    |
| POST   | `/api/allocations`        | Create new allocation    |
| GET    | `/api/allocations/<id>`   | Fetch single allocation  |
| PUT    | `/api/allocations/<id>`   | Update allocation        |
| DELETE | `/api/allocations/<id>`   | Delete allocation        |
| GET    | `/api/stats`              | Get summary statistics   |

### Query Parameters (GET /api/allocations)
- `search` — filter by student name or room number
- `block` — filter by block (e.g., `A`, `B`)
- `floor` — filter by floor number

### POST/PUT Payload
```json
{
  "student_name": "Arjun Sharma",
  "room_number": "204",
  "block": "A",
  "floor": 2,
  "check_in_date": "2024-07-15"
}
```

---

## ✨ Features

- ✅ Full CRUD — Add, View, Edit, Delete room allocations
- 🔍 Live search by student name or room number
- 🔎 Filter by Block and Floor
- 📊 Real-time stats: total rooms, block breakdown
- ⚠️ Duplicate room detection (same room + block)
- 💅 Industrial dark-theme UI with animations
- 📱 Responsive for mobile screens

---

## 🗄 MongoDB Schema

**Collection:** `room_allocations`

```json
{
  "_id": ObjectId,
  "student_name": "string",
  "room_number": "string",
  "block": "string (uppercase)",
  "floor": "integer",
  "check_in_date": "ISODate",
  "created_at": "ISODate"
}
```
