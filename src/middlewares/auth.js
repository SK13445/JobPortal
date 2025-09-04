const jwt = require("jsonwebtoken");
const User = require("../models/User");

const auth = async (req, res, next) => {
  try {
    // 1. Get token from cookie
    const token = req.cookies.token;

    if (!token) {
      return res.status(401).json({
        message: "Access denied. No token provided.",
      });
    }

    // 2. Verify token
    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET || "Job@Portal$12345"
    );

    // 3. Find user and attach to request
    const user = await User.findById(decoded.id).select("-password");

    if (!user) {
      return res.status(401).json({
        message: "Token is not valid.",
      });
    }

    req.user = user;
    next();
  } catch (error) {
    res.status(401).json({
      message: "Token is not valid.",
    });
  }
};

module.exports = auth;
