# 📚 Daybook — Student Study Planner

A modern full-stack web application to help students organize subjects, assignments, deadlines, and completion status — all in one clean workspace.

![Node.js](https://img.shields.io/badge/Node.js-22.x-green?logo=node.js)
![Express](https://img.shields.io/badge/Express-5.x-blue?logo=express)
![SQLite](https://img.shields.io/badge/SQLite-3.x-blue?logo=sqlite)

---

## 🌐 https://study-planner-0tx9.onrender.com/

---

## ✨ Features

- 📖 **Subject Management** — Add and delete subjects
- 📝 **Assignment Tracking** — Full CRUD operations
- 📊 **Dashboard Summary** — Total, pending, in-progress, completed, due soon, overdue
- 🔍 **Search & Filter** — Find assignments by title, subject, or status
- 🎨 **Responsive Design** — Works on desktop, tablet, and mobile
- ⚡ **Real-time Updates** — Dashboard auto-refreshes on changes
- 🗄️ **Auto-initializing Database** — SQLite schema + seed data on first run

---

## 🛠️ Tech Stack

| Layer | Technology |
|---|---|
| **Frontend** | HTML5, CSS3, Vanilla JavaScript |
| **Backend** | Node.js, Express.js 5.x |
| **Database** | SQLite (better-sqlite3) |
| **Deployment** | ByteXL, Render, GitHub |
| **Tools** | Git, VS Code, curl |

---

## 📁 Project Structure

study-planner/
├── index.html # Frontend — main page
├── script.js # Frontend — logic & API calls
├── style.css # Frontend — styling
├── server.js # Backend — Express server
├── routes/
│ └── assignmentRoutes.js # API routes
├── assignments.sql # Database schema + seed data
├── package.json # Dependencies
├── Dockerfile # Container config
├── .gitignore # Git ignore rules
└── README.md # This file


---

## 🚀 Run Locally

### Prerequisites
- Node.js 22.x or higher
- npm

### Steps

# 1. Clone the repository
git clone https://github.com/danya191106/study-planner.git
cd study-planner

# 2. Install dependencies
npm install

# 3. Start the server
node server.js

# 4. Open in browser
# http://localhost:5000

The SQLite database auto-initializes with 3 sample subjects and 3 sample assignments.

##🔌 API Endpoints
Method	   Endpoint  	             Description
GET	     /api/subjects	         List all subjects
POST	   /api/subjects 	         Create a new subject
DELETE	 /api/subjects/:id	     Delete a subject
GET	     /api/assignments	       List all assignments (with filters)
POST	   /api/assignments	       Create a new assignment
PATCH	   /api/assignments/:id   	Update an assignment
DELETE	 /api/assignments/:id	    Delete an assignment
GET	     /api/dashboard/summary	  Dashboard statistics

### Query Parameters (for /api/assignments)

?search= — Search by title or subject name

?status= — Filter by pending, in-progress, or completed

?subjectId= — Filter by subject ID

###🎯 What I Learned

Building a full-stack app with REST API architecture

MySQL → SQLite migration without sudo/root access

Debugging network issues using Chrome DevTools (Network tab)

Dynamic path resolution for proxy-based deployments

Cloud deployment on Render + ByteXL

Git workflow — branching, commits, device authentication

Docker basics for containerized deployment

##👩‍💻 Author
Danya Loganathan

GitHub: @danya191106

Email: danyaloganthan19@gmail.com
