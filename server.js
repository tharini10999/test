require('dotenv').config();
const express   = require('express');
const session   = require('express-session');
const passport  = require('passport');
const cors      = require('cors');
const mongoose  = require('mongoose');

const authRoutes      = require('./routes/auth');
const inventoryRoutes = require('./routes/inventory');
const marketRoutes    = require('./routes/market');
const itemsRoutes     = require('./routes/items');

const app  = express();
const PORT = process.env.PORT || 3000;

// ── Trust proxy (สำคัญสำหรับ Render) ──
app.set('trust proxy', 1);

// ── Connect MongoDB ────────────────────
if (!process.env.MONGODB_URI) {
  console.error("❌ MONGODB_URI is missing");
} else {
  mongoose.connect(process.env.MONGODB_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(() => console.log('✅ MongoDB connected!'))
  .catch(err => console.error('❌ MongoDB error:', err.message));
}

// ── Middleware ─────────────────────────
app.use(cors({
  origin: true,
  credentials: true
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(session({
  secret: process.env.SESSION_SECRET || 'defuse_th_secret',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: true,        // Render ใช้ HTTPS
    sameSite: 'none',    // ต้องใช้คู่กับ secure:true
    maxAge: 24 * 60 * 60 * 1000,
  },
}));

app.use(passport.initialize());
app.use(passport.session());

// ── Routes ─────────────────────────────
app.use('/auth',      authRoutes);
app.use('/inventory', inventoryRoutes);
app.use('/market',    marketRoutes);
app.use('/items',     itemsRoutes);

// ── Steam API ──────────────────────────
app.get("/steam/price-history", async (req, res) => {
  try {
    const name = req.query.name;

    if (!name) {
      return res.status(400).json({ error: "name is required" });
    }

    const url = `https://steamcommunity.com/market/pricehistory/?appid=730&market_hash_name=${encodeURIComponent(name)}`;

    const response = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0",
        "Accept": "application/json",
      },
    });

    if (!response.ok) {
      throw new Error(`Steam API error: ${response.status}`);
    }

    const data = await response.json();
    res.json(data);

  } catch (err) {
    console.error("Steam API error:", err.message);
    res.status(500).json({ error: "steam fetch error" });
  }
});

// ── Health Check ───────────────────────
app.get('/', (req, res) => {
  res.json({
    status: 'ok',
    message: 'Defuse TH Backend 🚀',
    mongodb: mongoose.connection.readyState === 1 ? '✅ Connected' : '❌ Disconnected',
  });
});

// ── Global Error Handler ───────────────
app.use((err, req, res, next) => {
  console.error("🔥 Server Error:", err.stack);
  res.status(500).json({ error: "Internal Server Error" });
});

// ── Start Server ──────────────────────
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});