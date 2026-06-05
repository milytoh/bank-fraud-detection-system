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



// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));


app.use(
  session({
    secret: "fraudshield_secret_key",
    resave: false,
    saveUninitialized: false,
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
  res.send("FraudShield System Running 🚀");
});


app.use((req, res, next) => {
  res.locals.success = req.flash("success");
  res.locals.error = req.flash("error");

  next();
});
app.use("/auth", authRoutes);
app.use("/dashboard", dashboardRoutes);
app.use("/customers", customerRoutes);
app.use("/accounts", accountRoutes);

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
