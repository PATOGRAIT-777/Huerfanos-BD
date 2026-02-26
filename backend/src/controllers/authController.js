const db = require('../config/database');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'secret';

// 1. REGISTRO
exports.register = async (req, res) => {
  try {
    const body = req.body || {};
    const {
      rol = 'Director', // default profesión si no se envía
      usr, nombre, apellidos, curp, rfc,
      sexo, edad,
      tipo_contrato = 'Empleado', // Empleado o Voluntario
      email, telefono, telefono2, calle_num, num_int,
      estado, municipio, colonia, cp,
      id_type, id_number
    } = body;

    if (!email || !body.password) {
      return res.status(400).json({ message: 'Email y contraseña son requeridos' });
    }

    // Verificar si existe
    const exists = await db.query('SELECT id FROM usuarios WHERE email = $1', [email]);
    if (exists.rows.length > 0) return res.status(409).json({ message: 'El correo ya está registrado' });

    // Hash password
    const passwordHash = await bcrypt.hash(body.password, 10);

    // Buscar Ubicación ID
    let ubicacionId = null;
    if (estado && municipio && colonia) {
      const u = await db.query(
        'SELECT id FROM mx_divisiones WHERE estado = $1 AND municipio = $2 AND colonia = $3 LIMIT 1',
        [estado, municipio, colonia]
      );
      if (u.rows.length > 0) ubicacionId = u.rows[0].id;
    }

    const nombre_completo = ((nombre || '') + ' ' + (apellidos || '')).trim() || usr || email;

    // Insertar Usuario (personal)
    const insertQ = `
      INSERT INTO usuarios
      (email, password_hash, rol, nombre_completo, rfc, curp, sexo, edad, tipo_contrato,
       telefono, telefono_secundario, calle, num_exterior, num_interior, ubicacion_id,
       id_type, id_number, estatus)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18)
      RETURNING id, email, rol, nombre_completo, estatus
    `;

    const vals = [
      email, passwordHash, rol, nombre_completo, rfc || null, curp || null,
      sexo || null, edad || null, tipo_contrato,
      telefono || null, telefono2 || null,
      calle_num || null, null, num_int || null, ubicacionId,
      id_type || null, id_number || null, 'Activo'
    ];

    const result = await db.query(insertQ, vals);
    const user = result.rows[0];

    // Token
    const token = jwt.sign({ userId: user.id, email: user.email, rol: user.rol }, JWT_SECRET, { expiresIn: '8h' });

    res.status(201).json({ message: 'Usuario registrado', user, token });

  } catch (err) {
    console.error('Error en register:', err);
    res.status(500).json({ message: 'Error interno' });
  }
};

// 2. LOGIN
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body || {};
    if (!email || !password) return res.status(400).json({ message: 'Datos incompletos' });

    const q = await db.query('SELECT id, email, password_hash, rol, nombre_completo, estatus FROM usuarios WHERE email = $1', [email]);
    if (q.rows.length === 0) return res.status(401).json({ message: 'Credenciales inválidas' });

    const user = q.rows[0];
    if (user.estatus !== 'Activo') {
      return res.status(403).json({ message: 'Usuario no activo' });
    }

    const match = await bcrypt.compare(password, user.password_hash);
    if (!match) return res.status(401).json({ message: 'Credenciales inválidas' });

    const token = jwt.sign({ userId: user.id, email: user.email, rol: user.rol }, JWT_SECRET, { expiresIn: '8h' });
    
    // IMPORTANTE: Devolvemos el objeto user limpio
    const safeUser = { id: user.id, email: user.email, rol: user.rol, nombre_completo: user.nombre_completo };
    res.json({ token, user: safeUser });

  } catch (err) {
    console.error('Error en login:', err);
    res.status(500).json({ message: 'Error interno' });
  }
};

// 3. OBTENER PERFIL 
exports.getProfile = async (req, res) => {
  try {
    // support query param, path param or token
    let id = req.query.id || req.params.id;
    if (!id && req.user && req.user.userId) {
      id = req.user.userId;
    }
    if (!id) return res.status(400).json({ message: 'Falta ID' });

    const query = `
      SELECT 
        u.nombre_completo, u.email, u.telefono, u.telefono_secundario,
        u.calle, u.num_exterior, u.num_interior, u.password_hash,
        u.id_type, u.id_number, u.rfc, u.curp, u.sexo, u.edad, u.tipo_contrato, u.rol, u.estatus,
        mx.codigo_postal, mx.estado, mx.municipio, mx.colonia
      FROM usuarios u
      LEFT JOIN mx_divisiones mx ON u.ubicacion_id = mx.id
      WHERE u.id = $1
    `;
    const result = await db.query(query, [id]);

    if (result.rows.length === 0) return res.status(404).json({ message: 'Usuario no encontrado' });

    const u = result.rows[0];
    res.json({
      nombre_completo: u.nombre_completo,
      email: u.email,
      telefono: u.telefono,
      telefono_secundario: u.telefono_secundario,
      calle: u.calle,
      num_exterior: u.num_exterior,
      num_interior: u.num_interior,
      id_type: u.id_type,
      id_number: u.id_number,
      rfc: u.rfc,
      curp: u.curp,
      sexo: u.sexo,
      edad: u.edad,
      tipo_contrato: u.tipo_contrato,
      rol: u.rol,
      estatus: u.estatus,
      password_hash: u.password_hash, // Necesario para validar cambio de pass
      ubicacion: {
        codigo_postal: u.codigo_postal || '',
        estado: u.estado || '',
        municipio: u.municipio || '',
        colonia: u.colonia || ''
      }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Error al obtener perfil' });
  }
};

// 4. ACTUALIZAR PERFIL
exports.updateUser = async (req, res) => {
  // Lógica para actualizar datos básicos y ubicación, así como campos de personal
  const { id, nombre_completo, telefono, telefono_secundario, calle, num_exterior, num_interior,
          id_type, id_number, estado, municipio, colonia,
          rfc, curp, sexo, edad, tipo_contrato, rol, estatus } = req.body;
  try {
    // Buscar ID de ubicación
    let ubicacionId = null;
    if (estado && municipio && colonia) {
      const u = await db.query('SELECT id FROM mx_divisiones WHERE estado=$1 AND municipio=$2 AND colonia=$3 LIMIT 1', [estado, municipio, colonia]);
      if (u.rows.length > 0) ubicacionId = u.rows[0].id;
    }

    await db.query(`
      UPDATE usuarios SET 
        nombre_completo=$1, telefono=$2, telefono_secundario=$3,
        calle=$4, num_exterior=$5, num_interior=$6,
        id_type=$7, id_number=$8, ubicacion_id=$9,
        rfc=$10, curp=$11, sexo=$12, edad=$13,
        tipo_contrato=$14, rol=$15, estatus=$16
      WHERE id=$17
    `, [
      nombre_completo, telefono, telefono_secundario,
      calle, num_exterior, num_interior,
      id_type, id_number, ubicacionId,
      rfc||null, curp||null, sexo||null, edad||null,
      tipo_contrato||null, rol||null, estatus||null,
      id
    ]);
    
    res.json({ success: true, message: 'Actualizado' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Error al guardar' });
  }
};

// 5. CAMBIAR PASSWORD
exports.changePassword = async (req, res) => {
  const { id, current_password, new_password } = req.body;

  try {
    // 1. Verificar que lleguen los datos
    if (!id || !current_password || !new_password) {
      return res.status(400).json({ success: false, message: 'Faltan datos' });
    }

    // 2. Obtener el hash actual de la BD
    const result = await db.query('SELECT password_hash FROM usuarios WHERE id = $1', [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Usuario no encontrado' });
    }

    const user = result.rows[0];

    // 3. VERIFICACIÓN DE SEGURIDAD: Comparar contraseña actual
    const validPassword = await bcrypt.compare(current_password, user.password_hash);
    if (!validPassword) {
      return res.status(401).json({ success: false, message: 'La contraseña actual es incorrecta' });
    }

    // 4. Encriptar la NUEVA contraseña
    const newHash = await bcrypt.hash(new_password, 10);

    // 5. Actualizar en la BD
    await db.query('UPDATE usuarios SET password_hash = $1 WHERE id = $2', [newHash, id]);

    res.json({ success: true, message: 'Contraseña actualizada correctamente' });

  } catch (err) {
    console.error('Error al cambiar password:', err);
    res.status(500).json({ success: false, message: 'Error interno del servidor' });
  }
};

// 6. OBTENER MASCOTAS DEL USUARIO
exports.getUserPets = async (req, res) => {
  const { id } = req.query; // ID del usuario
  if (!id) return res.status(400).json({ message: 'Falta ID de usuario' });

  try {
    // Traemos ID, Nombre, Fecha Nacimiento y la URL de la foto (si tiene)
    const query = `
      SELECT 
        m.id, m.nombre, m.fecha_nacimiento, m.sexo,
        a.url as foto_url
      FROM mascotas m
      LEFT JOIN archivos a ON m.foto_perfil_id = a.id
      WHERE m.propietario_id = $1
      ORDER BY m.creado_en DESC
    `;
    
    const result = await db.query(query, [id]);
    
    // Devolvemos la lista (puede estar vacía si es nuevo)
    res.json(result.rows); 

  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Error al cargar mascotas' });
  }
};

// 6. LISTAR PERSONAL (Dashboard)
exports.listUsers = async (req, res) => {
  try {
    const result = await db.query(
      `SELECT id, nombre_completo, rol, tipo_contrato, estatus, email
       FROM usuarios
       ORDER BY nombre_completo`
    );
    res.json(result.rows);
  } catch (err) {
    console.error('Error listando usuarios:', err);
    res.status(500).json({ message: 'Error interno' });
  }
};

// 7. CAMBIAR ESTATUS (Activo/Inactivo)
exports.changeStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { estatus } = req.body;
    if (!id || !estatus) return res.status(400).json({ message: 'Faltan parámetros' });

    await db.query('UPDATE usuarios SET estatus=$1 WHERE id=$2', [estatus, id]);
    res.json({ success: true });
  } catch (err) {
    console.error('Error cambiando estatus:', err);
    res.status(500).json({ success: false, message: 'Error interno' });
  }
};

// 8. ELIMINAR USUARIO (Baja física)
exports.deleteUser = async (req, res) => {
  try {
    const { id } = req.params;
    if (!id) return res.status(400).json({ message: 'Falta ID' });

    await db.query('DELETE FROM usuarios WHERE id=$1', [id]);
    res.json({ success: true });
  } catch (err) {
    console.error('Error eliminando usuario:', err);
    res.status(500).json({ success: false, message: 'Error interno' });
  }
};