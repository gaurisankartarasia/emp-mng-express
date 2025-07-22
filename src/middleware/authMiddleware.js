// import jwt from 'jsonwebtoken';
// import { models } from '../models/index.js';

// const { Employee } = models;

// /**
//  * @desc Middleware to protect routes by verifying JWT.
//  * It checks for a valid token and attaches the decoded user payload to the request object.
//  */
// export const protect = async (req, res, next) => {
//   let token;

//   // Check if the token is sent in the 'Authorization' header
//   if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
//     try {
//       // Get token from header (e.g., "Bearer <token>")
//       token = req.headers.authorization.split(' ')[1];

//       // Verify the token using the secret key
//       const decoded = jwt.verify(token, process.env.JWT_SECRET);

//       // Attach the user's payload to the request object for use in subsequent routes.
//       // We don't attach the full user object from the DB to keep it lightweight.
//       // The payload we created during login contains everything we need.
//       req.user = decoded;

//       next(); // Proceed to the next middleware or route handler
//     } catch (error) {
//       console.error('Token verification failed:', error);
//       res.status(401).json({ message: 'Not authorized, token failed.' });
//     }
//   }

//   if (!token) {
//     res.status(401).json({ message: 'Not authorized, no token.' });
//   }
// };

// /**
//  * @desc Higher-order function for permission-based authorization.
//  * It returns a middleware function that checks if the user has the required permission.
//  * @param {string} requiredPermission - The code_name of the permission to check for.
//  */
// export const hasPermission = (requiredPermission) => {
//   return (req, res, next) => {
//     // req.user is attached by the 'protect' middleware which should run before this.
//     const user = req.user;

//     if (!user) {
//       return res.status(401).json({ message: 'Not authorized.' });
//     }

//     // The master user can access anything, bypassing permission checks.
//     if (user.is_master) {
//       return next();
//     }

//     // Check if the user's permissions array includes the required permission.
//     if (user.permissions && user.permissions.includes(requiredPermission)) {
//       next(); // User has the permission, proceed.
//     } else {
//       // User is logged in but does not have the necessary permission.
//       res.status(403).json({ message: 'Forbidden. You do not have access to this resource.' });
//     }
//   };
// };







import jwt from 'jsonwebtoken';
import { sequelize } from '../models/index.js';

const Employee = sequelize.models.Employee;

export const protect = async (req, res, next) => {
  let token;
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    try {
      token = req.headers.authorization.split(' ')[1];
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      req.user = decoded;
      next();
    } catch (error) {
      res.status(401).json({ message: 'Not authorized, token failed.' });
    }
  }
  if (!token) {
    res.status(401).json({ message: 'Not authorized, no token.' });
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