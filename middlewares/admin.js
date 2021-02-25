
function admin(req, res, next) {
  try {

    next();
  } catch (e) {
    next(e);
  }
}

export default admin;
