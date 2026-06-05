const express = require("express");
const router = express.Router();

const auth = require("../middleware/auth");
const transactionController = require("../controllers/transactionController");

router.get("/create", auth, transactionController.createPage);
router.post("/create", auth, transactionController.processTransaction);

module.exports = router;
