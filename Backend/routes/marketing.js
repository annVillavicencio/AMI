const express = require('express');
const router = express.Router();
const { sql, getPool } = require('../db');

// Obtener todas las campañas de marketing
router.get('/', async (req, res) => {
    try {
        const pool = await getPool();
        const result = await pool.request().query(`
            SELECT idCampaña, NombreCampaña, FechaInicio, FechaFin, PresupuestoInvertido, EstadoCampana 
            FROM CampañasMarketing ORDER BY idCampaña DESC
        `);
        res.json(result.recordset);
    } catch (err) { 
        console.error("Error al obtener campañas:", err);
        res.status(500).json({ error: err.message }); 
    }
});

// Obtener una campaña por ID
router.get('/:id', async (req, res) => {
    try {
        const pool = await getPool();
        const { id } = req.params;
        const result = await pool.request()
            .input('id', sql.Int, id)
            .query('SELECT * FROM CampañasMarketing WHERE idCampaña = @id');
        if (result.recordset.length === 0) {
            return res.status(404).json({ error: 'Campaña no encontrada' });
        }
        res.json(result.recordset[0]);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Crear nueva campaña
router.post('/', async (req, res) => {
    try {
        const pool = await getPool();
        const { NombreCampaña, FechaInicio, FechaFin, PresupuestoInvertido, EstadoCampana } = req.body;

        if (!NombreCampaña || !FechaInicio || !FechaFin) {
            return res.status(400).json({ error: 'Nombre, Fecha de Inicio y Fecha de Fin son obligatorios.' });
        }

        const insertQuery = `
            INSERT INTO CampañasMarketing (NombreCampaña, FechaInicio, FechaFin, PresupuestoInvertido, EstadoCampana)
            VALUES (@NombreCampaña, @FechaInicio, @FechaFin, @PresupuestoInvertido, @EstadoCampana);
            SELECT SCOPE_IDENTITY() AS idCampaña;
        `;

        const result = await pool.request()
            .input('NombreCampaña', sql.VarChar(100), NombreCampaña)
            .input('FechaInicio', sql.Date, FechaInicio)
            .input('FechaFin', sql.Date, FechaFin)
            .input('PresupuestoInvertido', sql.Decimal(18, 2), PresupuestoInvertido || 0)
            .input('EstadoCampana', sql.VarChar(50), EstadoCampana || 'Planificada')
            .query(insertQuery);

        res.status(201).json({ 
            message: 'Campaña creada con éxito', 
            idCampaña: result.recordset[0].idCampaña 
        });
    } catch (err) {
        console.error("Error al crear campaña:", err);
        res.status(500).json({ error: err.message });
    }
});

// Actualizar campaña existente
router.put('/:id', async (req, res) => {
    try {
        const pool = await getPool();
        const { id } = req.params;
        const { NombreCampaña, FechaInicio, FechaFin, PresupuestoInvertido, EstadoCampana } = req.body;

        const updateQuery = `
            UPDATE CampañasMarketing
            SET NombreCampaña = @NombreCampaña,
                FechaInicio = @FechaInicio,
                FechaFin = @FechaFin,
                PresupuestoInvertido = @PresupuestoInvertido,
                EstadoCampana = @EstadoCampana
            WHERE idCampaña = @id
        `;

        await pool.request()
            .input('id', sql.Int, id)
            .input('NombreCampaña', sql.VarChar(100), NombreCampaña)
            .input('FechaInicio', sql.Date, FechaInicio)
            .input('FechaFin', sql.Date, FechaFin)
            .input('PresupuestoInvertido', sql.Decimal(18, 2), PresupuestoInvertido || 0)
            .input('EstadoCampana', sql.VarChar(50), EstadoCampana || 'Planificada')
            .query(updateQuery);

        res.json({ message: 'Campaña actualizada con éxito' });
    } catch (err) {
        console.error("Error al actualizar campaña:", err);
        res.status(500).json({ error: err.message });
    }
});

// Eliminar campaña
router.delete('/:id', async (req, res) => {
    try {
        const pool = await getPool();
        const { id } = req.params;

        // Primero eliminar interacciones vinculadas para evitar error de FK
        await pool.request()
            .input('id', sql.Int, id)
            .query('DELETE FROM Iteracciones WHERE idCampaña = @id');

        // Luego eliminar la campaña
        const result = await pool.request()
            .input('id', sql.Int, id)
            .query('DELETE FROM CampañasMarketing WHERE idCampaña = @id');

        res.json({ message: 'Campaña eliminada correctamente' });
    } catch (err) {
        console.error("Error al eliminar campaña:", err);
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
