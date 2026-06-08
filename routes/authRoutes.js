const express = require("express");
const router = express.Router();
const authController = require("../controllers/authController");

router.get("/login", authController.getLogin);
router.post("/login", authController.login);
router.post("/register", authController.register);
router.get("/logout", authController.logout);

router.get("/customer-login", authController.showCustomerLogin);
router.post("/customer-login", authController.customerLogin);


module.exports = router;
