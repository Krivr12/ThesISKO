import express from 'express';
import pool from '../data/database.js';
import RepoMongodb from '../databaseConnections/MongoDB/mongodb_connection.js';

const router = express.Router();

// Collections from MongoDB
const recordsCollection = RepoMongodb ? RepoMongodb.collection("records") : null;
const requestsCollection = RepoMongodb ? RepoMongodb.collection("requests") : null;

// Helper function to get date ranges based on period
function getDateRanges(period) {
  const now = new Date();
  let currentStart, currentEnd, previousStart, previousEnd;

  if (period === 'today') {
    // Today
    currentStart = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
    currentEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);
    // Yesterday
    previousStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1, 0, 0, 0);
    previousEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1, 23, 59, 59);
  } else if (period === 'this_year') {
    // This Year
    currentStart = new Date(now.getFullYear(), 0, 1, 0, 0, 0);
    currentEnd = now;
    // Last Year
    previousStart = new Date(now.getFullYear() - 1, 0, 1, 0, 0, 0);
    previousEnd = new Date(now.getFullYear() - 1, 11, 31, 23, 59, 59);
  } else { // 'this_month' (default)
    // This Month
    currentStart = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0);
    currentEnd = now;
    // Last Month
    previousStart = new Date(now.getFullYear(), now.getMonth() - 1, 1, 0, 0, 0);
    previousEnd = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59);
  }

  return { currentStart, currentEnd, previousStart, previousEnd };
}

// Helper function to calculate percentage change
function calculatePercentageChange(current, previous) {
  if (previous === 0) {
    return current > 0 ? 100 : 0;
  }
  return ((current - previous) / previous * 100).toFixed(1);
}

// GET /analytics/dashboard - Get all dashboard statistics
router.get('/dashboard', async (req, res) => {
  try {
    const period = req.query.period || 'this_month'; // 'today', 'this_month', 'this_year'
    console.log(`📊 Fetching dashboard analytics for period: ${period}...`);

    const { currentStart, currentEnd, previousStart, previousEnd } = getDateRanges(period);

    // 1. Total Number of Thesis (from MongoDB records collection) - ALL TIME COUNT
    const totalThesis = recordsCollection ? await recordsCollection.countDocuments() : 0;
    
    // Calculate period-based change for thesis
    const currentPeriodThesis = recordsCollection ? await recordsCollection.countDocuments({
      created_at: { $gte: currentStart, $lte: currentEnd }
    }) : 0;
    const previousPeriodThesis = recordsCollection ? await recordsCollection.countDocuments({
      created_at: { $gte: previousStart, $lte: previousEnd }
    }) : 0;
    const thesisChange = calculatePercentageChange(currentPeriodThesis, previousPeriodThesis);
    console.log(`✅ Total Thesis: ${totalThesis} (${thesisChange}% change)`);

    // 2. Total Number of Users (from PostgreSQL users_info) - ALL TIME COUNT
    let totalUsers = 0;
    let usersChange = 0;
    try {
      // Total count - all time
      const usersResult = await pool.query('SELECT COUNT(*) as count FROM users_info');
      totalUsers = parseInt(usersResult.rows[0].count);
      
      // Period-based counts for percentage change
      const previousUsersResult = await pool.query(
        'SELECT COUNT(*) as count FROM users_info WHERE created_at BETWEEN $1 AND $2',
        [previousStart.toISOString(), previousEnd.toISOString()]
      );
      const currentPeriodUsers = await pool.query(
        'SELECT COUNT(*) as count FROM users_info WHERE created_at BETWEEN $1 AND $2',
        [currentStart.toISOString(), currentEnd.toISOString()]
      );
      
      const previousCount = parseInt(previousUsersResult.rows[0].count);
      const currentCount = parseInt(currentPeriodUsers.rows[0].count);
      usersChange = calculatePercentageChange(currentCount, previousCount);
      console.log(`✅ Total Users: ${totalUsers} (${usersChange}% change)`);
    } catch (error) {
      console.error('❌ Error fetching users count:', error);
    }

    // 3. Total Requests (from Supabase requesters_analytics) - ALL TIME COUNT
    let totalRequests = 0;
    let requestsChange = 0;
    try {
      // Total count - all time
      const requestsResult = await pool.query('SELECT COUNT(*) as count FROM requesters_analytics');
      totalRequests = parseInt(requestsResult.rows[0].count);
      
      // Period-based counts for percentage change
      const previousRequestsResult = await pool.query(
        'SELECT COUNT(*) as count FROM requesters_analytics WHERE created_at BETWEEN $1 AND $2',
        [previousStart.toISOString(), previousEnd.toISOString()]
      );
      const currentPeriodRequests = await pool.query(
        'SELECT COUNT(*) as count FROM requesters_analytics WHERE created_at BETWEEN $1 AND $2',
        [currentStart.toISOString(), currentEnd.toISOString()]
      );
      
      const previousCount = parseInt(previousRequestsResult.rows[0].count);
      const currentCount = parseInt(currentPeriodRequests.rows[0].count);
      requestsChange = calculatePercentageChange(currentCount, previousCount);
      console.log(`✅ Total Requests: ${totalRequests} (${requestsChange}% change)`);
    } catch (error) {
      console.error('❌ Error fetching requests count:', error);
    }

    // 4. Total Downloads (approved requests from requesters_analytics) - ALL TIME COUNT
    let totalDownloads = 0;
    let downloadsChange = 0;
    try {
      // Total count - all time
      const downloadsResult = await pool.query(
        "SELECT COUNT(*) as count FROM requesters_analytics WHERE status = 'approved'"
      );
      totalDownloads = parseInt(downloadsResult.rows[0].count);
      
      // Period-based counts for percentage change
      const previousDownloadsResult = await pool.query(
        "SELECT COUNT(*) as count FROM requesters_analytics WHERE status = 'approved' AND updated_at BETWEEN $1 AND $2",
        [previousStart.toISOString(), previousEnd.toISOString()]
      );
      const currentPeriodDownloads = await pool.query(
        "SELECT COUNT(*) as count FROM requesters_analytics WHERE status = 'approved' AND updated_at BETWEEN $1 AND $2",
        [currentStart.toISOString(), currentEnd.toISOString()]
      );
      
      const previousCount = parseInt(previousDownloadsResult.rows[0].count);
      const currentCount = parseInt(currentPeriodDownloads.rows[0].count);
      downloadsChange = calculatePercentageChange(currentCount, previousCount);
      console.log(`✅ Total Downloads: ${totalDownloads} (${downloadsChange}% change)`);
    } catch (error) {
      console.error('❌ Error fetching downloads count:', error);
    }

    // 5. Documents per Program (from MongoDB records collection)
    let docsPerProgram = [];
    if (recordsCollection) {
      try {
        const programsCollection = RepoMongodb.collection("programs");
        
        // Aggregate documents by program_id
        const programStats = await recordsCollection.aggregate([
          {
            $match: { program_id: { $exists: true, $ne: null } }
          },
          {
            $group: {
              _id: "$program_id",
              count: { $sum: 1 }
            }
          }
        ]).toArray();

        // Get program names
        for (const stat of programStats) {
          try {
            const program = await programsCollection.findOne({ program_id: stat._id });
            if (program) {
              docsPerProgram.push({
                program_id: stat._id,
                program_name: program.program_name || program.name || `Program ${stat._id}`,
                count: stat.count
              });
            }
          } catch (error) {
            console.error(`❌ Error fetching program ${stat._id}:`, error);
            docsPerProgram.push({
              program_id: stat._id,
              program_name: `Program ${stat._id}`,
              count: stat.count
            });
          }
        }

        // Sort by count descending
        docsPerProgram.sort((a, b) => b.count - a.count);
        console.log(`✅ Documents per Program: ${docsPerProgram.length} programs`);
      } catch (error) {
        console.error('❌ Error fetching documents per program:', error);
      }
    }

    // 6. Common Keywords (most frequent tags from records collection)
    let commonKeywords = [];
    if (recordsCollection) {
      try {
        const keywordsStats = await recordsCollection.aggregate([
          { $unwind: "$tags" },
          {
            $group: {
              _id: "$tags",
              count: { $sum: 1 }
            }
          },
          { $sort: { count: -1 } },
          { $limit: 10 }
        ]).toArray();

        commonKeywords = keywordsStats.map(k => ({
          keyword: k._id,
          count: k.count
        }));
        console.log(`✅ Common Keywords: ${commonKeywords.length} keywords`);
      } catch (error) {
        console.error('❌ Error fetching common keywords:', error);
      }
    }

    // 7. Student vs Guest Requests (from requesters_analytics)
    let requestsByType = { student: 0, guest: 0 };
    try {
      const typeResult = await pool.query(`
        SELECT user_type, COUNT(*) as count 
        FROM requesters_analytics 
        GROUP BY user_type
      `);
      
      typeResult.rows.forEach(row => {
        if (row.user_type === 'student') {
          requestsByType.student = parseInt(row.count);
        } else if (row.user_type === 'guest') {
          requestsByType.guest = parseInt(row.count);
        }
      });
      console.log(`✅ Requests by Type - Student: ${requestsByType.student}, Guest: ${requestsByType.guest}`);
    } catch (error) {
      console.error('❌ Error fetching requests by type:', error);
    }

    // 8. Registered Non-PUP Users (users with role_id = 1 which are guests/non-PUP)
    let registeredNonPUP = 0;
    try {
      const nonPUPResult = await pool.query(`
        SELECT COUNT(*) as count 
        FROM users_info 
        WHERE role_id = 1
      `);
      registeredNonPUP = parseInt(nonPUPResult.rows[0].count);
      console.log(`✅ Registered Non-PUP Users (role_id = 1): ${registeredNonPUP}`);
    } catch (error) {
      console.error('❌ Error fetching non-PUP users:', error);
    }

    // Return all analytics
    const analytics = {
      totalThesis,
      totalUsers,
      totalRequests,
      totalDownloads,
      registeredNonPUP,
      docsPerProgram,
      commonKeywords,
      requestsByType,
      changes: {
        thesis: parseFloat(thesisChange),
        users: parseFloat(usersChange),
        requests: parseFloat(requestsChange),
        downloads: parseFloat(downloadsChange)
      },
      period
    };

    console.log('✅ Dashboard analytics fetched successfully');
    res.status(200).json(analytics);

  } catch (error) {
    console.error('❌ Error fetching dashboard analytics:', error);
    res.status(500).json({ error: 'Failed to fetch dashboard analytics' });
  }
});

// GET /analytics/requests-by-month - Get monthly requests breakdown by user type
router.get('/requests-by-month', async (req, res) => {
  try {
    const months = parseInt(req.query.months) || 6; // Default to last 6 months
    console.log(`📊 Fetching monthly requests data for last ${months} months...`);

    // Calculate date range for the last N months
    const now = new Date();
    const startDate = new Date(now.getFullYear(), now.getMonth() - (months - 1), 1);

    // Query PostgreSQL for monthly breakdown
    const result = await pool.query(`
      SELECT 
        DATE_TRUNC('month', created_at) as month,
        user_type,
        COUNT(*) as count
      FROM requesters_analytics
      WHERE created_at >= $1
      GROUP BY DATE_TRUNC('month', created_at), user_type
      ORDER BY month ASC
    `, [startDate]);

    // Format data for frontend
    const monthlyData = [];
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    
    // Generate array of last N months
    for (let i = months - 1; i >= 0; i--) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthLabel = monthNames[date.getMonth()];
      const yearMonth = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      
      monthlyData.push({
        month: monthLabel,
        yearMonth: yearMonth,
        student: 0,
        guest: 0
      });
    }

    // Fill in actual counts from database
    result.rows.forEach(row => {
      const date = new Date(row.month);
      const yearMonth = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      
      const monthData = monthlyData.find(m => m.yearMonth === yearMonth);
      if (monthData) {
        if (row.user_type === 'student') {
          monthData.student = parseInt(row.count);
        } else if (row.user_type === 'guest') {
          monthData.guest = parseInt(row.count);
        }
      }
    });

    console.log('✅ Monthly requests data fetched successfully');
    res.status(200).json({
      months: monthlyData.map(m => m.month),
      studentRequests: monthlyData.map(m => m.student),
      guestRequests: monthlyData.map(m => m.guest)
    });

  } catch (error) {
    console.error('❌ Error fetching monthly requests data:', error);
    res.status(500).json({ error: 'Failed to fetch monthly requests data' });
  }
});

export default router;

