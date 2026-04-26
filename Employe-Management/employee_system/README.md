# Employee Management System

A full-stack web application built with Flask (Python), MongoDB, HTML, CSS, and JavaScript to manage employee records.

## Features
- Create, Read, Update, and Delete (CRUD) employee records.
- View total employees, departments, and average salary stats.
- Filter employees by department and search by name/email/position.

## Folder Structure

```
employee_system/
│
├── static/              # Frontend assets (HTML, CSS, JS)
│   ├── index.html       # Main application HTML file
│   ├── style.css        # Stylesheet for the application UI
│   └── app.js           # Frontend JavaScript logic (API calls, DOM manipulation)
│
├── app.py               # Flask backend server and API endpoints
├── run.bat              # Windows batch script to install dependencies and run the server
├── requirements.txt     # Python dependencies (optional, also handled by run.bat)
├── .env                 # Environment variables (e.g., MONGO_URI)
└── README.md            # Project documentation (this file)
```

## Prerequisites
- **Python 3.8+** installed on your system.
- **MongoDB** running locally on port `27017` (or provide a remote URI in `.env`).

## How to Run the Project

### Using `run.bat` (Windows)
The easiest way to start the project on Windows is by double-clicking the `run.bat` file.
1. Open the folder containing the project files.
2. Double-click `run.bat`.
3. The script will automatically check for Python, install required libraries (`flask`, `flask-cors`, `pymongo`, `python-dotenv`), and start the server.
4. Open your web browser and go to: `http://127.0.0.1:5000`

### Running Manually
If you prefer to run it manually from the terminal:

1. Open a terminal/command prompt in the project directory.
2. Install the required Python dependencies:
   ```bash
   pip install flask flask-cors pymongo python-dotenv
   ```
3. Run the Flask application:
   ```bash
   python app.py
   ```
4. Open your web browser and navigate to: `http://127.0.0.1:5000`

## API Endpoints
- `GET /api/employees`: Fetch all employees (supports `search` and `department` query parameters)
- `GET /api/employees/<id>`: Fetch a single employee by ID
- `POST /api/employees`: Create a new employee
- `PUT /api/employees/<id>`: Update an existing employee
- `DELETE /api/employees/<id>`: Delete an employee
- `GET /api/departments`: Get a list of distinct departments
- `GET /api/stats`: Get dashboard statistics
