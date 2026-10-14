// se cargan las variables del archivo .env
require('dotenv').config();
const sql = require('mssql');

// configuración de la conexión (con valores por defecto)
const config = {
    server: process.env.DB_SERVER || 'localhost',
    database: process.env.DB_DATABASE || process.env.DB_NAME || 'Autos_AMI',
    // puerto (útil si la instancia usa otro)
    port: parseInt(process.env.DB_PORT, 10) || 1433,
    // si usas una instancia nombrada:
    // instanceName: process.env.DB_INSTANCE,

    options: {
        trustServerCertificate: true, // necesario en dev local y contenedores
        encrypt: false,               // desactivar TLS en desarrollo
    },

    // Si habilitamos Windows Authentication
    ...(process.env.DB_WINDOWS_AUTH === 'true' ? {
        authentication: {
            type: 'ntlm',
            options: {
                userName: '',
                password: '',
                domain: ''
            }
        }
    } : {
        // Autenticación SQL (usuario + contraseña)
        user: process.env.DB_USER || 'sa',
        password: process.env.DB_PASSWORD || '',
    })
};

// pool compartido
let pool;

/**
 * Obtiene (o crea) un pool de conexiones activo.
 */
async function getPool() {
    if (!pool) {
        try {
            pool = await sql.connect(config);
        } catch (err) {
            console.error('No se pudo conectar a la base de datos:', err);
            throw err;
        }
    }
    return pool;
}

module.exports = { getPool, sql };
