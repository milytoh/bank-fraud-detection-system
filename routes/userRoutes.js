const express = require("express");
const router = express.Router();

const userController = require("../controllers/userController");
const { isCustomer } = require("../middleware/auth");

// dashboard
// router.get("/dashboard", isCustomer, userController.dashboard);

// transfer page
router.get("/transfer", isCustomer, userController.transferPage);

// withdraw page
router.get("/withdraw", isCustomer, userController.withdrawPage);

// submit transaction
router.post("/transfer", isCustomer, userController.transfer);
router.post("/withdraw", isCustomer, userController.withdraw);

// history
// router.get("/history", isCustomer, userController.history);

router.get("/deposit", isCustomer, userController.depositPage);
router.post("/deposit", isCustomer, userController.deposit);

router.get("/history", isCustomer, userController.transactionHistory);

module.exports = router;

 
 