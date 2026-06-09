require("./config/db");
require("dotenv").config();
const express = require("express");
const app = express();
const path = require("path");
const session = require("express-session");

const authRoutes = require("./routes/authRoutes");
const dashboardRoutes = require("./routes/dashboardRoutes");
const customerRoutes = require("./routes/customerRoutes");
const accountRoutes = require("./routes/accountRoutes");
const transactionRoutes = require("./routes/transactionRoutes");
const userRoutes = require("./routes/userRoutes");



// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));


app.use(
  session({
    secret: "your_secret",
    resave: false,
    saveUninitialized: false,
    cookie: {
      maxAge: 1000 * 60 * 60, // 
    },
  }),
);
const flash = require("connect-flash");
app.use(flash());
// EJS setup
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

// Static files
app.use(express.static(path.join(__dirname, "public")));

// Test route
app.get("/", (req, res) => {


  res.render("index", {
    title: "FraudShield - Secure Banking",
    customerIsAuthenticated: req.session.user && req.session.user.role === "customer" ? true : false,
    adminIsAuthenticated: req.session.user && req.session.user.role === "admin" ? true : false,
  });
});


app.use((req, res, next) => {
  res.locals.success = req.flash("success");
  res.locals.error = req.flash("error");
res.locals.user = req.session.user || null;
  next();
});
app.use("/auth", authRoutes);
app.use("/dashboard", dashboardRoutes);
app.use("/customers", customerRoutes);
app.use("/accounts", accountRoutes);
app.use("/transactions", transactionRoutes);
app.use("/user", userRoutes);
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

