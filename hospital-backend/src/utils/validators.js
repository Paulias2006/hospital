import Joi from 'joi';

export const validateRegister = (data) => {
  const schema = Joi.object({
    username: Joi.string().alphanum().min(3).max(30).required(),
    email: Joi.string().email({ minDomainSegments: 2, tlds: { allow: false } }).required(),
    password: Joi.string().min(6).required(),
  });

  return schema.validate(data);
};

export const validateLogin = (data) => {
  const schema = Joi.object({
    email: Joi.string().email({ minDomainSegments: 2, tlds: { allow: false } }).required(),
    password: Joi.string().required(),
  });

  return schema.validate(data);
};

export const validateRoom = (data) => {
  const schema = Joi.object({
    roomNumber: Joi.string().required(),
    type: Joi.string()
      .valid('Standard', 'Individuelle', 'Commune', 'VIP', 'Réanimation', 'Pédiatrie', 'Urgence')
      .required(),
    capacity: Joi.number().min(1),
    amenities: Joi.array().items(Joi.string()),
    notes: Joi.string(),
  });

  return schema.validate(data);
};

export const validatePatient = (data) => {
  const schema = Joi.object({
    nom: Joi.string().required(),
    prenom: Joi.string().allow('').optional(),
    telephone: Joi.string().allow('').optional(),
    email: Joi.string().email().allow('').optional(),
    adresse: Joi.string().allow('').optional(),
    chambreId: Joi.string().required(),
    dateAdmission: Joi.date().required(),
    statut: Joi.string().valid('Non Assuré', 'Assuré').required(),
    insuranceType: Joi.string().allow('').optional(),
  });

  return schema.validate(data);
};

export const validateInsurance = (data) => {
  const schema = Joi.object({
    insuranceType: Joi.string()
      .valid(
        'AMU',
        'INAM',
        'ASCOMA',
        'GRAS SAVOYE',
        'SALAM',
        'OLEA',
        'GTA',
        'TRANSVIE',
        'SUNU CLASSIQUE',
        'SUNU BUDGET'
      )
      .required(),
    pecs: Joi.array()
      .items(
        Joi.object({
          dateDebut: Joi.date().required(),
          dateFin: Joi.date().min(Joi.ref('dateDebut')).required(),
          prixReel: Joi.number().min(0).required(),
          montantPEC: Joi.number().min(0).required(),
          statut: Joi.string().valid('En attente', 'Accordée', 'Refusée'),
        })
      )
      .required(),
  });

  return schema.validate(data);
};

export const validatePaymentUpdate = (data) => {
  const schema = Joi.object({
    montantReel: Joi.number().min(0).required(),
  });

  return schema.validate(data);
};

export const validateExit = (data) => {
  const schema = Joi.object({
    typeSortie: Joi.string().valid('Exéat', 'Décès').required(),
    dateSortie: Joi.date().required(),
  });

  return schema.validate(data);
};
