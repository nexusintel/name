
import Joi from 'joi';

export const teachingSchema = Joi.object({
  title: Joi.string().min(3).max(150).required(),
  speaker: Joi.string().min(3).max(100).required(),
  preached_at: Joi.date().iso().required(),
  category: Joi.string().min(2).max(50).required(),
  youtube_url: Joi.string().uri().required(),
  description: Joi.string().min(10).required(),
  // Allow created_at and _id to be present but don't require them
  created_at: Joi.date().iso().optional(),
  _id: Joi.string().optional(),
});
