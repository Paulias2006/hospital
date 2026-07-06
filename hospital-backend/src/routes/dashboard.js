import express from 'express';
import Patient from '../models/Patient.js';
import Room from '../models/Room.js';
import Payment from '../models/Payment.js';
import { authMiddleware } from '../middleware/auth.js';
import { asyncHandler } from '../middleware/errorHandler.js';
import { countNights } from '../utils/calculations.js';

const router = express.Router();

/**
 * GET /api/dashboard
 * Données pour le tableau de bord
 */
router.get(
  '/',
  authMiddleware,
  asyncHandler(async (req, res) => {
    // Patients hospitalisés
    const activePatients = await Patient.find({ dateSortie: null })
      .populate('chambre')
      .populate('insurance');

    // Chambres
    const totalRooms = await Room.countDocuments({ isActive: true });
    const occupiedRooms = await Room.countDocuments({ isOccupied: true });
    const emptyRooms = totalRooms - occupiedRooms;
    const occupancyRate = totalRooms > 0 ? Math.round((occupiedRooms / totalRooms) * 100) : 0;

    // Paiements
    const paymentStats = await Payment.aggregate([
      {
        $group: {
          _id: null,
          totalMontant: { $sum: { $ifNull: ['$montantReel', '$montantCalcule'] } },
          totalPaye: {
            $sum: {
              $cond: [
                '$paye',
                { $ifNull: ['$montantReel', '$montantCalcule'] },
                0,
              ],
            },
          },
          totalNonPaye: {
            $sum: {
              $cond: [
                '$paye',
                0,
                { $ifNull: ['$montantReel', '$montantCalcule'] },
              ],
            },
          },
        },
      },
    ]);

    const payments = paymentStats[0] || {
      totalMontant: 0,
      totalPaye: 0,
      totalNonPaye: 0,
    };

    res.status(200).json({
      success: true,
      data: {
        patients: {
          active: activePatients.length,
          total: activePatients.length,
        },
        rooms: {
          total: totalRooms,
          occupied: occupiedRooms,
          empty: emptyRooms,
          occupancyRate,
        },
        payments,
        recentPatients: activePatients.slice(0, 5),
      },
    });
  })
);

/**
 * GET /api/dashboard/report
 * Rapport complet
 */
router.get(
  '/report',
  authMiddleware,
  asyncHandler(async (req, res) => {
    const activePatients = await Patient.find({ dateSortie: null })
      .populate('chambre')
      .populate('insurance');

    const report = activePatients.map((patient) => {
      const nuits = countNights(patient.dateAdmission, new Date());
      return {
        nom: patient.nom,
        chambre: patient.chambre?.roomNumber,
        typeChambre: patient.typeChambre,
        dateAdmission: patient.dateAdmission,
        nuits,
        assurance: patient.statut,
        insuranceType: patient.insurance?.insuranceType,
      };
    });

    res.status(200).json({
      success: true,
      data: report,
      count: report.length,
    });
  })
);

export default router;
