const bcrypt = require("bcrypt");

(async () => {
  const password = await bcrypt.hash("admin123", 10);

  console.log(password);
})();


// node createAdmin.js

// Email:
// admin@fraudshield.com

// Password:
// admin123