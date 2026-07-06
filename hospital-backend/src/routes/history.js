import express from 'express';
import History from '../models/History.js';
import { authMiddleware } from '../middleware/auth.js';
import { asyncHandler } from '../middleware/errorHandler.js';

const router = express.Router();

/**
 * GET /api/history
 * Lister tout l'historique
 */
router.get(
  '/',
  authMiddleware,
  asyncHandler(async (req, res) => {
    const { type, limit = 100, skip = 0 } = req.query;
    const filter = type ? { type } : {};

    const history = await History.find(filter)
      .populate('patient', 'nom')
      .populate('user', 'username email')
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .skip(parseInt(skip));

    const total = await History.countDocuments(filter);

    res.status(200).json({
      success: true,
      data: history,
      pagination: {
        total,
        limit: parseInt(limit),
        skip: parseInt(skip),
        pages: Math.ceil(total / limit),
      },
    });
  })
);

/**
 * GET /api/history/patient/:patientId
 * Lister l'historique d'un patient
 */
router.get(
  '/patient/:patientId',
  authMiddleware,
  asyncHandler(async (req, res) => {
    const { limit = 50, skip = 0 } = req.query;

    const history = await History.find({ patient: req.params.patientId })
      .populate('user', 'username email')
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .skip(parseInt(skip));

    const total = await History.countDocuments({ patient: req.params.patientId });

    res.status(200).json({
      success: true,
      data: history,
      pagination: {
        total,
        limit: parseInt(limit),
        skip: parseInt(skip),
      },
    });
  })
);

/**
 * GET /api/history/user/:userId
 * Lister les actions d'un utilisateur
 */
router.get(
  '/user/:userId',
  authMiddleware,
  asyncHandler(async (req, res) => {
    const { limit = 50, skip = 0 } = req.query;

    const history = await History.find({ user: req.params.userId })
      .populate('patient', 'nom')
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .skip(parseInt(skip));

    const total = await History.countDocuments({ user: req.params.userId });

    res.status(200).json({
      success: true,
      data: history,
      pagination: {
        total,
        limit: parseInt(limit),
        skip: parseInt(skip),
      },
    });
  })
);

/**
 * GET /api/history/stats
 * Obtenir les statistiques d'activité
 */
router.get(
  '/stats/activity',
  authMiddleware,
  asyncHandler(async (req, res) => {
    const stats = await History.aggregate([
      {
        $group: {
          _id: '$type',
          count: { $sum: 1 },
        },
      },
      { $sort: { count: -1 } },
    ]);

    const totalByDay = await History.aggregate([
      {
        $group: {
          _id: {
            $dateToString: { format: '%Y-%m-%d', date: '$createdAt' },
          },
          count: { $sum: 1 },
        },
      },
      { $sort: { _id: -1 } },
      { $limit: 30 },
    ]);

    res.status(200).json({
      success: true,
      data: {
        byType: stats,
        lastDays: totalByDay,
      },
    });
  })
);

export default router;
