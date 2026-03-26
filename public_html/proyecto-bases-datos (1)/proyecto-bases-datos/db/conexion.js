const { Pool } = require('pg');

const pool = new Pool({
    user: 'postgres',
    host: 'localhost',
    database: 'fundacion_db',
    password: 'admin123',  // Cambia esto por tu contraseña
    port: 5432,
});

// Probar conexión
pool.connect((err, client, release) => {
    if (err) {
        console.error('❌ Error conectando a PostgreSQL:', err.message);
    } else {
        console.log('✅ Conectado a PostgreSQL');
        release();
    }
});

module.exports = pool;
