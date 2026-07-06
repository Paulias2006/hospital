import express from 'express';
import Patient from '../models/Patient.js';
import Room from '../models/Room.js';
import Insurance from '../models/Insurance.js';
import Payment from '../models/Payment.js';
import History from '../models/History.js';
import { authMiddleware } from '../middleware/auth.js';
import { validatePatient, validateExit } from '../utils/validators.js';
import { asyncHandler } from '../middleware/errorHandler.js';
import {
  generatePaymentsForPatient,
  countNights,
  formatDateISO,
} from '../utils/calculations.js';

const router = express.Router();

/**
 * GET /api/patients
 * Lister tous les patients actifs
 */
router.get(
  '/',
  authMiddleware,
  asyncHandler(async (req, res) => {
    const { all } = req.query;
    const filter = all ? {} : { dateSortie: null };

    const patients = await Patient.find(filter)
      .populate('chambre')
      .populate('insurance')
      .sort({ dateAdmission: -1 });

    res.status(200).json({
      success: true,
      data: patients,
      count: patients.length,
    });
  })
);

/**
 * GET /api/patients/:id
 * Obtenir les détails d'un patient
 */
router.get(
  '/:id',
  authMiddleware,
  asyncHandler(async (req, res) => {
    const patient = await Patient.findById(req.params.id)
      .populate('chambre')
      .populate('insurance');

    if (!patient) {
      return res.status(404).json({
        success: false,
        error: 'Patient non trouvé',
        code: 'PATIENT_NOT_FOUND',
      });
    }

    res.status(200).json({
      success: true,
      data: patient,
    });
  })
);

/**
 * POST /api/patients
 * Admettre un nouveau patient
 */
router.post(
  '/',
  authMiddleware,
  asyncHandler(async (req, res) => {
    const { error, value } = validatePatient(req.body);
    if (error) {
      return res.status(400).json({
        success: false,
        error: error.details[0].message,
        code: 'VALIDATION_ERROR',
      });
    }

    // Vérifier que la chambre existe et est disponible
    const room = await Room.findById(value.chambreId);
    if (!room) {
      return res.status(404).json({
        success: false,
        error: 'Chambre non trouvée',
        code: 'ROOM_NOT_FOUND',
      });
    }

    if (room.isOccupied) {
      return res.status(400).json({
        success: false,
        error: 'Chambre non disponible',
        code: 'ROOM_OCCUPIED',
      });
    }

    // Créer le patient
    const patient = new Patient({
      nom: value.nom,
      prenom: value.prenom,
      telephone: value.telephone,
      email: value.email,
      adresse: value.adresse,
      chambre: value.chambreId,
      typeChambre: room.type,
      dateAdmission: value.dateAdmission,
      statut: value.statut,
    });

    await patient.save();

    // Créer l'assurance si assuré
    if (value.statut === 'Assuré' && value.insuranceType) {
      const insurance = new Insurance({
        patient: patient._id,
        insuranceType: value.insuranceType,
        pecs: [],
      });
      await insurance.save();
      patient.insurance = insurance._id;
      await patient.save();
    }

    // Marquer la chambre occupée
    room.isOccupied = true;
    room.occupiedBy = patient._id;
    await room.save();

    // Générer les paiements
    const insuranceData = patient.insurance ? await Insurance.findById(patient.insurance) : null;
    const payments = generatePaymentsForPatient(patient, insuranceData);
    await Payment.insertMany(payments);

    // Enregistrer dans l'historique
    await History.create({
      type: 'Admission',
      patient: patient._id,
      user: req.user.userId,
      description: `Admission: ${patient.nom}`,
      details: patient.toObject(),
      ipAddress: req.ip,
    });

    // Charger les données complètes
    await patient.populate(['chambre', 'insurance']);

    res.status(201).json({
      success: true,
      data: patient,
      message: 'Patient admis avec succès',
    });
  })
);

/**
 * PUT /api/patients/:id
 * Modifier un patient
 */
router.put(
  '/:id',
  authMiddleware,
  asyncHandler(async (req, res) => {
    const { nom, prenom, telephone, email, adresse, notes } = req.body;

    const patient = await Patient.findByIdAndUpdate(
      req.params.id,
      { nom, prenom, telephone, email, adresse, notes },
      { new: true, runValidators: true }
    ).populate(['chambre', 'insurance']);

    if (!patient) {
      return res.status(404).json({
        success: false,
        error: 'Patient non trouvé',
        code: 'PATIENT_NOT_FOUND',
      });
    }

    // Enregistrer dans l'historique
    await History.create({
      type: 'Modification',
      patient: patient._id,
      user: req.user.userId,
      description: `Modification: ${patient.nom}`,
      details: req.body,
      ipAddress: req.ip,
    });

    res.status(200).json({
      success: true,
      data: patient,
      message: 'Patient modifié avec succès',
    });
  })
);

/**
 * POST /api/patients/:id/exit
 * Enregistrer la sortie d'un patient
 */
router.post(
  '/:id/exit',
  authMiddleware,
  asyncHandler(async (req, res) => {
    const { error, value } = validateExit(req.body);
    if (error) {
      return res.status(400).json({
        success: false,
        error: error.details[0].message,
        code: 'VALIDATION_ERROR',
      });
    }

    const patient = await Patient.findById(req.params.id).populate('chambre');
    if (!patient) {
      return res.status(404).json({
        success: false,
        error: 'Patient non trouvé',
        code: 'PATIENT_NOT_FOUND',
      });
    }

    if (patient.dateSortie) {
      return res.status(400).json({
        success: false,
        error: 'Patient déjà sorti',
        code: 'PATIENT_ALREADY_EXITED',
      });
    }

    // Mettre à jour le patient
    patient.dateSortie = value.dateSortie;
    patient.typeSortie = value.typeSortie;
    await patient.save();

    // Libérer la chambre
    const room = await Room.findById(patient.chambre);
    room.isOccupied = false;
    room.occupiedBy = null;
    await room.save();

    // Régénérer les paiements jusqu'à la date de sortie
    const insuranceData = patient.insurance ? await Insurance.findById(patient.insurance) : null;
    await Payment.deleteMany({ patient: patient._id });
    const payments = generatePaymentsForPatient(patient, insuranceData, value.dateSortie);
    await Payment.insertMany(payments);

    // Enregistrer dans l'historique
    await History.create({
      type: 'Sortie',
      patient: patient._id,
      user: req.user.userId,
      description: `${value.typeSortie}: ${patient.nom}`,
      details: { typeSortie: value.typeSortie, dateSortie: value.dateSortie },
      ipAddress: req.ip,
    });

    await patient.populate(['chambre', 'insurance']);

    res.status(200).json({
      success: true,
      data: patient,
      message: `${value.typeSortie} enregistré avec succès`,
    });
  })
);

export default router;
