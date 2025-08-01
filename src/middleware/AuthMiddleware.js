

import jwt from 'jsonwebtoken';





export const protect = async (req, res, next) => {
  const token = req.cookies.token;
  

  if (token) {
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      req.user = decoded;
      next();
    } catch (error) {
      return res.status(401).json({ message: 'Not authorized, token failed.' });
    }
  } else {
    return res.status(401).json({ message: 'Not authorized, no token.' });
  }
};

export const hasPermission = (requiredPermissions) => {
  return (req, res, next) => {
    const { user } = req;

    if (!user) {
      return res.status(401).json({ message: 'Not authorized.' });
    }

    if (user.is_master) {
      return next();
    }

    const userPermissions = new Set(user.permissions || []);
    
    // Ensure requiredPermissions is an array
    const permissionsToCheck = Array.isArray(requiredPermissions) ? requiredPermissions : [requiredPermissions];

    // Check if the user has ALL of the required permissions
    const hasAllPermissions = permissionsToCheck.every(p => userPermissions.has(p));

    if (hasAllPermissions) {
      next();
    } else {
      res.status(403).json({ message: 'Forbidden. You do not have the required permissions for this action.' });
    }
  };
};