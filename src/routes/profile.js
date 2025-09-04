// routes/profile.js
const express = require("express");
const auth = require("../middlewares/auth");
const profileRouter = express.Router();

// Protected route - requires valid JWT token
profileRouter.get("/api/profile", auth, async (req, res) => {
  try {
    // req.user is available from the auth middleware
    res.json({
      message: "Profile data",
      user: req.user,
    });
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
});

module.exports = { profileRouter };
