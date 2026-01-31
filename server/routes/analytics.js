import express from 'express';
import pool from '../data/database.js';
import RepoMongodb from '../databaseConnections/MongoDB/mongodb_connection.js';
import { cacheMiddleware } from '../middlewares/cache.js';
import { requireAuth } from '../middlewares/authMiddleware.js';
import { requireRole } from '../middlewares/authorizationMiddleware.js';

const router = express.Router();

// All analytics routes require auth and role 3, 4, or 5 (Faculty, Chairperson, Superadmin)
router.use(requireAuth, requireRole(3, 4, 5));

// TTL in seconds: dashboard 5 min (300), other analytics 2–5 min
const DASHBOARD_CACHE_TTL = 300;

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

// GET /analytics/dashboard - Get all dashboard statistics (parallel queries + cache)
router.get('/dashboard', cacheMiddleware(DASHBOARD_CACHE_TTL), async (req, res) => {
  try {
    const period = req.query.period || 'this_month'; // 'today', 'this_month', 'this_year'
    console.log(`📊 Fetching dashboard analytics for period: ${period}...`);

    const { currentStart, currentEnd, previousStart, previousEnd } = getDateRanges(period);

    const ps = (v) => (v && v.toISOString ? v.toISOString() : v);
    const prevIso = [ps(previousStart), ps(previousEnd)];
    const currIso = [ps(currentStart), ps(currentEnd)];

    // Run all independent queries in parallel (each group catches its own errors)
    const [
      thesisCounts,
      usersCounts,
      requestsCounts,
      downloadsCounts,
      programStats,
      commonKeywordsRaw,
      typeResult,
      nonPUPResult,
      pendingResult
    ] = await Promise.all([
      (async () => {
        if (!recordsCollection) return { total: 0, current: 0, previous: 0 };
        try {
          const [total, current, previous] = await Promise.all([
            recordsCollection.countDocuments(),
            recordsCollection.countDocuments({ created_at: { $gte: currentStart, $lte: currentEnd } }),
            recordsCollection.countDocuments({ created_at: { $gte: previousStart, $lte: previousEnd } })
          ]);
          return { total, current, previous };
        } catch (e) {
          console.error('❌ Error fetching thesis count:', e);
          return { total: 0, current: 0, previous: 0 };
        }
      })(),
      (async () => {
        try {
          const [total, prev, curr] = await Promise.all([
            pool.query('SELECT COUNT(*) as count FROM users_info'),
            pool.query('SELECT COUNT(*) as count FROM users_info WHERE created_at BETWEEN $1 AND $2', prevIso),
            pool.query('SELECT COUNT(*) as count FROM users_info WHERE created_at BETWEEN $1 AND $2', currIso)
          ]);
          return {
            total: parseInt(total.rows[0].count),
            previous: parseInt(prev.rows[0].count),
            current: parseInt(curr.rows[0].count)
          };
        } catch (e) {
          console.error('❌ Error fetching users count:', e);
          return { total: 0, previous: 0, current: 0 };
        }
      })(),
      (async () => {
        try {
          const [total, prev, curr] = await Promise.all([
            pool.query('SELECT COUNT(*) as count FROM requesters_analytics'),
            pool.query('SELECT COUNT(*) as count FROM requesters_analytics WHERE created_at BETWEEN $1 AND $2', prevIso),
            pool.query('SELECT COUNT(*) as count FROM requesters_analytics WHERE created_at BETWEEN $1 AND $2', currIso)
          ]);
          return {
            total: parseInt(total.rows[0].count),
            previous: parseInt(prev.rows[0].count),
            current: parseInt(curr.rows[0].count)
          };
        } catch (e) {
          console.error('❌ Error fetching requests count:', e);
          return { total: 0, previous: 0, current: 0 };
        }
      })(),
      (async () => {
        try {
          const [total, prev, curr] = await Promise.all([
            pool.query("SELECT COUNT(*) as count FROM requesters_analytics WHERE status = 'approved'"),
            pool.query("SELECT COUNT(*) as count FROM requesters_analytics WHERE status = 'approved' AND updated_at BETWEEN $1 AND $2", prevIso),
            pool.query("SELECT COUNT(*) as count FROM requesters_analytics WHERE status = 'approved' AND updated_at BETWEEN $1 AND $2", currIso)
          ]);
          return {
            total: parseInt(total.rows[0].count),
            previous: parseInt(prev.rows[0].count),
            current: parseInt(curr.rows[0].count)
          };
        } catch (e) {
          console.error('❌ Error fetching downloads count:', e);
          return { total: 0, previous: 0, current: 0 };
        }
      })(),
      (async () => {
        if (!recordsCollection) return [];
        try {
          return await recordsCollection.aggregate([
            {
              $match: {
                $or: [
                  { program: { $exists: true, $ne: null, $ne: "" } },
                  { program_id: { $exists: true, $ne: null, $ne: "" } },
                  { program_name: { $exists: true, $ne: null, $ne: "" } },
                  { Program: { $exists: true, $ne: null, $ne: "" } }
                ]
              }
            },
            {
              $addFields: {
                programValue: {
                  $ifNull: [
                    "$program",
                    { $ifNull: ["$program_id", { $ifNull: ["$program_name", "$Program"] }] }
                  ]
                }
              }
            },
            { $group: { _id: "$programValue", count: { $sum: 1 } } }
          ]).toArray();
        } catch (e) {
          console.error('❌ Error fetching documents per program:', e);
          return [];
        }
      })(),
      (async () => {
        if (!recordsCollection) return [];
        try {
          return await recordsCollection.aggregate([
            { $unwind: "$tags" },
            { $group: { _id: "$tags", count: { $sum: 1 } } },
            { $sort: { count: -1 } },
            { $limit: 10 }
          ]).toArray();
        } catch (e) {
          console.error('❌ Error fetching common keywords:', e);
          return [];
        }
      })(),
      (async () => {
        try {
          const r = await pool.query(`
            SELECT user_type, COUNT(*) as count FROM requesters_analytics GROUP BY user_type
          `);
          return r;
        } catch (e) {
          console.error('❌ Error fetching requests by type:', e);
          return { rows: [] };
        }
      })(),
      (async () => {
        try {
          const r = await pool.query('SELECT COUNT(*) as count FROM users_info WHERE role_id = 1');
          return parseInt(r.rows[0].count);
        } catch (e) {
          console.error('❌ Error fetching non-PUP users:', e);
          return 0;
        }
      })(),
      (async () => {
        try {
          const submissionsCollection = RepoMongodb ? RepoMongodb.collection("submissions") : null;
          if (!submissionsCollection) return 0;
          return await submissionsCollection.countDocuments({
            status: { $in: ['pending_chairperson', 'pending_dean'] }
          });
        } catch (e) {
          console.error('❌ Error fetching pending approvals:', e);
          return 0;
        }
      })()
    ]);

    const totalThesis = thesisCounts.total;
    const thesisChange = calculatePercentageChange(thesisCounts.current, thesisCounts.previous);
    const totalUsers = usersCounts.total;
    const usersChange = calculatePercentageChange(usersCounts.current, usersCounts.previous);
    const totalRequests = requestsCounts.total;
    const requestsChange = calculatePercentageChange(requestsCounts.current, requestsCounts.previous);
    const totalDownloads = downloadsCounts.total;
    const downloadsChange = calculatePercentageChange(downloadsCounts.current, downloadsCounts.previous);
    const registeredNonPUP = nonPUPResult;
    const pendingApprovals = pendingResult;

    const commonKeywords = commonKeywordsRaw.map(k => ({ keyword: k._id, count: k.count }));

    const requestsByType = { student: 0, guest: 0 };
    (typeResult.rows || []).forEach(row => {
      if (row.user_type === 'student') requestsByType.student = parseInt(row.count);
      else if (row.user_type === 'guest') requestsByType.guest = parseInt(row.count);
    });

    // Batch program lookups (single query instead of N)
    let docsPerProgram = [];
    if (programStats.length > 0 && RepoMongodb) {
      const programsCollection = RepoMongodb.collection("programs");
      const programIds = programStats
        .map(s => s._id)
        .filter(id => id != null && id !== undefined)
        .map(id => String(id).replace(/\/+$/, '').replace(/^\/+/, '').trim());
      const uniqueIds = [...new Set(programIds)];
      let programMap = {};
      try {
        const programs = await programsCollection.find({ program_id: { $in: uniqueIds } }).toArray();
        programs.forEach(p => {
          programMap[p.program_id] = { name: p.program_name || p.name || p.program_id, id: p.program_id };
        });
      } catch (e) {
        console.error('❌ Error batch-fetching programs:', e);
      }
      for (const stat of programStats) {
        let rawProgramId = stat._id;
        if (rawProgramId == null || rawProgramId === undefined) continue;
        const programId = String(rawProgramId).replace(/\/+$/, '').replace(/^\/+/, '').trim();
        const info = programMap[programId];
        const programName = info ? info.name : programId;
        const programIdValue = info ? info.id : programId;
        docsPerProgram.push({ program_id: programIdValue, program_name: programName, count: stat.count });
      }
      docsPerProgram.sort((a, b) => b.count - a.count);
    }

    console.log(`✅ Total Thesis: ${totalThesis} (${thesisChange}% change)`);
    console.log(`✅ Total Users: ${totalUsers} (${usersChange}% change)`);
    console.log(`✅ Total Requests: ${totalRequests} (${requestsChange}% change)`);
    console.log(`✅ Total Downloads: ${totalDownloads} (${downloadsChange}% change)`);
    console.log('✅ Dashboard analytics fetched successfully');

    const analytics = {
      totalThesis,
      totalUsers,
      totalRequests,
      totalDownloads,
      registeredNonPUP,
      pendingApprovals,
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

    // Calculate date range for the last N months (rolling window)
    const now = new Date();
    // Start from the 1st day of the oldest month (6 months ago)
    const startDate = new Date(now.getFullYear(), now.getMonth() - (months - 1), 1);
    // End at the last day of the current month (31st)
    const endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

    // Convert to ISO strings for PostgreSQL (ensures proper timezone handling)
    const startDateISO = startDate.toISOString();
    const endDateISO = endDate.toISOString();

    console.log(`📅 Date range: ${startDateISO} to ${endDateISO}`);

    // Query PostgreSQL for monthly breakdown
    const result = await pool.query(`
      SELECT 
        DATE_TRUNC('month', created_at) as month,
        user_type,
        COUNT(*) as count
      FROM requesters_analytics
      WHERE created_at >= $1 AND created_at <= $2
      GROUP BY DATE_TRUNC('month', created_at), user_type
      ORDER BY month ASC
    `, [startDateISO, endDateISO]);

    // Format data for frontend
    const monthlyData = [];
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    
    // Generate array of last N months (always show all 6 months, even with 0 data)
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

    console.log(`📊 Generated ${monthlyData.length} months:`, monthlyData.map(m => m.month).join(', '));
    console.log(`📊 Database returned ${result.rows.length} rows`);

    // Fill in actual counts from database
    result.rows.forEach(row => {
      // Parse the PostgreSQL timestamp properly
      const dbDate = new Date(row.month);
      const yearMonth = `${dbDate.getFullYear()}-${String(dbDate.getMonth() + 1).padStart(2, '0')}`;
      
      console.log(`📊 Processing row: month=${row.month}, yearMonth=${yearMonth}, user_type=${row.user_type}, count=${row.count}`);
      
      const monthData = monthlyData.find(m => m.yearMonth === yearMonth);
      if (monthData) {
        if (row.user_type === 'student') {
          monthData.student = parseInt(row.count);
        } else if (row.user_type === 'guest') {
          monthData.guest = parseInt(row.count);
        }
      } else {
        console.log(`⚠️ No matching month found for yearMonth: ${yearMonth}`);
      }
    });

    console.log(`📊 Final monthly data:`, monthlyData.map(m => `${m.month}: ${m.student} student, ${m.guest} guest`).join(' | '));

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

// GET /analytics/user-growth - Get user growth data over time
router.get('/user-growth', async (req, res) => {
  try {
    const months = parseInt(req.query.months) || 6; // Default to last 6 months
    console.log(`📊 Fetching user growth data for last ${months} months...`);

    // Calculate date range for the last N months
    const now = new Date();
    const startDate = new Date(now.getFullYear(), now.getMonth() - (months - 1), 1);

    // Query PostgreSQL for monthly user registrations
    const result = await pool.query(`
      SELECT 
        DATE_TRUNC('month', created_at) as month,
        COUNT(*) as count
      FROM users_info
      WHERE created_at >= $1
      GROUP BY DATE_TRUNC('month', created_at)
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
        count: 0
      });
    }

    // Fill in actual counts from database
    result.rows.forEach(row => {
      const date = new Date(row.month);
      const yearMonth = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      
      const monthData = monthlyData.find(m => m.yearMonth === yearMonth);
      if (monthData) {
        monthData.count = parseInt(row.count);
      }
    });

    // Calculate cumulative totals for line chart
    let cumulativeTotal = 0;
    const cumulativeData = monthlyData.map(m => {
      cumulativeTotal += m.count;
      return cumulativeTotal;
    });

    console.log('✅ User growth data fetched successfully');
    res.status(200).json({
      months: monthlyData.map(m => m.month),
      newUsers: monthlyData.map(m => m.count),
      cumulativeUsers: cumulativeData
    });

  } catch (error) {
    console.error('❌ Error fetching user growth data:', error);
    res.status(500).json({ error: 'Failed to fetch user growth data' });
  }
});

// GET /analytics/viewed-documents - Get most and least viewed documents overall (batched: single aggregation)
router.get('/viewed-documents', async (req, res) => {
  try {
    console.log('📊 Fetching most and least viewed documents...');

    if (!recordsCollection || !requestsCollection) {
      return res.status(500).json({ error: 'MongoDB connection not available' });
    }

    const limit = parseInt(req.query.limit) || 5; // Default to top/bottom 5

    // Single aggregation: group by document_id and count views
    const viewCounts = await requestsCollection.aggregate([
      { $group: { _id: '$document_id', views: { $sum: 1 } } }
    ]).toArray();
    const viewMap = Object.fromEntries(viewCounts.map(v => [v._id, v.views]));

    const allDocuments = await recordsCollection.find({}).toArray();
    console.log(`🔍 Total documents found: ${allDocuments.length}`);

    const documentsWithViews = allDocuments.map((doc) => {
      const docId = doc._id.toString();
      return {
        document_id: docId,
        title: doc.title || 'Untitled Document',
        authors: doc.authors || [],
        year: doc.year || 'N/A',
        program: doc.Program || doc.program_name || 'Unknown Program',
        views: viewMap[docId] ?? 0
      };
    });

    documentsWithViews.sort((a, b) => b.views - a.views);

    const mostViewed = documentsWithViews.slice(0, limit);
    const leastViewed = documentsWithViews.slice(-limit).reverse();

    console.log(`✅ Most viewed: ${mostViewed.length}, Least viewed: ${leastViewed.length}`);

    res.status(200).json({
      mostViewed,
      leastViewed,
      totalDocuments: allDocuments.length
    });
  } catch (error) {
    console.error('❌ Error fetching viewed documents:', error);
    res.status(500).json({ error: 'Failed to fetch viewed documents' });
  }
});

export default router;

