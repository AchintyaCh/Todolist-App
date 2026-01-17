# Arrange My List - Todo List Application

A beautiful, feature-rich todo list application with a modern liquid glass theme, Kanban board, notes, and calendar functionality.

## ✨ Features

- **📋 Task Management** - Create, update, and organize your tasks
- **📌 Kanban Board** - Visual task organization with drag-and-drop
- **📝 Notes** - Keep track of important information
- **📅 Calendar** - Schedule and view tasks on a calendar
- **🔐 User Authentication** - Secure login and registration
- **👤 User Profiles** - Personalized user experience
- **🎨 Glassmorphism UI** - Modern, beautiful glass-effect design

## 🛠️ Tech Stack

- **Backend**: Node.js, Express.js
- **Database**: MySQL
- **Sessions**: express-session with MySQL store
- **Authentication**: bcrypt for password hashing
- **Environment**: dotenv for configuration

## 📦 Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/AchintyaCh/Todolist-App.git
   cd Todolist-App
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Configure environment variables**
   
   Create a `.env` file in the root directory:
   ```env
   DB_HOST=your_database_host
   DB_USER=your_database_user
   DB_PASSWORD=your_database_password
   DB_NAME=your_database_name
   SESSION_SECRET=your_session_secret
   PORT=3000
   ```

4. **Set up the database**
   
   Create the required MySQL database and tables (see `database/` folder for schema).

5. **Start the application**
   ```bash
   # Development mode
   npm run dev
   
   # Production mode
   npm start
   ```

## 🚀 Running with PM2

For production deployment, use PM2 to manage the application:

```bash
# Install PM2 globally
npm install -g pm2

# Start the application
pm2 start server.js --name "todolist-app"

# View logs
pm2 logs todolist-app

# Monitor
pm2 monit

# Restart
pm2 restart todolist-app

# Stop
pm2 stop todolist-app
```

## 📁 Project Structure

```
├── server.js           # Main application entry point
├── package.json        # Dependencies and scripts
├── .env                # Environment variables (not tracked)
├── .gitignore          # Git ignore rules
├── database/           # Database schema and migrations
├── middleware/         # Express middleware
├── routes/             # API route handlers
│   ├── auth.js         # Authentication routes
│   ├── profile.js      # User profile routes
│   ├── tasks.js        # Task management routes
│   ├── notes.js        # Notes routes
│   └── calendar.js     # Calendar routes
├── public/             # Static files (CSS, JS, images)
└── views/              # HTML templates
    ├── index.html      # Main app view
    ├── login.html      # Login page
    ├── register.html   # Registration page
    └── profile.html    # User profile page
```

## 🔗 API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/register` | Register new user |
| POST | `/api/auth/login` | User login |
| POST | `/api/auth/logout` | User logout |
| GET | `/api/tasks` | Get all tasks |
| POST | `/api/tasks` | Create new task |
| PUT | `/api/tasks/:id` | Update task |
| DELETE | `/api/tasks/:id` | Delete task |
| GET | `/api/notes` | Get all notes |
| POST | `/api/notes` | Create new note |
| GET | `/api/calendar` | Get calendar events |
| GET | `/health` | Health check endpoint |

## 📄 License

ISC

## 👨‍💻 Author

Achintya Choudhari ∂∂
