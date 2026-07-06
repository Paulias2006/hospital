import express from 'express';
import Insurance from '../models/Insurance.js';
import Patient from '../models/Patient.js';
import Payment from '../models/Payment.js';
import History from '../models/History.js';
import { authMiddleware } from '../middleware/auth.js';
import { validateInsurance } from '../utils/validators.js';
import { asyncHandler } from '../middleware/errorHandler.js';
import { generatePaymentsForPatient, countNights, formatDateISO } from '../utils/calculations.js';

const router = express.Router();

/**
 * GET /api/insurance/:patientId
 * Obtenir les assurances d'un patient
 */
router.get(
  '/:patientId',
  authMiddleware,
  asyncHandler(async (req, res) => {
    const insurance = await Insurance.findOne({ patient: req.params.patientId })
      .populate('patient');

    if (!insurance) {
      return res.status(404).json({
        success: false,
        error: 'Assurance non trouvée',
        code: 'INSURANCE_NOT_FOUND',
      });
    }

    res.status(200).json({
      success: true,
      data: insurance,
    });
  })
);

/**
 * POST /api/insurance/:patientId
 * Créer ou mettre à jour une assurance (PEC)
 */
router.post(
  '/:patientId',
  authMiddleware,
  asyncHandler(async (req, res) => {
    const { error, value } = validateInsurance(req.body);
    if (error) {
      return res.status(400).json({
        success: false,
        error: error.details[0].message,
        code: 'VALIDATION_ERROR',
      });
    }

    // Vérifier que le patient existe
    const patient = await Patient.findById(req.params.patientId);
    if (!patient) {
      return res.status(404).json({
        success: false,
        error: 'Patient non trouvé',
        code: 'PATIENT_NOT_FOUND',
      });
    }

    // Chercher une assurance existante
    let insurance = await Insurance.findOne({ patient: req.params.patientId });

    if (!insurance) {
      insurance = new Insurance({
        patient: req.params.patientId,
        insuranceType: value.insuranceType,
        pecs: value.pecs,
      });
    } else {
      insurance.insuranceType = value.insuranceType;
      insurance.pecs = value.pecs;
    }

    await insurance.save();

    // Mettre à jour le patient
    patient.insurance = insurance._id;
    patient.statut = 'Assuré';
    await patient.save();

    // Régénérer les paiements
    const endDate = patient.dateSortie || new Date();
    await Payment.deleteMany({ patient: req.params.patientId });
    const payments = generatePaymentsForPatient(patient, insurance, endDate);
    await Payment.insertMany(payments);

    // Enregistrer dans l'historique
    await History.create({
      type: 'PEC',
      patient: req.params.patientId,
      user: req.user.userId,
      description: `PEC mise à jour: ${value.insuranceType}`,
      details: { pecs: value.pecs },
      ipAddress: req.ip,
    });

    res.status(200).json({
      success: true,
      data: insurance,
      message: 'Assurance mise à jour avec succès',
    });
  })
);

/**
 * PUT /api/insurance/:insuranceId
 * Modifier une assurance
 */
router.put(
  '/:insuranceId',
  authMiddleware,
  asyncHandler(async (req, res) => {
    const { error, value } = validateInsurance(req.body);
    if (error) {
      return res.status(400).json({
        success: false,
        error: error.details[0].message,
        code: 'VALIDATION_ERROR',
      });
    }

    const insurance = await Insurance.findByIdAndUpdate(
      req.params.insuranceId,
      {
        insuranceType: value.insuranceType,
        pecs: value.pecs,
      },
      { new: true, runValidators: true }
    );

    if (!insurance) {
      return res.status(404).json({
        success: false,
        error: 'Assurance non trouvée',
        code: 'INSURANCE_NOT_FOUND',
      });
    }

    // Régénérer les paiements
    const patient = await Patient.findById(insurance.patient);
    const endDate = patient.dateSortie || new Date();
    await Payment.deleteMany({ patient: insurance.patient });
    const payments = generatePaymentsForPatient(patient, insurance, endDate);
    await Payment.insertMany(payments);

    // Enregistrer dans l'historique
    await History.create({
      type: 'PEC',
      patient: insurance.patient,
      user: req.user.userId,
      description: `PEC modifiée: ${value.insuranceType}`,
      details: { pecs: value.pecs },
      ipAddress: req.ip,
    });

    res.status(200).json({
      success: true,
      data: insurance,
      message: 'Assurance modifiée avec succès',
    });
  })
);

/**
 * GET /api/insurance/list/all
 * Lister toutes les assurances
 */
router.get(
  '/list/all',
  authMiddleware,
  asyncHandler(async (req, res) => {
    const insurances = await Insurance.find()
      .populate('patient')
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      data: insurances,
      count: insurances.length,
    });
  })
);

export default router;
