function headers(req, res, next) {
  try {
    const { origin } = req.headers;
    const allow = [
      'http://localhost:3000',
      'http://localhost:3001',
      'https:example.com',
    ];
    if (allow.includes(origin)) {
      res.setHeader('Access-Control-Allow-Origin', origin);
      res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,OPTION,DELETE,PATCH');
      res.setHeader('Access-Control-Allow-Headers', 'Authorization,Content-Type,X-Location');
    }
    next();
  } catch (e) {
    next(e);
  }
}

export default headers;
