const mysql = require("mysql2");

const db = mysql.createConnection({
  host: "localhost",
  user: "root",
  password: "staffxwxc",
  database: "frauddetection_db",
});

db.connect((err) => {
  if (err) {
    console.log("Database connection failed ❌", err);
  } else {
    console.log("Database connected successfully ✅");
  }
});

module.exports = db;
