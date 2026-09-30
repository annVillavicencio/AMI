// se cargan las variables del archivo .env
require('dotenv').config();
const sql = require('mssql');

// configuración de la conexión (con valores por defecto)
const config = {
    server: process.env.DB_SERVER || 'localhost',
    database: process.env.DB_DATABASE || 'Autos_AMI',
    // puerto (útil si la instancia usa otro)
    port: parseInt(process.env.DB_PORT, 10) || 1433,
    // si usas una instancia nombrada:
    // instanceName: process.env.DB_INSTANCE,

    options: {
        trustServerCertificate: true, // necesario en dev local
        encrypt: false,               // desactivar TLS en desarrollo
    },

    // Si habilitamos Windows Authentication
    ...(process.env.DB_WINDOWS_AUTH === 'true' ? {
        authentication: {
            type: 'ntlm',
            options: {
                // userName y password vacíos indican "integrated security"
                // El driver toma el usuario de Windows que ejecuta node
                userName: '',
                password: '',
                // domain opcional, normalmente no se necesita en localhost
                domain: ''
            }
        }
    } : {
        // Autenticación SQL (usuario + contraseña)
        user: process.env.DB_USER || '',
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
            // crea la conexión una sola vez
            pool = await sql.connect(config);
        } catch (err) {
            console.error('No se pudo conectar a la base de datos:', err);
            throw err;
        }
    }
    return pool;
}

module.exports = { getPool, sql };
