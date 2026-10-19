const path = require('path');
const fs = require('fs');

// Cargar .env de Backend o de raíz si existe
const envBackend = path.join(__dirname, '.env');
const envRoot = path.join(__dirname, '..', '.env');
if (fs.existsSync(envBackend)) {
    require('dotenv').config({ path: envBackend });
} else if (fs.existsSync(envRoot)) {
    require('dotenv').config({ path: envRoot });
} else {
    // Si no existe .env en la máquina del compañero, copiar desde .env.example automáticamente
    const envExample = path.join(__dirname, '.env.example');
    if (fs.existsSync(envExample)) {
        try {
            fs.copyFileSync(envExample, envBackend);
            require('dotenv').config({ path: envBackend });
            console.log('[DB] Se creó automáticamente Backend/.env a partir de .env.example');
        } catch (e) {}
    }
}

const sql = require('mssql');

// Detección inteligente de entorno
const serverHost = process.env.DB_SERVER || 'localhost';
const isDocker = (serverHost && serverHost !== 'localhost' && serverHost !== '127.0.0.1') || process.env.DOCKER_CONTAINER === 'true';

// En Docker (Linux) SQL Server exige contraseñas complejas: Password123!
// En local dev clásico: 123
const defaultPassword = isDocker ? 'Password123!' : '123';
const finalPassword = (process.env.DB_PASSWORD !== undefined && process.env.DB_PASSWORD !== '') 
    ? process.env.DB_PASSWORD 
    : defaultPassword;

// Configuración de la conexión
const config = {
    server: serverHost,
    database: process.env.DB_DATABASE || process.env.DB_NAME || 'Autos_AMI',
    port: parseInt(process.env.DB_PORT, 10) || 1433,
    options: {
        trustServerCertificate: true, // necesario en dev local y contenedores
        encrypt: false,               // desactivar TLS en desarrollo
    },

    // Autenticación Windows o SQL
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
        user: process.env.DB_USER || 'sa',
        password: finalPassword,
    })
};

// Pool compartido
let pool;

/**
 * Obtiene (o crea) un pool de conexiones activo.
 */
async function getPool() {
    if (!pool) {
        try {
            console.log(`[DB] Conectando a ${config.server}:${config.port}/${config.database} como '${config.user}'...`);
            pool = await sql.connect(config);
            console.log(`[DB] Conectado exitosamente a SQL Server (${config.server}:${config.port}/${config.database})`);
        } catch (err) {
            console.error(`[DB] Error al conectar a la base de datos (${config.server}:${config.port}):`, err.message);
            throw err;
        }
    }
    return pool;
}

module.exports = { getPool, sql };
