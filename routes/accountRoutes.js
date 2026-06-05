const express = require("express");
const router = express.Router();

const auth = require("../middleware/auth");
const accountController = require("../controllers/accountController");

router.get("/", auth, accountController.index);

router.get("/create", auth, accountController.createPage);

router.post("/create", auth, accountController.store);
router.get("/:id", auth, accountController.show);

module.exports = router;
