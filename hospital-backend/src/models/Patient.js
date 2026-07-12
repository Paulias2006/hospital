import mongoose from 'mongoose';

const patientSchema = new mongoose.Schema(
  {
    nom: {
      type: String,
      required: true,
      trim: true,
    },
    prenom: {
      type: String,
      default: '',
    },
    telephone: {
      type: String,
      match: /^\+?[1-9]\d{1,14}$/,
    },
    email: {
      type: String,
      lowercase: true,
      match: /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/,
    },
    adresse: String,
    
    // Admission
    chambre: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Room',
      required: true,
    },
    typeChambre: {
      type: String,
      required: true,
    },
    dateAdmission: {
      type: Date,
      required: true,
    },
    
    // Assurance
    statut: {
      type: String,
      enum: ['Non Assuré', 'Assuré'],
      default: 'Non Assuré',
    },
    insurance: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Insurance',
    },
    
    // Sortie
    dateSortie: {
      type: Date,
      default: null,
    },
    typeSortie: {
      type: String,
      enum: ['Exéat', 'Décès', null],
      default: null,
    },
    
    // Métadonnées
    notes: String,
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

// Index pour recherches rapides
patientSchema.index({ statut: 1, dateSortie: 1 });
patientSchema.index({ chambre: 1 });
patientSchema.index({ dateAdmission: 1 });

export default mongoose.model('Patient', patientSchema);
