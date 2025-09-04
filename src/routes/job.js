const express = require("express");
const Job = require("../models/Job");
const auth = require("../middlewares/auth"); // Make sure path is correct
const Application = require("../models/application");

const jobRouter = express.Router();

// Create job - only for companies
jobRouter.post("/api/jobs", auth, async (req, res) => {
  try {
    // Check if user is a company
    if (req.user.role !== "company") {
      return res.status(403).json({
        message: "Access denied. Only companies can create jobs.",
      });
    }

    const {
      title,
      description,
      requiredSkills,
      location,
      jobType,
      experienceLevel,
    } = req.body;

    // Validation
    const errors = [];

    if (!title || title.trim().length < 2) {
      errors.push(
        "Job title is required and must be at least 2 characters long"
      );
    }

    if (!description || description.trim().length < 10) {
      errors.push(
        "Job description is required and must be at least 10 characters long"
      );
    }

    if (
      !requiredSkills ||
      !Array.isArray(requiredSkills) ||
      requiredSkills.length === 0
    ) {
      errors.push("At least one required skill is needed");
    }

    if (!location || location.trim().length < 2) {
      errors.push("Location is required");
    }

    if (
      !jobType ||
      !["full-time", "part-time", "contract", "internship"].includes(jobType)
    ) {
      errors.push(
        "Valid job type is required (full-time, part-time, contract, internship)"
      );
    }

    if (
      !experienceLevel ||
      !["entry", "mid", "senior", "lead"].includes(experienceLevel)
    ) {
      errors.push(
        "Valid experience level is required (entry, mid, senior, lead)"
      );
    }

    if (errors.length > 0) {
      return res.status(400).json({
        message: "Validation failed",
        errors: errors,
      });
    }

    // Create new job
    const newJob = new Job({
      title: title.trim(),
      description: description.trim(),
      companyId: req.user._id, // From authenticated user
      requiredSkills: requiredSkills.map((skill) => skill.trim()),
      location: location.trim(),
      jobType,
      experienceLevel,
    });

    // Save to database
    await newJob.save();

    // Populate company details for response
    await newJob.populate(
      "companyId",
      "companyName industry firstName lastName email"
    );

    res.status(201).json({
      message: "Job created successfully!",
      job: newJob,
    });
  } catch (error) {
    console.error("Job creation error:", error);
    res.status(500).json({ message: "Server error during job creation" });
  }
});

// To Get the job-Feed for the company

// Get all applications for company's jobs
// GET /api/applications/my-jobs
// jobRouter.get("/api/applications/my-jobs", auth, async (req, res) => {
//   try {
//     const companyId = req.user._id; // From authenticated user

//     // Check if user is a company
//     if (req.user.role !== "company") {
//       return res.status(403).json({
//         message: "Access denied. Only companies can view job applications.",
//       });
//     }

//     // Find all applications for jobs posted by this company
//     // const applications = await Application.find()
//     //   .populate({
//     //     path: "jobId",
//     //     match: { companyId: companyId }, // Only include jobs from this company
//     //     select:
//     //       "title description requiredSkills location jobType experienceLevel",
//     //   })
//     //   .populate({
//     //     path: "candidateId",
//     //     select: "firstName lastName email skills gender profilePicture resume",
//     //   })
//     //   .populate({
//     //     path: "companyId",
//     //     select: "companyName industry",
//     //   })
//     //   .sort({ createdAt: -1 }); // Newest applications first

//     const applications = await Application.find()
//       .populate({
//         path: "jobId",
//         match: { companyId: companyId }, // Only include jobs from this company
//         select:
//           "title description requiredSkills location jobType experienceLevel",
//       })
//       .populate({
//         path: "candidateId",
//         select: "firstName lastName email skills gender profilePicture resume",
//       })
//       .sort({ createdAt: -1 }); // Newest applications first
//     console.log(applications);

//     // Filter out applications where jobId is null (jobs from other companies)
//     const filteredApplications = applications.filter(
//       (app) => app.jobId !== null
//     );

//     // Group applications by job title and status
//     // const applicationsByJob = {};
//     const statusCounts = {
//       awaited: 0,
//       interested: 0,
//       accepted: 0,
//       rejected: 0,
//       total: filteredApplications.length,
//     };

//     // filteredApplications.forEach((app) => {
//     //   statusCounts[app.status] = (statusCounts[app.status] || 0) + 1;

//     //   const jobTitle = app.jobId.title;
//     //   if (!applicationsByJob[jobTitle]) {
//     //     applicationsByJob[jobTitle] = [];
//     //   }
//     //   applicationsByJob[jobTitle].push(app);
//     // });

//     res.status(200).json({
//       message: "Applications retrieved successfully!",
//       totalApplications: filteredApplications.length,
//       statusCounts: statusCounts,
//       applications: filteredApplications,
//       // applicationsByJob: applicationsByJob,
//     });
//   } catch (error) {
//     console.error("Get applications error:", error);
//     res
//       .status(500)
//       .json({ message: "Server error while fetching applications." });
//   }
// });

// Get all applications for company's jobs
jobRouter.get("/api/applications/my-jobs", auth, async (req, res) => {
  try {
    const companyId = req.user._id;

    if (req.user.role !== "company") {
      return res.status(403).json({
        message: "Access denied. Only companies can view job applications.",
      });
    }

    // First, find all jobs posted by this company
    const companyJobs = await Job.find({ companyId: companyId }).select("_id");
    console.log(`1st ${companyJobs}`);
    const jobIds = companyJobs.map((job) => job._id);
    console.log(` 2nd ${jobIds}`);

    // Then find applications for those jobs
    const applications = await Application.find({ jobId: { $in: jobIds } })
      .populate({
        path: "jobId",
        select:
          "title description requiredSkills location jobType experienceLevel",
      })
      .populate({
        path: "candidateId",
        select: "firstName lastName email skills gender profilePicture resume",
      })
      .sort({ createdAt: -1 });

    console.log(`3rd ${applications}`);

    const statusCounts = {
      awaited: 0,
      interested: 0,
      accepted: 0,
      rejected: 0,
      total: applications.length,
    };

    applications.forEach((app) => {
      statusCounts[app.status] = (statusCounts[app.status] || 0) + 1;
    });

    res.status(200).json({
      message: "Applications retrieved successfully!",
      totalApplications: applications.length,
      statusCounts: statusCounts,
      applications: applications,
    });
  } catch (error) {
    console.error("Get applications error:", error);
    res
      .status(500)
      .json({ message: "Server error while fetching applications." });
  }
});

module.exports = { jobRouter };
