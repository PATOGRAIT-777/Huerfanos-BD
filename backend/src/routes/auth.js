const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const upload = require('../middleware/upload');
const jwt = require('jsonwebtoken');

// simple middleware to protect routes
function ensureAuth(req, res, next) {
    const auth = req.headers.authorization;
    if (!auth || !auth.startsWith('Bearer ')) {
        return res.status(401).json({ message: 'Authorization required' });
    }
    const token = auth.split(' ')[1];
    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.user = decoded;
        next();
    } catch (err) {
        return res.status(401).json({ message: 'Invalid token' });
    }
}

// Registro de personal
router.post('/register', authController.register);

// Login
router.post('/login', authController.login);

// --- RUTAS NUEVAS (Estas faltaban y causaban el error 404 en perfil) ---
router.get('/profile', ensureAuth, authController.getProfile);
router.get('/profile/:id', ensureAuth, authController.getProfile); // can also fetch by path param
router.put('/update-user', ensureAuth, authController.updateUser);
router.post('/change-password', ensureAuth, authController.changePassword);
router.get('/my-pets', ensureAuth, authController.getUserPets);

// ADMIN/STAFF OPERATIONS
router.get('/users', ensureAuth, authController.listUsers);            // list all personnel
router.patch('/users/:id/status', ensureAuth, authController.changeStatus); // change activo/inactivo
router.delete('/users/:id', ensureAuth, authController.deleteUser);     // physical delete

module.exports = router;