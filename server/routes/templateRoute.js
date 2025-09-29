import express from "express";
import Template from "../model/Template.js"; 

const router = express.Router();

// Get template
router.get("/:documentType", async (req, res) => {
  try {
    const template = await Template.findOne({ documentType: req.params.documentType });
    res.json(template);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Update template
router.put("/:documentType", async (req, res) => {
  try {
    const updatedTemplate = await Template.findOneAndUpdate(
      { documentType: req.params.documentType },
      {
        formats: req.body.formats,
        updatedBy: req.body.updatedBy,
        dateUpdated: Date.now(),
      },
      { new: true, upsert: true }
    );

    res.json({
      message: "Template updated successfully",
      template: updatedTemplate,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router; 

