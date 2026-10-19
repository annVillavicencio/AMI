const fs = require('fs');
const path = require('path');
const { getPool, sql } = require('./db');

async function waitForDb(maxRetries = 20, delayMs = 3000) {
    for (let i = 1; i <= maxRetries; i++) {
        try {
            console.log(`[InitDB] Intentando conectar a SQL Server (intento ${i}/${maxRetries})...`);
            const pool = await getPool();
            await pool.request().query('SELECT 1 AS test');
            console.log('[InitDB] Conexión establecida con éxito con SQL Server.');
            return pool;
        } catch (err) {
            console.log(`[InitDB] SQL Server no está listo todavía (${err.message}). Reintentando en ${delayMs / 1000}s...`);
            await new Promise(res => setTimeout(res, delayMs));
        }
    }
    throw new Error('[InitDB] No se pudo conectar a SQL Server tras varios intentos.');
}

async function initDatabaseIfNeeded() {
    try {
        const pool = await waitForDb();

        // 1. Verificar si la base de datos Autos_AMI existe
        const dbCheck = await pool.request().query("SELECT name FROM sys.databases WHERE name = 'Autos_AMI'");
        let needsInit = false;

        if (dbCheck.recordset.length === 0) {
            console.log('[InitDB] La base de datos Autos_AMI no existe. Creándola...');
            await pool.request().query('CREATE DATABASE [Autos_AMI]');
            needsInit = true;
        } else {
            // Verificar si tiene tablas
            const tablesCheck = await pool.request().query(`
                SELECT COUNT(*) AS total
                FROM [Autos_AMI].sys.tables
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
                .filter(b => b.length > 0);

            console.log(`[InitDB] Ejecutando ${batches.length} bloques SQL...`);
            for (let i = 0; i < batches.length; i++) {
                try {
                    await pool.request().batch(batches[i]);
                } catch (batchErr) {
                    // Ignorar errores menores de drop si no existe
                    if (!batches[i].includes('DROP TABLE')) {
                        console.warn(`[InitDB] Advertencia en lote ${i + 1}:`, batchErr.message);
                    }
                }
            }
            console.log('[InitDB] ¡Base de datos inicializada y poblada exitosamente!');
        }

    } catch (error) {
        console.error('[InitDB] Error durante la inicialización:', error);
    }
}

if (require.main === module) {
    initDatabaseIfNeeded().then(() => {
        console.log('[InitDB] Proceso completado.');
        process.exit(0);
    });
}

module.exports = { initDatabaseIfNeeded };
