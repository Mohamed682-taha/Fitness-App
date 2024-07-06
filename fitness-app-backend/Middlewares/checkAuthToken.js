const jwt = require('jsonwebtoken');

function checkAuth(req, res, next) {
  const authToken = req.cookies.authToken;
  if (!authToken) {
    return res.status(401).json({ message: 'Authentication failed: No authToken', ok: false });
  }

  jwt.verify(authToken, process.env.JWT_SECRET_KEY, (err, decoded) => {
    if (err) {
      return res.status(401).json({ message: 'Authentication failed', ok: false });
    } else {
      req.userId = decoded.userId;
      next()
    }
  })

}


module.exports = checkAuth;
