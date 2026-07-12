import express from 'express';
import Payment from '../models/Payment.js';
import Patient from '../models/Patient.js';
import Insurance from '../models/Insurance.js';
import History from '../models/History.js';
import { authMiddleware, adminMiddleware } from '../middleware/auth.js';
import { validatePaymentUpdate } from '../utils/validators.js';
import { asyncHandler } from '../middleware/errorHandler.js';
import {
  formatDateISO,
  generatePaymentsForPatient,
  getPaymentStats,
} from '../utils/calculations.js';

const router = express.Router();

/**
 * GET /api/payments/patient/:patientId
 * Lister tous les paiements d'un patient
 */
router.get(
  '/patient/:patientId',
  authMiddleware,
  asyncHandler(async (req, res) => {
    const patient = await Patient.findById(req.params.patientId).populate('insurance');
    if (!patient) {
      return res.status(404).json({
        success: false,
        error: 'Patient non trouvÃ©',
        code: 'PATIENT_NOT_FOUND',
      });
    }

    let payments = await Payment.find({ patient: req.params.patientId })
      .sort({ date: 1 });

    const generatedPayments = generatePaymentsForPatient(
      patient,
      patient.insurance || null,
      patient.dateSortie || new Date()
    );
    const existingDates = new Set(payments.map((payment) => formatDateISO(payment.date)));
    const missingPayments = generatedPayments.filter(
      (payment) => !existingDates.has(formatDateISO(payment.date))
    );

    if (missingPayments.length > 0) {
      await Payment.insertMany(missingPayments);
      payments = await Payment.find({ patient: req.params.patientId }).sort({ date: 1 });
    }

    const stats = getPaymentStats(payments);

    res.status(200).json({
      success: true,
      data: payments,
      stats,
      count: payments.length,
    });
  })
);

/**
 * GET /api/payments/:id
 * Obtenir les détails d'un paiement
 */
router.get(
  '/:id',
  authMiddleware,
  asyncHandler(async (req, res) => {
    const payment = await Payment.findById(req.params.id)
      .populate('patient')
      .populate('modifiePar');

    if (!payment) {
      return res.status(404).json({
        success: false,
        error: 'Paiement non trouvé',
        code: 'PAYMENT_NOT_FOUND',
      });
    }

    res.status(200).json({
      success: true,
      data: payment,
    });
  })
);

/**
 * PUT /api/payments/:id/mark-paid
 * Marquer un paiement comme payé
 */
router.put(
  '/:id/mark-paid',
  authMiddleware,
  asyncHandler(async (req, res) => {
    const payment = await Payment.findByIdAndUpdate(
      req.params.id,
      { paye: true, datePayment: new Date() },
      { new: true }
    );

    if (!payment) {
      return res.status(404).json({
        success: false,
        error: 'Paiement non trouvé',
        code: 'PAYMENT_NOT_FOUND',
      });
    }

    // Enregistrer dans l'historique
    await History.create({
      type: 'Paiement',
      patient: payment.patient,
      user: req.user.userId,
      description: `Paiement marqué payé`,
      details: { date: payment.date, montant: payment.montantCalcule },
      ipAddress: req.ip,
    });

    res.status(200).json({
      success: true,
      data: payment,
      message: 'Paiement marqué payé',
    });
  })
);

/**
 * PUT /api/payments/:id/mark-unpaid
 * Marquer un paiement comme non payé
 */
router.put(
  '/:id/mark-unpaid',
  authMiddleware,
  asyncHandler(async (req, res) => {
    const payment = await Payment.findByIdAndUpdate(
      req.params.id,
      { paye: false, datePayment: null },
      { new: true }
    );

    if (!payment) {
      return res.status(404).json({
        success: false,
        error: 'Paiement non trouvé',
        code: 'PAYMENT_NOT_FOUND',
      });
    }

    res.status(200).json({
      success: true,
      data: payment,
      message: 'Paiement marqué non payé',
    });
  })
);

/**
 * PUT /api/payments/:id/edit-amount
 * Modifier le montant d'un paiement (Admin only)
 */
router.put(
  '/:id/edit-amount',
  authMiddleware,
  adminMiddleware,
  asyncHandler(async (req, res) => {
    const { error, value } = validatePaymentUpdate(req.body);
    if (error) {
      return res.status(400).json({
        success: false,
        error: error.details[0].message,
        code: 'VALIDATION_ERROR',
      });
    }

    const payment = await Payment.findByIdAndUpdate(
      req.params.id,
      {
        montantReel: value.montantReel,
        modifie: true,
        modifiePar: req.user.userId,
        dateModification: new Date(),
      },
      { new: true }
    );

    if (!payment) {
      return res.status(404).json({
        success: false,
        error: 'Paiement non trouvé',
        code: 'PAYMENT_NOT_FOUND',
      });
    }

    // Enregistrer dans l'historique
    await History.create({
      type: 'Modification',
      patient: payment.patient,
      user: req.user.userId,
      description: `Montant modifié`,
      details: {
        date: payment.date,
        montantPrecedent: payment.montantCalcule,
        montantNouveau: value.montantReel,
      },
      ipAddress: req.ip,
    });

    res.status(200).json({
      success: true,
      data: payment,
      message: 'Montant modifié avec succès',
    });
  })
);

/**
 * GET /api/payments/summary/dashboard
 * Obtenir le résumé des paiements
 */
router.get(
  '/summary/dashboard',
  authMiddleware,
  asyncHandler(async (req, res) => {
    const totalPayments = await Payment.aggregate([
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
          nuitesPayees: { $sum: { $cond: ['$paye', 1, 0] } },
          nuitesNonPayees: { $sum: { $cond: ['$paye', 0, 1] } },
        },
      },
    ]);

    const summary = totalPayments[0] || {
      totalMontant: 0,
      totalPaye: 0,
      totalNonPaye: 0,
      nuitesPayees: 0,
      nuitesNonPayees: 0,
    };

    res.status(200).json({
      success: true,
      data: summary,
    });
  })
);

/**
 * GET /api/payments/export/csv
 * Exporter les paiements en CSV
 */
router.get(
  '/export/csv',
  authMiddleware,
  asyncHandler(async (req, res) => {
    const patients = await Patient.find({ dateSortie: null }).populate('insurance');
    const payments = await Payment.find({ patient: { $in: patients.map(p => p._id) } });

    let csv = 'Patient,Chambre,Assurance,Date,Montant,Payé\n';

    for (const payment of payments) {
      const patient = patients.find(p => p._id.toString() === payment.patient.toString());
      if (patient) {
        const montant = payment.montantReel || payment.montantCalcule;
        csv += `"${patient.nom}","${payment.date.toISOString().split('T')[0]}","${patient.statut}","${montant}","${payment.paye ? 'Oui' : 'Non'}"\n`;
      }
    }

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="paiements.csv"');
    res.send(csv);

    // Enregistrer dans l'historique
    await History.create({
      type: 'Export',
      user: req.user.userId,
      description: `Export CSV des paiements`,
      ipAddress: req.ip,
    });
  })
);

export default router;
