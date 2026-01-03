import User from '../users/user.model.js';
import Course from '../courses/course.model.js';
import Strategy from '../strategies/strategy.model.js';
import Analysis from '../analysis/analysis.model.js';
import Webinar from '../webinars/webinar.model.js';
import Psychology from '../psychology/psychology.model.js';
import Analyst from '../analysts/analyst.model.js';
import SupportTicket from '../support/support.model.js';

const getDashboardStats = async (req, res) => {
  try {
    const [
      totalUsers,
      totalCourses,
      totalStrategies,
      totalAnalysis,
      totalWebinars,
      totalPsychology,
      totalAnalysts,
      totalSupportTickets
    ] = await Promise.all([
      User.countDocuments(),
      Course.countDocuments(),
      Strategy.countDocuments(),
      Analysis.countDocuments(),
      Webinar.countDocuments(),
      Psychology.countDocuments(),
      Analyst.countDocuments(),
      SupportTicket.countDocuments()
    ]);

    const stats = {
      totalUsers,
      totalCourses,
      totalStrategies,
      totalAnalysis,
      totalWebinars,
      totalPsychology,
      totalAnalysts,
      totalSupportTickets,
      activeSubscriptions: await User.countDocuments({ subscriptionStatus: 'subscribed' }),
      newUsersThisMonth: await User.countDocuments({
        createdAt: {
          $gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1)
        }
      })
    };

    res.status(200).json({
      stats
    });
  } catch (error) {
    console.error('Error fetching dashboard stats:', error);
    res.status(500).json({ error: 'Internal server error.' });
  }
};

export { getDashboardStats };