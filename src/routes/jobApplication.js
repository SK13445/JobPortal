const express = require("express");
const Application = require("../models/application");
const Job = require("../models/Job");
const User = require("../models/User");
const auth = require("../middlewares/auth");

const applicationRouter = express.Router();

// Student shows interest in a job
// POST /api/request/interested/:jobId

applicationRouter.post(
  "/api/request/:status/:jobId",
  auth,
  async (req, res) => {
    try {
      const { status, jobId } = req.params;
      const studentId = req.user._id;

      // Validation
      if (req.user.role !== "student") {
        return res
          .status(403)
          .json({ message: "Only students can apply for jobs." });
      }

      //   if (status !== "interested") {
      //     return res
      //       .status(400)
      //       .json({ message: "Invalid status. Use 'interested'." });
      //   }

      // Validate status - accept both "ignored" and "interested"
      if (!["ignored", "interested"].includes(status)) {
        return res.status(400).json({
          message:
            "Invalid status. Only 'ignored' or 'interested' are allowed.",
        });
      }

      // Check if job exists and is active
      const job = await Job.findById(jobId);
      if (!job) {
        return res.status(404).json({ message: "Job not found." });
      }

      // Check for existing application
      const existingApplication = await Application.findOne({
        jobId: jobId,
        candidateId: studentId,
      });

      if (existingApplication) {
        return res.status(400).json({
          message: `You have already ${existingApplication.status} this job.`,
          currentStatus: `Your current Job Application Status is=> ${existingApplication.status} and You can't change it`,
        });
      }

      const student = await User.findById(studentId);
      const missingSkills = job.requiredSkills.filter(
        (skill) =>
          !student.skills
            .map((s) => s.toLowerCase())
            .includes(skill.toLowerCase())
      );

      // if (missingSkills.length > 0) {
      //   // You can choose to still allow application or warn the student
      //   console.log(`Student missing skills: ${missingSkills.join(", ")}`);
      // }

      // Create application
      const newApplication = new Application({
        jobId: jobId,
        candidateId: studentId,
        companyId: job.companyId,
        status: status,
      });

      await newApplication.save();

      // Populate all details
      await newApplication.populate([
        {
          path: "jobId",
          select:
            "title description requiredSkills location jobType experienceLevel applicationDeadline",
        },
        {
          path: "companyId",
          select:
            "companyName industry firstName lastName email profilePicture",
        },
        {
          path: "candidateId",
          select: "firstName lastName email skills gender",
        },
      ]);

      // res.status(201).json({
      //   message:
      //     "Interest shown successfully! The company will review your application.",
      //   application: newApplication,
      //   ...(missingSkills.length > 0 && {
      //     warning: `You might want to develop these skills: ${missingSkills.join(
      //       ", "
      //     )}`,
      //   }),
      // });
      res.status(201).json({
        message:
          "Interest shown successfully! The company will review your application.",
        application: newApplication,
      });
    } catch (error) {
      console.error("Application error:", error);

      if (error.code === 11000) {
        return res
          .status(400)
          .json({ message: "Duplicate application detected." });
      }

      if (error.name === "CastError") {
        return res.status(400).json({ message: "Invalid job ID." });
      }

      res
        .status(500)
        .json({ message: "Server error during application process." });
    }
  }
);

// const express = require("express");
// const Job = require("../models/Job");
// const Application = require("../models/Application");
// const auth = require("../middleware/auth");

// const router = express.Router();

// Get jobs feed for students (excluding previously interacted jobs)
// GET /api/jobs/feed
applicationRouter.get("/api/jobs/feed", auth, async (req, res) => {
  try {
    const studentId = req.user._id;

    // Check if user is a student
    if (req.user.role !== "student") {
      return res.status(403).json({
        message: "Access denied. Only students can view job feed.",
      });
    }

    // Get all job IDs that the student has interacted with
    const studentApplications = await Application.find({
      candidateId: studentId,
      status: { $in: ["ignored", "interested", "accepted", "rejected"] },
    }).select("jobId");

    console.log(
      `1st student Applications u will get job id ${studentApplications}`
    );

    const excludedJobIds = studentApplications.map((app) => app.jobId);
    console.log(`2nd student Applications converting ${excludedJobIds}`);

    // Find jobs that the student hasn't interacted with
    const jobs = await Job.find({
      _id: { $nin: excludedJobIds },
    })
      .populate({
        path: "companyId",
        select: "companyName industry profilePicture",
      })
      .sort({ createdAt: -1 }); // Newest jobs first

    // Optional: Add skill matching score
    const jobsWithMatchScore = jobs.map((job) => {
      const jobData = job.toObject();

      // Calculate skill match percentage
      if (req.user.skills && req.user.skills.length > 0) {
        const matchedSkills = job.requiredSkills.filter((skill) =>
          req.user.skills
            .map((s) => s.toLowerCase())
            .includes(skill.toLowerCase())
        );
        const matchPercentage =
          (matchedSkills.length / job.requiredSkills.length) * 100;

        jobData.matchScore = Math.round(matchPercentage);
        jobData.matchedSkills = matchedSkills;
      } else {
        jobData.matchScore = 0;
        jobData.matchedSkills = [];
      }

      return jobData;
    });

    // Sort by match score (highest first)
    jobsWithMatchScore.sort((a, b) => b.matchScore - a.matchScore);

    res.status(200).json({
      message: "Job feed retrieved successfully!",
      totalJobs: jobsWithMatchScore.length,
      excludedJobs: excludedJobIds.length,
      jobs: jobsWithMatchScore,
    });
  } catch (error) {
    console.error("Get job feed error:", error);
    res.status(500).json({ message: "Server error while fetching job feed." });
  }
});
module.exports = { applicationRouter };
