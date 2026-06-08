const express = require("express");
const router = express.Router();

const auth = require("../middleware/auth");
const transactionController = require("../controllers/transactionController");

router.get("/create", auth, transactionController.createPage);
router.post("/create", auth, transactionController.processTransaction);
router.get("/history", auth, transactionController.historyPage);
router.get("/alerts", auth, transactionController.alertsPage);
router.get("/fraud-dashboard", auth, transactionController.fraudDashboard);
router.get("/alerts/:id", auth, transactionController.viewAlert);
router.get("/alerts/resolve/:id", auth, transactionController.resolveAlert);
router.get("/alerts/review/:id", auth, transactionController.reviewAlert);


module.exports = router;
 