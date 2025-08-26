
import AppError from '../../utils/AppError.js';

const validate = (schema) => (req, res, next) => {
  const { error } = schema.validate(req.body, { abortEarly: false, stripUnknown: true });

  if (error) {
    const errorMessage = error.details.map(detail => detail.message).join(', ');
    return next(new AppError(errorMessage, 400));
  }

  return next();
};

export default validate;
