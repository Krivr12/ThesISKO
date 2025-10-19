import express from 'express';
import { ObjectId } from 'mongodb';
import { getDb } from '../databaseConnections/MongoDB/mongodb_connection.js';

const router = express.Router();

// Helper to get collections
const getSubmissionsCollection = () => {
  const db = getDb();
  return db.collection('submissions');
};

const getDocumentTypesCollection = () => {
  const db = getDb();
  return db.collection('document_types');
};

const getRecordsCollection = () => {
  const db = getDb();
  return db.collection('records');
};

// Helper function to generate submission ID
// Format: 2024-CCIS-BSIT-0001
const generateSubmissionId = async (department, program, year = null) => {
  const submissionsCollection = getSubmissionsCollection();
  const currentYear = year || new Date().getFullYear();
  
  // Count existing submissions for this department-program-year combination
  const prefix = `${currentYear}-${department}-${program}`;
  const existingCount = await submissionsCollection.countDocuments({
    submission_id: { $regex: `^${prefix}-` }
  });
  
  // Increment and pad with zeros (0001, 0002, etc.)
  const nextNumber = (existingCount + 1).toString().padStart(4, '0');
  
  return `${prefix}-${nextNumber}`;
};

// Helper to check for duplicate submissions
const checkDuplicates = async (title, authors) => {
  const submissionsCollection = getSubmissionsCollection();
  
  // Search for similar titles (case-insensitive)
  const titleRegex = new RegExp(title.trim(), 'i');
  
  const duplicates = await submissionsCollection.find({
    $or: [
      { title: titleRegex },
      { authors: { $in: authors } }
    ]
  }).limit(5).toArray();
  
  return duplicates;
};

// ==================== STUDENT ROUTES ====================

// POST create new submission
router.post('/create', async (req, res) => {
  try {
    const {
      submitter_email,
      document_type,
      department,
      program,
      title,
      abstract,
      authors, // Array of strings
      tags,
      adviser,
      faculty_in_charge,
      panelists, // Array of strings
      access_level,
      files // Object with file keys and S3 keys
    } = req.body;

    console.log(`📝 New submission from: ${submitter_email}`);

    // Validation
    if (!submitter_email || !document_type || !department || !program || !title) {
      return res.status(400).json({ 
        error: 'Missing required fields: submitter_email, document_type, department, program, title' 
      });
    }

    // Validate document type exists and is active
    const documentTypesCollection = getDocumentTypesCollection();
    const docType = await documentTypesCollection.findOne({ 
      type_id: document_type,
      is_active: true 
    });

    if (!docType) {
      return res.status(400).json({ 
        error: 'Invalid or inactive document type' 
      });
    }

    // Validate required files are present
    const missingFiles = docType.required_files
      .filter(f => f.required)
      .filter(f => !files[f.id] || !files[f.id].s3_key);

    if (missingFiles.length > 0) {
      return res.status(400).json({ 
        error: `Missing required files: ${missingFiles.map(f => f.label).join(', ')}` 
      });
    }

    const submissionsCollection = getSubmissionsCollection();

    // Generate submission ID
    const submission_id = await generateSubmissionId(department, program);

    // Create submission document
    const newSubmission = {
      _id: new ObjectId(),
      submission_id,
      document_type,
      
      // Submitter info
      submitter_email,
      submitted_at: new Date(),
      
      // Metadata
      title,
      abstract: abstract || null,
      authors: Array.isArray(authors) ? authors : [authors],
      tags: Array.isArray(tags) ? tags : [],
      adviser: adviser || null,
      faculty_in_charge: faculty_in_charge || null,
      panelists: Array.isArray(panelists) ? panelists : [],
      department,
      program,
      access_level: access_level || 'Restricted',
      
      // Files - transform to store upload timestamps
      files: Object.entries(files).reduce((acc, [key, value]) => {
        acc[key] = {
          s3_key: value.s3_key || value,
          uploaded_at: new Date()
        };
        return acc;
      }, {}),
      
      // Approval workflow
      chairperson_approval: {
        approved: false,
        approved_by: null,
        approved_at: null,
        rejected: false,
        rejection_reason: null,
        rejected_files: []
      },
      
      dean_approval: {
        approved: false,
        approved_by: null,
        approved_at: null,
        rejected: false,
        rejection_reason: null,
        rejected_files: []
      },
      
      // Status tracking
      status: 'pending_chairperson',
      
      // Archival
      archived: false,
      archived_at: null,
      document_id: null,
      
      created_at: new Date(),
      updated_at: new Date()
    };

    await submissionsCollection.insertOne(newSubmission);

    console.log(`✅ Submission created: ${submission_id}`);

    res.json({ 
      success: true, 
      message: 'Submission created successfully',
      submission_id,
      data: newSubmission
    });
  } catch (error) {
    console.error('❌ Error creating submission:', error);
    res.status(500).json({ error: 'Error creating submission' });
  }
});

// GET check for duplicate submissions
router.get('/check-duplicates', async (req, res) => {
  try {
    const { title, authors } = req.query;

    if (!title) {
      return res.status(400).json({ error: 'Title is required' });
    }

    const authorsArray = authors ? (Array.isArray(authors) ? authors : [authors]) : [];
    const duplicates = await checkDuplicates(title, authorsArray);

    res.json({ 
      success: true, 
      found: duplicates.length > 0,
      duplicates: duplicates.map(d => ({
        submission_id: d.submission_id,
        title: d.title,
        authors: d.authors,
        submitter_email: d.submitter_email,
        submitted_at: d.submitted_at,
        status: d.status
      }))
    });
  } catch (error) {
    console.error('❌ Error checking duplicates:', error);
    res.status(500).json({ error: 'Error checking duplicates' });
  }
});

// GET my submissions (by email)
router.get('/my-submissions/:email', async (req, res) => {
  try {
    const { email } = req.params;

    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }

    const submissionsCollection = getSubmissionsCollection();
    const submissions = await submissionsCollection
      .find({ submitter_email: email })
      .sort({ submitted_at: -1 })
      .toArray();

    res.json({ success: true, data: submissions });
  } catch (error) {
    console.error('❌ Error fetching submissions:', error);
    res.status(500).json({ error: 'Error fetching submissions' });
  }
});

// PATCH resubmit (update files after rejection)
router.patch('/:submission_id/resubmit', async (req, res) => {
  try {
    const { submission_id } = req.params;
    const { files, updated_by } = req.body;

    if (!files || Object.keys(files).length === 0) {
      return res.status(400).json({ error: 'No files provided for resubmission' });
    }

    console.log(`🔄 Resubmission for: ${submission_id}`);

    const submissionsCollection = getSubmissionsCollection();
    const submission = await submissionsCollection.findOne({ submission_id });

    if (!submission) {
      return res.status(404).json({ error: 'Submission not found' });
    }

    // Update only the files that were resubmitted
    const updatedFiles = { ...submission.files };
    Object.entries(files).forEach(([key, value]) => {
      updatedFiles[key] = {
        s3_key: value.s3_key || value,
        uploaded_at: new Date()
      };
    });

    // Reset the approval that rejected it
    let updateFields = {
      files: updatedFiles,
      updated_at: new Date()
    };

    if (submission.status === 'rejected_by_chairperson') {
      updateFields.status = 'pending_chairperson';
      updateFields['chairperson_approval.rejected'] = false;
      updateFields['chairperson_approval.rejection_reason'] = null;
      updateFields['chairperson_approval.rejected_files'] = [];
    } else if (submission.status === 'rejected_by_dean') {
      updateFields.status = 'pending_dean';
      updateFields['dean_approval.rejected'] = false;
      updateFields['dean_approval.rejection_reason'] = null;
      updateFields['dean_approval.rejected_files'] = [];
    }

    await submissionsCollection.updateOne(
      { submission_id },
      { $set: updateFields }
    );

    console.log(`✅ Resubmission processed for: ${submission_id}`);

    res.json({ 
      success: true, 
      message: 'Files resubmitted successfully',
      submission_id
    });
  } catch (error) {
    console.error('❌ Error processing resubmission:', error);
    res.status(500).json({ error: 'Error processing resubmission' });
  }
});

// ==================== CHAIRPERSON ROUTES ====================

// GET submissions pending chairperson approval
router.get('/pending-chairperson/:email', async (req, res) => {
  try {
    const { email } = req.params;

    console.log(`👨‍🏫 Fetching submissions pending chairperson approval for: ${email}`);

    // TODO: Filter by chairperson's program/department
    // For now, return all pending chairperson approvals
    const submissionsCollection = getSubmissionsCollection();
    const submissions = await submissionsCollection
      .find({ 
        status: 'pending_chairperson'
      })
      .sort({ submitted_at: -1 })
      .toArray();

    console.log(`📊 Found ${submissions.length} submissions pending chairperson approval`);

    res.json({ success: true, data: submissions });
  } catch (error) {
    console.error('❌ Error fetching chairperson submissions:', error);
    res.status(500).json({ error: 'Error fetching submissions' });
  }
});

// PATCH chairperson approve
router.patch('/:submission_id/chairperson-approve', async (req, res) => {
  try {
    const { submission_id } = req.params;
    const { chairperson_name } = req.body;

    if (!chairperson_name) {
      return res.status(400).json({ error: 'chairperson_name is required' });
    }

    console.log(`✅ Chairperson ${chairperson_name} approving: ${submission_id}`);

    const submissionsCollection = getSubmissionsCollection();

    const result = await submissionsCollection.updateOne(
      { submission_id },
      {
        $set: {
          'chairperson_approval.approved': true,
          'chairperson_approval.approved_by': chairperson_name,
          'chairperson_approval.approved_at': new Date(),
          'chairperson_approval.rejected': false,
          'chairperson_approval.rejection_reason': null,
          'chairperson_approval.rejected_files': [],
          status: 'pending_dean',
          updated_at: new Date()
        }
      }
    );

    if (result.matchedCount === 0) {
      return res.status(404).json({ error: 'Submission not found' });
    }

    console.log(`✅ Chairperson approval recorded for: ${submission_id}`);

    res.json({ 
      success: true, 
      message: 'Submission approved by chairperson. Now pending dean approval.',
      submission_id
    });
  } catch (error) {
    console.error('❌ Error recording chairperson approval:', error);
    res.status(500).json({ error: 'Error recording approval' });
  }
});

// PATCH chairperson reject
router.patch('/:submission_id/chairperson-reject', async (req, res) => {
  try {
    const { submission_id } = req.params;
    const { chairperson_name, reason, rejected_files } = req.body;

    if (!chairperson_name || !reason) {
      return res.status(400).json({ error: 'chairperson_name and reason are required' });
    }

    console.log(`❌ Chairperson ${chairperson_name} rejecting: ${submission_id}`);

    const submissionsCollection = getSubmissionsCollection();

    const rejectedFilesList = Array.isArray(rejected_files) ? rejected_files : [];

    const result = await submissionsCollection.updateOne(
      { submission_id },
      {
        $set: {
          'chairperson_approval.approved': false,
          'chairperson_approval.rejected': true,
          'chairperson_approval.rejection_reason': reason,
          'chairperson_approval.rejected_files': rejectedFilesList,
          'chairperson_approval.rejected_by': chairperson_name,
          'chairperson_approval.rejected_at': new Date(),
          status: 'rejected_by_chairperson',
          updated_at: new Date()
        }
      }
    );

    if (result.matchedCount === 0) {
      return res.status(404).json({ error: 'Submission not found' });
    }

    console.log(`✅ Chairperson rejection recorded for: ${submission_id}`);

    res.json({ 
      success: true, 
      message: 'Submission rejected. Student can resubmit the required files.',
      submission_id,
      rejected_files: rejectedFilesList
    });
  } catch (error) {
    console.error('❌ Error recording chairperson rejection:', error);
    res.status(500).json({ error: 'Error recording rejection' });
  }
});

// ==================== DEAN ROUTES ====================

// GET submissions pending dean approval
router.get('/pending-dean/:email', async (req, res) => {
  try {
    const { email } = req.params;

    console.log(`👨‍💼 Fetching submissions pending dean approval for: ${email}`);

    // TODO: Filter by dean's department
    // For now, return all pending dean approvals
    const submissionsCollection = getSubmissionsCollection();
    const submissions = await submissionsCollection
      .find({ 
        status: 'pending_dean',
        'chairperson_approval.approved': true
      })
      .sort({ submitted_at: -1 })
      .toArray();

    console.log(`📊 Found ${submissions.length} submissions pending dean approval`);

    res.json({ success: true, data: submissions });
  } catch (error) {
    console.error('❌ Error fetching dean submissions:', error);
    res.status(500).json({ error: 'Error fetching submissions' });
  }
});

// PATCH dean approve (triggers archiving)
router.patch('/:submission_id/dean-approve', async (req, res) => {
  try {
    const { submission_id } = req.params;
    const { dean_name } = req.body;

    if (!dean_name) {
      return res.status(400).json({ error: 'dean_name is required' });
    }

    console.log(`✅ Dean ${dean_name} approving: ${submission_id}`);

    const submissionsCollection = getSubmissionsCollection();
    const submission = await submissionsCollection.findOne({ submission_id });

    if (!submission) {
      return res.status(404).json({ error: 'Submission not found' });
    }

    // Validate chairperson approved first
    if (!submission.chairperson_approval?.approved) {
      return res.status(400).json({ error: 'Chairperson must approve first' });
    }

    // Update submission with dean approval
    await submissionsCollection.updateOne(
      { submission_id },
      {
        $set: {
          'dean_approval.approved': true,
          'dean_approval.approved_by': dean_name,
          'dean_approval.approved_at': new Date(),
          'dean_approval.rejected': false,
          'dean_approval.rejection_reason': null,
          'dean_approval.rejected_files': [],
          status: 'approved',
          updated_at: new Date()
        }
      }
    );

    console.log(`✅ Dean approval recorded for: ${submission_id}`);

    // Archive to records collection
    try {
      const recordsCollection = getRecordsCollection();
      
      // Generate document_id for archived record
      const document_id = `DOC-${submission_id}`;

      const archivedRecord = {
        _id: new ObjectId(),
        document_id,
        submission_id,
        title: submission.title,
        abstract: submission.abstract,
        authors: submission.authors,
        tags: submission.tags,
        access_level: submission.access_level,
        adviser: submission.adviser,
        faculty_in_charge: submission.faculty_in_charge,
        panelists: submission.panelists,
        department: submission.department,
        program: submission.program,
        document_type: submission.document_type,
        file_key: submission.files.manuscript?.s3_key, // Main manuscript file
        files: submission.files, // All files
        submitter_email: submission.submitter_email,
        created_at: new Date(),
        updated_at: new Date()
      };

      await recordsCollection.insertOne(archivedRecord);

      // Update submission with archive info
      await submissionsCollection.updateOne(
        { submission_id },
        {
          $set: {
            archived: true,
            archived_at: new Date(),
            document_id,
            status: 'archived'
          }
        }
      );

      console.log(`📦 Archived successfully: ${document_id}`);

      res.json({ 
        success: true, 
        message: 'Submission approved by dean and archived successfully',
        submission_id,
        document_id,
        archived: true
      });
    } catch (archiveError) {
      console.error('❌ Archiving failed:', archiveError);
      res.status(500).json({ 
        error: 'Approval recorded but archiving failed',
        submission_id,
        approved: true,
        archived: false
      });
    }
  } catch (error) {
    console.error('❌ Error recording dean approval:', error);
    res.status(500).json({ error: 'Error recording approval' });
  }
});

// PATCH dean reject
router.patch('/:submission_id/dean-reject', async (req, res) => {
  try {
    const { submission_id } = req.params;
    const { dean_name, reason, rejected_files } = req.body;

    if (!dean_name || !reason) {
      return res.status(400).json({ error: 'dean_name and reason are required' });
    }

    console.log(`❌ Dean ${dean_name} rejecting: ${submission_id}`);

    const submissionsCollection = getSubmissionsCollection();

    const rejectedFilesList = Array.isArray(rejected_files) ? rejected_files : [];

    const result = await submissionsCollection.updateOne(
      { submission_id },
      {
        $set: {
          'dean_approval.approved': false,
          'dean_approval.rejected': true,
          'dean_approval.rejection_reason': reason,
          'dean_approval.rejected_files': rejectedFilesList,
          'dean_approval.rejected_by': dean_name,
          'dean_approval.rejected_at': new Date(),
          'chairperson_approval.approved': false, // Reset chairperson approval
          status: 'rejected_by_dean',
          updated_at: new Date()
        }
      }
    );

    if (result.matchedCount === 0) {
      return res.status(404).json({ error: 'Submission not found' });
    }

    console.log(`✅ Dean rejection recorded for: ${submission_id}`);

    res.json({ 
      success: true, 
      message: 'Submission rejected. Student must resubmit and get chairperson approval again.',
      submission_id,
      rejected_files: rejectedFilesList
    });
  } catch (error) {
    console.error('❌ Error recording dean rejection:', error);
    res.status(500).json({ error: 'Error recording rejection' });
  }
});

// ==================== SHARED ROUTES ====================

// GET single submission by ID
router.get('/:submission_id', async (req, res) => {
  try {
    const { submission_id } = req.params;

    const submissionsCollection = getSubmissionsCollection();
    const submission = await submissionsCollection.findOne({ submission_id });

    if (!submission) {
      return res.status(404).json({ error: 'Submission not found' });
    }

    // Also get potential duplicates for warning
    const duplicates = await checkDuplicates(submission.title, submission.authors);
    
    res.json({ 
      success: true, 
      data: submission,
      potential_duplicates: duplicates.filter(d => d.submission_id !== submission_id)
    });
  } catch (error) {
    console.error('❌ Error fetching submission:', error);
    res.status(500).json({ error: 'Error fetching submission' });
  }
});

// GET all submissions (with filters)
router.get('/', async (req, res) => {
  try {
    const { status, department, program, document_type } = req.query;

    const submissionsCollection = getSubmissionsCollection();
    
    const filter = {};
    if (status) filter.status = status;
    if (department) filter.department = department;
    if (program) filter.program = program;
    if (document_type) filter.document_type = document_type;

    const submissions = await submissionsCollection
      .find(filter)
      .sort({ submitted_at: -1 })
      .toArray();

    res.json({ success: true, data: submissions });
  } catch (error) {
    console.error('❌ Error fetching submissions:', error);
    res.status(500).json({ error: 'Error fetching submissions' });
  }
});

export default router;

