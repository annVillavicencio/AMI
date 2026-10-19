const path = require('path');
const fs = require('fs');
const sql = require('mssql');

// Cargar .env de Backend o de raíz si existe
const envBackend = path.join(__dirname, '.env');
const envRoot = path.join(__dirname, '..', '.env');
if (fs.existsSync(envBackend)) {
    require('dotenv').config({ path: envBackend });
} else if (fs.existsSync(envRoot)) {
    require('dotenv').config({ path: envRoot });
} else {
    const envExample = path.join(__dirname, '.env.example');
    if (fs.existsSync(envExample)) {
        try {
            fs.copyFileSync(envExample, envBackend);
            require('dotenv').config({ path: envBackend });
            console.log('[DB] Se creó automáticamente Backend/.env a partir de .env.example');
        } catch (e) {}
    }
}

const serverHost = process.env.DB_SERVER || 'localhost';
const isDocker = (serverHost && serverHost !== 'localhost' && serverHost !== '127.0.0.1') || process.env.DOCKER_CONTAINER === 'true';

const defaultPassword = isDocker ? 'Password123!' : '123';
const finalPassword = (process.env.DB_PASSWORD !== undefined && process.env.DB_PASSWORD !== '') 
    ? process.env.DB_PASSWORD 
    : defaultPassword;

const targetDb = process.env.DB_DATABASE || process.env.DB_NAME || 'Autos_AMI';

const config = {
    server: serverHost,
    database: targetDb,
    port: parseInt(process.env.DB_PORT, 10) || 1433,
    options: {
        trustServerCertificate: true,
        encrypt: false,
    },
    ...(process.env.DB_WINDOWS_AUTH === 'true' ? {
        authentication: {
            type: 'ntlm',
            options: { userName: '', password: '', domain: '' }
        }
    } : {
        user: process.env.DB_USER || 'sa',
        password: finalPassword,
    })
};

let pool;

async function getPool() {
    if (!pool) {
        try {
            console.log(`[DB] Conectando a ${config.server}:${config.port}/${config.database} como '${config.user || 'windows_user'}'...`);
            pool = await new sql.ConnectionPool(config).connect();
            console.log(`[DB] Conectado exitosamente a SQL Server (${config.server}:${config.port}/${config.database})`);
        } catch (err) {
            console.warn(`[DB] Conexión inicial a ${targetDb} falló (${err.message}). Verificando a través de master...`);
            
            // Si falló (por ejemplo, Autos_AMI no existe aún en una máquina limpia), conectar a master
            try {
                const masterConfig = { ...config, database: 'master' };
                const masterPool = await new sql.ConnectionPool(masterConfig).connect();
                console.log('[DB] Conexión a master exitosa. Verificando base de datos ' + targetDb);
                
                const dbRes = await masterPool.request().query(`SELECT name FROM sys.databases WHERE name = '${targetDb}'`);
                if (dbRes.recordset.length === 0) {
                    console.log(`[DB] La base de datos '${targetDb}' no existe. Creándola automáticamente...`);
                    await masterPool.request().query(`CREATE DATABASE [${targetDb}]`);
                }
                await masterPool.close();
                
                // Reintentar conectar a la base de datos destino
                pool = await new sql.ConnectionPool(config).connect();
                console.log(`[DB] Conexión restablecida con éxito a ${targetDb}`);
                return pool;
            } catch (recoveryErr) {
                console.error(`[DB] Error crítico al conectar a la base de datos (${config.server}:${config.port}):`, err.message);
                throw err;
            }
        }
    }
    return pool;
}

module.exports = { getPool, sql };
