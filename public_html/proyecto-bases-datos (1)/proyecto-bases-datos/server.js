const express = require('express');
const pool = require('./db/conexion');
const app = express();
const PORT = 3000;

// Middleware
app.use(express.json());
app.use(express.static('public'));

// Ruta para obtener todos los usuarios (DESDE POSTGRESQL)
app.get('/api/usuarios', async (req, res) => {
    try {
        const resultado = await pool.query('SELECT * FROM usuarios ORDER BY id');
        res.json(resultado.rows);
    } catch (error) {
        console.error('Error en BD:', error);
        res.status(500).json({ error: 'Error al obtener usuarios' });
    }
});

// Ruta para obtener UN usuario por ID
app.get('/api/usuarios/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const resultado = await pool.query('SELECT * FROM usuarios WHERE id = $1', [id]);
        
        if (resultado.rows.length === 0) {
            return res.status(404).json({ error: 'Usuario no encontrado' });
        }
        
        res.json(resultado.rows[0]);
    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({ error: 'Error al obtener usuario' });
    }
});

// Ruta para crear un nuevo usuario
app.post('/api/usuarios', async (req, res) => {
    try {
        const { 
            nombre_completo, 
            rfc, 
            curp, 
            sexo, 
            edad, 
            direccion, 
            tipo, 
            rol, 
            correo, 
            contrasena 
        } = req.body;
        
        const resultado = await pool.query(
            `INSERT INTO usuarios 
            (nombre_completo, rfc, curp, sexo, edad, direccion, tipo, rol, correo, contrasena) 
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) 
            RETURNING *`,
            [nombre_completo, rfc, curp, sexo, edad, direccion, tipo, rol, correo, contrasena]
        );
        
        res.status(201).json(resultado.rows[0]);
    } catch (error) {
        console.error('Error al crear:', error);
        res.status(500).json({ error: 'Error al crear usuario' });
    }
});

// Ruta de prueba
app.get('/api/test', (req, res) => {
    res.json({ 
        mensaje: 'Servidor funcionando',
        bd: 'Conectado a PostgreSQL'
    });
});
// Ruta para ACTUALIZAR un usuario (PUT)
app.put('/api/usuarios/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { 
            nombre_completo, 
            rfc, 
            curp, 
            sexo, 
            edad, 
            direccion, 
            tipo, 
            rol, 
            correo, 
            activo 
        } = req.body;
        
        const resultado = await pool.query(
            `UPDATE usuarios 
             SET nombre_completo = $1, 
                 rfc = $2, 
                 curp = $3, 
                 sexo = $4, 
                 edad = $5, 
                 direccion = $6, 
                 tipo = $7, 
                 rol = $8, 
                 correo = $9, 
                 activo = $10
             WHERE id = $11 
             RETURNING *`,
            [nombre_completo, rfc, curp, sexo, edad, direccion, tipo, rol, correo, activo, id]
        );
        
        if (resultado.rows.length === 0) {
            return res.status(404).json({ error: 'Usuario no encontrado' });
        }
        
        res.json(resultado.rows[0]);
    } catch (error) {
        console.error('Error al actualizar:', error);
        res.status(500).json({ error: 'Error al actualizar usuario' });
    }
});
// Ruta para ELIMINAR un usuario
app.delete('/api/usuarios/:id', async (req, res) => {
    try {
        const { id } = req.params;
        
        const resultado = await pool.query(
            'DELETE FROM usuarios WHERE id = $1 RETURNING *',
            [id]
        );
        
        if (resultado.rows.length === 0) {
            return res.status(404).json({ error: 'Usuario no encontrado' });
        }
        
        res.json({ mensaje: 'Usuario eliminado correctamente' });
    } catch (error) {
        console.error('Error al eliminar:', error);
        res.status(500).json({ error: 'Error al eliminar usuario' });
    }
});
// Ruta para cambiar estado (activar/revocar acceso)
app.patch('/api/usuarios/:id/estado', async (req, res) => {
    try {
        const { id } = req.params;
        const { activo } = req.body;
        
        const resultado = await pool.query(
            'UPDATE usuarios SET activo = $1 WHERE id = $2 RETURNING *',
            [activo, id]
        );
        
        if (resultado.rows.length === 0) {
            return res.status(404).json({ error: 'Usuario no encontrado' });
        }
        
        res.json({ 
            mensaje: `Acceso ${activo ? 'activado' : 'revocado'} correctamente`,
            usuario: resultado.rows[0]
        });
    } catch (error) {
        console.error('Error al cambiar estado:', error);
        res.status(500).json({ error: 'Error al cambiar estado' });
    }
});
// Iniciar servidor
app.listen(PORT, () => {
    console.log(`Servidor corriendo en http://localhost:${PORT}`);
    console.log(`API: http://localhost:${PORT}/api/usuarios`);
});
