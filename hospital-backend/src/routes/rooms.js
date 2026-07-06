import express from 'express';
import Room from '../models/Room.js';
import Patient from '../models/Patient.js';
import { authMiddleware, adminMiddleware } from '../middleware/auth.js';
import { validateRoom } from '../utils/validators.js';
import { asyncHandler } from '../middleware/errorHandler.js';
import History from '../models/History.js';

const router = express.Router();

/**
 * GET /api/rooms
 * Lister toutes les chambres
 */
router.get(
  '/',
  authMiddleware,
  asyncHandler(async (req, res) => {
    const rooms = await Room.find({ isActive: true }).sort({ roomNumber: 1 });

    res.status(200).json({
      success: true,
      data: rooms,
      count: rooms.length,
    });
  })
);

/**
 * GET /api/rooms/:id
 * Obtenir les détails d'une chambre
 */
router.get(
  '/:id',
  authMiddleware,
  asyncHandler(async (req, res) => {
    const room = await Room.findById(req.params.id).populate('occupiedBy');

    if (!room) {
      return res.status(404).json({
        success: false,
        error: 'Chambre non trouvée',
        code: 'ROOM_NOT_FOUND',
      });
    }

    res.status(200).json({
      success: true,
      data: room,
    });
  })
);

/**
 * POST /api/rooms
 * Créer une nouvelle chambre
 */
router.post(
  '/',
  authMiddleware,
  adminMiddleware,
  asyncHandler(async (req, res) => {
    const { error, value } = validateRoom(req.body);
    if (error) {
      return res.status(400).json({
        success: false,
        error: error.details[0].message,
        code: 'VALIDATION_ERROR',
      });
    }

    const existingRoom = await Room.findOne({ roomNumber: value.roomNumber });
    if (existingRoom) {
      return res.status(400).json({
        success: false,
        error: 'Cette chambre existe déjà',
        code: 'ROOM_EXISTS',
      });
    }

    const room = new Room(value);
    await room.save();

    // Enregistrer dans l'historique
    await History.create({
      type: 'Modification',
      user: req.user.userId,
      description: `Nouvelle chambre créée: ${value.roomNumber}`,
      details: room.toObject(),
      ipAddress: req.ip,
    });

    res.status(201).json({
      success: true,
      data: room,
      message: 'Chambre créée avec succès',
    });
  })
);

/**
 * PUT /api/rooms/:id
 * Modifier une chambre
 */
router.put(
  '/:id',
  authMiddleware,
  adminMiddleware,
  asyncHandler(async (req, res) => {
    const { error, value } = validateRoom(req.body);
    if (error) {
      return res.status(400).json({
        success: false,
        error: error.details[0].message,
        code: 'VALIDATION_ERROR',
      });
    }

    const room = await Room.findByIdAndUpdate(req.params.id, value, {
      new: true,
      runValidators: true,
    });

    if (!room) {
      return res.status(404).json({
        success: false,
        error: 'Chambre non trouvée',
        code: 'ROOM_NOT_FOUND',
      });
    }

    // Enregistrer dans l'historique
    await History.create({
      type: 'Modification',
      user: req.user.userId,
      description: `Chambre modifiée: ${room.roomNumber}`,
      details: { before: req.body, after: room.toObject() },
      ipAddress: req.ip,
    });

    res.status(200).json({
      success: true,
      data: room,
      message: 'Chambre modifiée avec succès',
    });
  })
);

/**
 * DELETE /api/rooms/:id
 * Supprimer une chambre
 */
router.delete(
  '/:id',
  authMiddleware,
  adminMiddleware,
  asyncHandler(async (req, res) => {
    const room = await Room.findById(req.params.id);

    if (!room) {
      return res.status(404).json({
        success: false,
        error: 'Chambre non trouvée',
        code: 'ROOM_NOT_FOUND',
      });
    }

    // Vérifier si la chambre est occupée
    const occupiedPatient = await Patient.findOne({
      chambre: room._id,
      dateSortie: null,
    });

    if (occupiedPatient) {
      return res.status(400).json({
        success: false,
        error: 'Impossible de supprimer: chambre occupée',
        code: 'ROOM_OCCUPIED',
      });
    }

    room.isActive = false;
    await room.save();

    // Enregistrer dans l'historique
    await History.create({
      type: 'Modification',
      user: req.user.userId,
      description: `Chambre supprimée: ${room.roomNumber}`,
      ipAddress: req.ip,
    });

    res.status(200).json({
      success: true,
      message: 'Chambre supprimée avec succès',
    });
  })
);

/**
 * GET /api/rooms/stats/available
 * Obtenir les chambres disponibles
 */
router.get(
  '/stats/available',
  authMiddleware,
  asyncHandler(async (req, res) => {
    const available = await Room.find({ isOccupied: false, isActive: true });
    const occupied = await Room.find({ isOccupied: true, isActive: true });
    const total = await Room.countDocuments({ isActive: true });

    res.status(200).json({
      success: true,
      data: {
        available: available.length,
        occupied: occupied.length,
        total,
        occupancyRate: total > 0 ? Math.round((occupied.length / total) * 100) : 0,
      },
    });
  })
);

export default router;
