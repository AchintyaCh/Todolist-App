require('dotenv').config();
const express = require('express');
const session = require('express-session');
const MySQLStore = require('express-mysql-session')(session);
const mysql = require('mysql2/promise');
const path = require('path');

const app = express();

// Database connection pool
const pool = mysql.createPool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

// Make pool available to routes
app.locals.pool = pool;

// Session store configuration
const sessionStore = new MySQLStore({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    clearExpired: true,
    checkExpirationInterval: 900000,
    expiration: 86400000
});

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

// Session configuration
app.use(session({
    key: 'arrange_my_list_session',
    secret: process.env.SESSION_SECRET,
    store: sessionStore,
    resave: false,
    saveUninitialized: false,
    cookie: {
        maxAge: 86400000, // 24 hours
        httpOnly: true,
        secure: false // Set to true in production with HTTPS
    }
}));

// Routes
const authRoutes = require('./routes/auth');
const profileRoutes = require('./routes/profile');
const tasksRoutes = require('./routes/tasks');
const notesRoutes = require('./routes/notes');
const calendarRoutes = require('./routes/calendar');

app.use('/api/auth', authRoutes);
app.use('/api/profile', profileRoutes);
app.use('/api/tasks', tasksRoutes);
app.use('/api/notes', notesRoutes);
app.use('/api/calendar', calendarRoutes);

// Serve HTML pages
app.get('/', (req, res) => {
    if (req.session.userId) {
        res.sendFile(path.join(__dirname, 'views', 'index.html'));
    } else {
        res.redirect('/login');
    }
});

app.get('/login', (req, res) => {
    if (req.session.userId) {
        res.redirect('/');
    } else {
        res.sendFile(path.join(__dirname, 'views', 'login.html'));
    }
});

app.get('/register', (req, res) => {
    if (req.session.userId) {
        res.redirect('/');
    } else {
        res.sendFile(path.join(__dirname, 'views', 'register.html'));
    }
});

app.get('/profile', (req, res) => {
    if (req.session.userId) {
        res.sendFile(path.join(__dirname, 'views', 'profile.html'));
    } else {
        res.redirect('/login');
    }
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ error: 'Something went wrong!' });
});

// Start server
const PORT = process.env.PORT || 3000;
const HOST = process.env.HOST || '0.0.0.0';
app.listen(PORT, HOST, () => {
    console.log(` Arrange My List is running on http://${HOST}:${PORT}`);
});

app.get("/health", (req, res) => {
  res.status(200).send("OK");
});

module.exports = app;
