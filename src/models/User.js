const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
  {
    firstName: {
      type: String,
      required: true,
      trim: true,
    },
    lastName: {
      type: String,
      required: true,
      trim: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    password: {
      type: String,
      required: true,
      minlength: 8,
    },
    role: {
      type: String,
      enum: ["company", "student"],
      required: true,
    },
    gender: {
      type: String,
      enum: ["male", "female", "other"],
      required: function () {
        return this.role === "student"; // Only required for students
      },
    },
    skills: {
      type: [String],
      required: function () {
        return this.role === "student"; // Only required for students
      },
    },
    companyName: {
      type: String,
      required: function () {
        return this.role === "company"; // Only required for companies
      },
      trim: true,
    },
    industry: {
      type: String,
      required: function () {
        return this.role === "company";
      },
    },
    profilePicture: {
      type: String,
      default:
        "https://upload.wikimedia.org/wikipedia/commons/8/89/Portrait_Placeholder.png",
    },
  },
  {
    timestamps: true,
  }
);

// Hash password before saving
// userSchema.pre("save", async function (next) {
//   if (!this.isModified("password")) return next();
//   this.password = await bcrypt.hash(this.password, 12);
//   next();
// });



module.exports = mongoose.model("User", userSchema);
