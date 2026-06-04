const express = require("express");
const router = express.Router();

const auth = require("../middleware/auth");
const customerController = require("../controllers/customerController");

router.get("/", auth, customerController.index);

router.get("/create", auth, customerController.createPage);

router.post("/create", auth, customerController.store);

module.exports = router;
