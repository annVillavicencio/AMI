const fs = require('fs');
const path = require('path');
const sql = require('mssql');

// Cargar variables de entorno
const envBackend = path.join(__dirname, '.env');
const envRoot = path.join(__dirname, '..', '.env');
if (fs.existsSync(envBackend)) {
    require('dotenv').config({ path: envBackend });
} else if (fs.existsSync(envRoot)) {
    require('dotenv').config({ path: envRoot });
}

const serverHost = process.env.DB_SERVER || 'localhost';
const isDocker = (serverHost && serverHost !== 'localhost' && serverHost !== '127.0.0.1') || process.env.DOCKER_CONTAINER === 'true';
const defaultPassword = isDocker ? 'Password123!' : '123';
const finalPassword = (process.env.DB_PASSWORD !== undefined && process.env.DB_PASSWORD !== '') 
    ? process.env.DB_PASSWORD 
    : defaultPassword;

const masterConfig = {
    server: serverHost,
    database: 'master', // Siempre conectar a master primero porque siempre existe
    port: parseInt(process.env.DB_PORT, 10) || 1433,
    options: {
        trustServerCertificate: true,
        encrypt: false,
    },
    user: process.env.DB_USER || 'sa',
    password: finalPassword,
};

async function waitForMaster(maxRetries = 25, delayMs = 3000) {
    for (let i = 1; i <= maxRetries; i++) {
        try {
            console.log(`[InitDB] Intentando conectar a SQL Server (master) en ${serverHost}:${masterConfig.port} (intento ${i}/${maxRetries})...`);
            const pool = await new sql.ConnectionPool(masterConfig).connect();
            await pool.request().query('SELECT 1 AS ready');
            console.log('[InitDB] Conexión establecida con éxito con SQL Server.');
            return pool;
        } catch (err) {
            console.log(`[InitDB] SQL Server no está listo todavía (${err.message}). Reintentando en ${delayMs / 1000}s...`);
            await new Promise(res => setTimeout(res, delayMs));
        }
    }
    throw new Error('[InitDB] No se pudo conectar a SQL Server master tras varios intentos.');
}

async function populateDatabase(poolAutos) {
    const sqlPath = path.join(__dirname, 'BaseDatos', 'Autos_AMI_Backup.sql');
    if (!fs.existsSync(sqlPath)) {
        console.error('[InitDB] No se encontró el archivo SQL en:', sqlPath);
        return;
    }

    console.log('[InitDB] Leyendo script SQL de inicialización:', sqlPath);
    const sqlContent = fs.readFileSync(sqlPath, 'utf8');

    // Separar bloques por GO
    const batches = sqlContent
        .split(/\bGO\b/i)
        .map(b => b.trim())
        .filter(b => b.length > 0 && !b.startsWith('USE [') && !b.startsWith('CREATE DATABASE ['));

    console.log(`[InitDB] Ejecutando ${batches.length} bloques SQL para crear tablas y datos...`);
    for (let i = 0; i < batches.length; i++) {
        try {
            await poolAutos.request().batch(batches[i]);
        } catch (batchErr) {
            if (!batches[i].includes('DROP TABLE')) {
                console.warn(`[InitDB] Advertencia en lote ${i + 1}:`, batchErr.message);
            }
        }
    }
    console.log('[InitDB] ¡Base de datos Autos_AMI inicializada y poblada exitosamente!');
}

async function initDatabaseIfNeeded() {
    let masterPool;
    try {
        masterPool = await waitForMaster();

        // 1. Verificar si Autos_AMI existe
        const dbCheck = await masterPool.request().query("SELECT name FROM sys.databases WHERE name = 'Autos_AMI'");
        let needsInit = false;

        if (dbCheck.recordset.length === 0) {
            console.log('[InitDB] La base de datos Autos_AMI no existe. Creándola desde master...');
            await masterPool.request().query('CREATE DATABASE [Autos_AMI]');
            needsInit = true;
        }

        await masterPool.close();

        // Conectar directamente a Autos_AMI
        const autosConfig = { ...masterConfig, database: 'Autos_AMI' };
        const autosPool = await new sql.ConnectionPool(autosConfig).connect();

        if (!needsInit) {
            const tablesCheck = await autosPool.request().query(`
                SELECT COUNT(*) AS total
                FROM sys.tables
                WHERE is_ms_shipped = 0
            `);
            if (tablesCheck.recordset[0].total === 0) {
                console.log('[InitDB] La base de datos existe pero está vacía. Poblando datos...');
                needsInit = true;
            } else {
                console.log(`[InitDB] La base de datos Autos_AMI ya cuenta con ${tablesCheck.recordset[0].total} tablas. No requiere inicialización.`);
            }
        }

        if (needsInit) {
            await populateDatabase(autosPool);
        }

        await autosPool.close();
        console.log('[InitDB] Proceso de verificación/inicialización finalizado con éxito.');

    } catch (error) {
        console.error('[InitDB] Error durante la inicialización:', error);
    }
}

if (require.main === module) {
    initDatabaseIfNeeded().then(() => {
        process.exit(0);
    });
}

module.exports = { initDatabaseIfNeeded };
