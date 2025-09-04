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

// Review application - accept or reject
// PUT /api/request/review/:status/:applicationId
jobRouter.put(
  "/api/request/review/:status/:applicationId",
  auth,
  async (req, res) => {
    try {
      const { status, applicationId } = req.params;
      const companyId = req.user._id;

      // Validation
      if (req.user.role !== "company") {
        return res
          .status(403)
          .json({ message: "Only companies can review applications." });
      }

      if (!["accepted", "rejected"].includes(status)) {
        return res
          .status(400)
          .json({ message: "Invalid status. Use 'accepted' or 'rejected'." });
      }

      // Find application with job details
      const application = await Application.findById(applicationId)
        .populate("jobId", "companyId title")
        .populate("candidateId", "firstName lastName email");

      if (!application) {
        return res.status(404).json({ message: "Application not found." });
      }

      // Check if application is in 'interested' state
      if (application.status !== "interested") {
        return res.status(400).json({
          message: `Cannot review application with status '${application.status}'. Only 'interested' applications can be reviewed.`,
          currentStatus: application.status,
        });
      }

      // Verify company ownership
      if (application.jobId.companyId.toString() !== companyId.toString()) {
        return res.status(403).json({
          message:
            "Access denied. You can only review applications for your own jobs.",
        });
      }

      // Update application status
      application.status = status;
      // application.reviewedAt = new Date();
      await application.save();

      // Get updated status counts for dashboard
      const companyJobs = await Job.find({ companyId: companyId });
      const jobIds = companyJobs.map((job) => job._id);
      const applications = await Application.find({ jobId: { $in: jobIds } });

      const statusCounts = {
        ignored: applications.filter((app) => app.status === "ignored").length,
        interested: applications.filter((app) => app.status === "interested")
          .length,
        accepted: applications.filter((app) => app.status === "accepted")
          .length,
        rejected: applications.filter((app) => app.status === "rejected")
          .length,
        total: applications.length,
      };

      res.status(200).json({
        message: `Application ${status} successfully!`,
        application: {
          _id: application._id,
          status: application.status,
          reviewedAt: application.reviewedAt,
          candidate: application.candidateId,
          job: application.jobId,
        },
        dashboardStats: statusCounts,
      });
    } catch (error) {
      console.error("Review error:", error);
      if (error.name === "CastError") {
        return res.status(400).json({ message: "Invalid application ID." });
      }
      res.status(500).json({ message: "Server error during review process." });
    }
  }
);
module.exports = { jobRouter };
