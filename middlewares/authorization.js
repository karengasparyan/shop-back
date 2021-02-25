const jwt = require('jsonwebtoken');
const HttpError = require('http-errors');

const { JWT_SECRET } = process.env;

function authorization(req, res, next) {
  try {
    const { method } = req;

    if (method === 'OPTIONS') {
      next();
      return;
    }
    const token = (req.headers.authorization || '').replace('Bearer ', '');

    let userId;
    try {
      const data = jwt.verify(token, JWT_SECRET);
      userId = data.userId;
    } catch (e) {
      //
    }
    if (!userId) {
      throw HttpError(403, 'invalid token');
    }

    req.userId = userId;
    next();
  } catch (e) {
    next(e);
  }
}

export default authorization;
