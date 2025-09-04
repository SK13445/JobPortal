const express = require("express");
const { authRouter } = require("./routes/auth");
// const cors = require("cors");
const { connectDB } = require("./config/database");
const { profileRouter } = require("./routes/profile");
const { jobRouter } = require("./routes/job");
const cookieParser = require("cookie-parser");
const { applicationRouter } = require("./routes/jobApplication");

const app = express();

// Middleware
// app.use(cors());
app.use(express.json());
app.use(cookieParser()); // ← This is required for reading cookies

// Routes
app.use("/", authRouter);
app.use("/", profileRouter);
app.use("/", jobRouter);
app.use("/", applicationRouter);
// app.use("/api/jobs", require("./routes/jobs"));
// app.use("/api/applications", require("./routes/applications"));
// app.use("/api/users", require("./routes/users"));

// Health check
app.get("/api/health", (req, res) => {
  res.json({ message: "Server is running!" });
});

connectDB()
  .then(() => {
    console.log("Established connection successfully with DATABASE.....");
    app.listen(3000, () => {
      console.log("Server is listening to the port 3000...");
    });
  })
  .catch((err) => {
    console.log("Not connected with the DATABASE");
  });
