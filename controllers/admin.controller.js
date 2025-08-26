import { getDb } from '../db/index.js';
import AppError from '../utils/AppError.js';

export const getDashboardStats = async (req, res, next) => {
    try {
        const db = getDb();
        
        // Current date calculations
        const now = new Date();
        const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        const oneMonthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        
        // Get current counts
        const users = await db.collection('users').countDocuments();
        const teachings = await db.collection('teachings').countDocuments();
        const events = await db.collection('events').countDocuments();
        const prayers = await db.collection('prayer_requests').countDocuments();
        const leaders = await db.collection('leaders').countDocuments();
        const testimonies = await db.collection('testimonies').countDocuments();
        const ministryTeams = await db.collection('ministry_teams').countDocuments();
        const blogPosts = await db.collection('blog_posts').countDocuments();
        const lightCampuses = await db.collection('light_campuses').countDocuments({ isActive: true });
        
        // Get comprehensive campus application statistics
        const totalCampusApplications = await db.collection('light_campus_applications').countDocuments();
        const pendingCampusApplications = await db.collection('light_campus_applications').countDocuments({ status: 'Pending' });
        const approvedCampusApplications = await db.collection('light_campus_applications').countDocuments({ status: 'Approved' });
        const rejectedCampusApplications = await db.collection('light_campus_applications').countDocuments({ status: 'Rejected' });

        // Calculate trends for the week/month
        const newLeadersThisMonth = await db.collection('leaders').countDocuments({
            createdAt: { $gte: oneMonthAgo.toISOString() }
        });
        
        const newBlogPostsThisWeek = await db.collection('blog_posts').countDocuments({
            createdAt: { $gte: oneWeekAgo.toISOString() }
        });
        
        const newTeachingsThisWeek = await db.collection('teachings').countDocuments({
            created_at: { $gte: oneWeekAgo.toISOString() }
        });
        
        const pendingTestimonies = await db.collection('testimonies').countDocuments({
            is_approved: false
        });

        // Prepare response with trends
        const statsWithTrends = {
            users,
            teachings,
            events,
            prayers,
            leaders,
            testimonies,
            ministryTeams,
            blogPosts,
            lightCampuses,
            campusApplications: {
                total: totalCampusApplications,
                pending: pendingCampusApplications,
                approved: approvedCampusApplications,
                rejected: rejectedCampusApplications
            },
            trends: {
                leaders: newLeadersThisMonth > 0 ? `+${newLeadersThisMonth} this month` : 'No change',
                blogPosts: newBlogPostsThisWeek > 0 ? `+${newBlogPostsThisWeek} this week` : 'No change',
                teachings: newTeachingsThisWeek > 0 ? `+${newTeachingsThisWeek} this week` : 'No change',
                testimonies: pendingTestimonies > 0 ? `${pendingTestimonies} pending` : 'All reviewed'
            }
        };

        res.status(200).json(statsWithTrends);
    } catch (error) {
        next(new AppError('Failed to fetch dashboard statistics.', 500));
    }
};

export const getUserGrowthStats = async (req, res, next) => {
    try {
        const db = getDb();
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

        const userGrowth = await db.collection('users').aggregate([
            {
                $match: {
                    createdAt: { $gte: thirtyDaysAgo.toISOString() }
                }
            },
            {
                $group: {
                    _id: { $dateToString: { format: "%Y-%m-%d", date: { $toDate: "$createdAt" } } },
                    count: { $sum: 1 }
                }
            },
            {
                $sort: { _id: 1 }
            },
            {
                $project: {
                    date: "$_id",
                    count: 1,
                    _id: 0
                }
            }
        ]).toArray();

        res.status(200).json(userGrowth);
    } catch (error) {
        next(new AppError('Failed to fetch user growth statistics.', 500));
    }
};