import mongoose from 'mongoose';

const roomSchema = new mongoose.Schema(
  {
    roomNumber: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    type: {
      type: String,
      enum: ['Standard', 'Individuelle', 'Commune', 'VIP', 'Réanimation', 'Pédiatrie', 'Urgence'],
      required: true,
    },
    isOccupied: {
      type: Boolean,
      default: false,
    },
    occupiedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Patient',
      default: null,
    },
    capacity: {
      type: Number,
      default: 1,
    },
    amenities: [String],
    notes: String,
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

// Index pour recherche rapide
roomSchema.index({ isOccupied: 1, type: 1 });

export default mongoose.model('Room', roomSchema);
