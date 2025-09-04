const validateSignup = (req, res, next) => {
  const {
    firstName,
    lastName,
    email,
    password,
    role,
    gender,
    skills,
    companyName,
    industry,
  } = req.body;

  const errors = [];

  // Required fields for all users
  if (!firstName || firstName.trim().length < 3) {
    errors.push(
      "First name is required and must be at least 3 characters long"
    );
  }

  if (!lastName || lastName.trim().length < 2) {
    errors.push("Last name is required and must be at least 2 characters long");
  }

  if (!email || !email.includes("@")) {
    errors.push("Valid email is required");
  }

  if (!password || password.length < 6) {
    errors.push("Password is required and must be at least 6 characters long");
  }

  if (!role || !["company", "student"].includes(role)) {
    errors.push('Role is required and must be either "company" or "student"');
  }

  // Role-specific validations
  if (role === "student") {
    if (!gender || !["male", "female", "other"].includes(gender)) {
      errors.push(
        "Gender is required for students and must be male, female, or other"
      );
    }

    if (!skills || !Array.isArray(skills) || skills.length === 0) {
      errors.push("At least one skill is required for students");
    }
  }

  if (role === "company") {
    if (!companyName || companyName.trim().length < 2) {
      errors.push(
        "Company name is required for companies and must be at least 2 characters long"
      );
    }

    if (!industry || industry.trim().length < 2) {
      errors.push(
        "Industry is required for companies and must be at least 2 characters long"
      );
    }
  }

  // If there are errors, return them
  if (errors.length > 0) {
    return res.status(400).json({
      message: "Validation failed",
      errors: errors,
    });
  }

  // Sanitize the data (trim whitespace, lowercase email)
  req.body.firstName = firstName.trim();
  req.body.lastName = lastName.trim();
  req.body.email = email.toLowerCase().trim();

  if (companyName) req.body.companyName = companyName.trim();
  if (industry) req.body.industry = industry.trim();
  if (skills) req.body.skills = skills.map((skill) => skill.trim());

  next(); // Move to the next middleware/controller
};

module.exports = { validateSignup };
