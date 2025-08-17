import express from "express";
import RepoMongodb from "../RepoMongodb/connection.js";
import { ObjectId } from "mongodb";

const router = express.Router();

// GET all records
router.get("/", async (req, res) => {
  try {
    const collection = RepoMongodb.collection("records");
    const results = await collection.find({}).toArray();
    res.status(200).send(results);
  } catch (err) {
    console.error(err);
    res.status(500).send("Error fetching records");
  }
});

// GET single record by Document_Id
router.get("/:id", async (req, res) => {
  try {
    const collection = RepoMongodb.collection("records");
    const query = { Document_Id: req.params.id }; // match YYYY-0001
    const result = await collection.findOne(query);

    if (!result) {
      res.status(404).send("Not Found");
    } else {
      res.status(200).send(result);
    }
  } catch (err) {
    console.error(err);
    res.status(500).send("Error fetching record");
  }
});

 
// POST new record
router.post("/", async (req, res) => {
  try {
    const collection = RepoMongodb.collection("records");

    // Current year
    const year = new Date().getFullYear();

    // Count docs for that year
    const countForYear = await collection.countDocuments({
      _id: { $regex: `^${year}-` }, // use _id instead of Document_Id
    });

    // Generate Document_Id in format YYYY-0001
    const newId = `${year}-${String(countForYear + 1).padStart(4, "0")}`;

    const newDocument = {
      _id: newId, // use custom ID as the primary key
      title: req.body.title,
      abstract: req.body.abstract,
      Submitted_at: new Date(),
      access_level: req.body.access_level,
      Authors: req.body.Authors,
      Tags: req.body.Tags,
    };

    const result = await collection.insertOne(newDocument);
    res.status(201).send(result);
  } catch (err) {
    console.error(err);
    res.status(500).send("Error adding record");
  }
});


export default router;
