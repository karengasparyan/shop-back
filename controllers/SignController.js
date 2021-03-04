import HttpError from 'http-errors';
import jwt from 'jsonwebtoken';
import validate from '../services/validate';

const { JWT_SECRET } = process.env;

class SignController {

  static signIn = async (req, res, next) => {
    try {
      await validate(req.body, {
        userName: 'required',
        password: 'required',
      });

      const { userName, password } = req.body
      const { USER_NAME, PASSWORD, USER_ID } = process.env

      if (userName !== USER_NAME || password !== PASSWORD) {
        throw HttpError(422, 'invalid username or password')
      }

      const token = jwt.sign({ userId: USER_ID }, JWT_SECRET);

      res.json({
        status: 'ok',
        token,
      });
    } catch (e) {

      next(e);
    }
  };

}

export default SignController;
