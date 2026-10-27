/**
 * AMI - Script Principal de Inicio / Dashboard
 * Gestión de navegación activa, verificación de alertas en tiempo real y modales interactivos
 */

document.addEventListener("DOMContentLoaded", function () {
    // 1. Lógica del Menú Lateral Activo
    const menuLinks = document.querySelectorAll('.sidebar-menu a');
    menuLinks.forEach(link => {
        link.addEventListener('click', function (e) {
            if (this.getAttribute('href') === '#') {
                e.preventDefault();
            }
            menuLinks.forEach(l => {
                l.classList.remove('active-tab');
                l.classList.add('sidebar-link');
            });
            this.classList.remove('sidebar-link');
            this.classList.add('active-tab');
        });
    });

    // 2. Cargar y evaluar alertas de Dashboard según datos reales y roles
    cargarAlertasDashboard();
});

let datosModelosBajoStock = [];
let datosOrdenesPendientes = [];

async function cargarAlertasDashboard() {
    const cardInventario = document.getElementById('card-alerta-inventario');
    const cardOrdenes = document.getElementById('card-alerta-ordenes');
    const cardSinAlertas = document.getElementById('card-sin-alertas');
    const badgeTotalAlertas = document.getElementById('badge-total-alertas');

    let totalAlertasVisibles = 0;

    // Verificar permisos del usuario actual
    const tienePermisoInventario = typeof window.tienePermiso === 'function' ? window.tienePermiso('Inventario', 'puedeVer') : true;
    const tienePermisoCompras = typeof window.tienePermiso === 'function' ? window.tienePermiso('Compras', 'puedeVer') : true;

    // A. Evaluar Alerta de Inventario Bajo
    if (tienePermisoInventario && cardInventario) {
        try {
            const respInv = await fetch('/api/inventario');
            if (respInv.ok) {
                const autos = await respInv.json();
                
                // Agrupar stock por Modelo
                const stockPorModelo = {};
                autos.forEach(a => {
                    const marca = a.Marca || 'Sin Marca';
                    const modelo = a.Modelo || 'Sin Modelo';
                    const key = `${marca} - ${modelo}`;
                    if (!stockPorModelo[key]) {
                        stockPorModelo[key] = {
                            marca,
                            modelo,
                            disponibles: 0,
                            vendidos: 0,
                            total: 0
                        };
                    }
                    stockPorModelo[key].total++;
                    const estado = (a.Estado || '').trim().toLowerCase();
                    if (estado === 'disponible') {
                        stockPorModelo[key].disponibles++;
                    } else if (estado === 'vendido') {
                        stockPorModelo[key].vendidos++;
                    }
                });

                // Filtrar modelos con 0 disponibles (agotado) o 1 disponible (crítico)
                datosModelosBajoStock = Object.values(stockPorModelo).filter(m => m.disponibles <= 1);
                
                // Ordenar: primero agotados (0), luego 1 disponible
                datosModelosBajoStock.sort((a, b) => a.disponibles - b.disponibles);

                if (datosModelosBajoStock.length > 0) {
                    cardInventario.style.display = 'block';
                    totalAlertasVisibles++;

                    const elContador = document.getElementById('contador-inventario-bajo');
                    const elDesc = document.getElementById('desc-inventario-bajo');

                    const agotados = datosModelosBajoStock.filter(m => m.disponibles === 0).length;
                    const criticos = datosModelosBajoStock.filter(m => m.disponibles === 1).length;

                    if (elContador) {
                        elContador.textContent = `${datosModelosBajoStock.length} modelos en alerta (${agotados} agotados, ${criticos} con 1 unidad)`;
                    }
                    if (elDesc) {
                        elDesc.textContent = `Se detectaron ${datosModelosBajoStock.length} modelos con stock agotado o en nivel crítico que requieren reposición.`;
                    }

                    // Configurar botón "Ver detalles"
                    const btnDetallesInv = document.getElementById('btn-detalles-inventario');
                    if (btnDetallesInv) {
                        btnDetallesInv.onclick = () => abrirModalInventario(datosModelosBajoStock);
                    }
                } else {
                    cardInventario.style.display = 'none';
                }
            } else {
                cardInventario.style.display = 'none';
            }
        } catch (err) {
            console.error('Error al consultar inventario:', err);
            cardInventario.style.display = 'none';
        }
    } else if (cardInventario) {
        cardInventario.style.display = 'none';
    }

    // B. Evaluar Alerta de Órdenes Pendientes
    if (tienePermisoCompras && cardOrdenes) {
        try {
            const respComp = await fetch('/api/compras');
            if (respComp.ok) {
                const compras = await respComp.json();
                
                // Filtrar compras con EstadoCompra que contenga 'pendiente' o 'por aprobar'
                datosOrdenesPendientes = compras.filter(c => {
                    const est = (c.EstadoCompra || '').trim().toLowerCase();
                    return est.includes('pendiente') || est.includes('aprobar') || est.includes('proceso');
                });

                if (datosOrdenesPendientes.length > 0) {
                    cardOrdenes.style.display = 'block';
                    totalAlertasVisibles++;

                    const elContador = document.getElementById('contador-ordenes-pendientes');
                    const elDesc = document.getElementById('desc-ordenes-pendientes');

                    if (elContador) {
                        elContador.textContent = `${datosOrdenesPendientes.length} orden(es) pendiente(s)`;
                    }
                    if (elDesc) {
                        elDesc.textContent = `Tienes ${datosOrdenesPendientes.length} orden(es) de compra pendientes de aprobación o recepción.`;
                    }

                    // Configurar botón "Ver detalles"
                    const btnDetallesOrd = document.getElementById('btn-detalles-ordenes');
                    if (btnDetallesOrd) {
                        btnDetallesOrd.onclick = () => abrirModalOrdenes(datosOrdenesPendientes);
                    }
                } else {
                    cardOrdenes.style.display = 'none';
                }
            } else {
                cardOrdenes.style.display = 'none';
            }
        } catch (err) {
            console.error('Error al consultar compras:', err);
            cardOrdenes.style.display = 'none';
        }
    } else if (cardOrdenes) {
        cardOrdenes.style.display = 'none';
    }

    // C. Si no hay alertas visibles para el usuario o su rol
    if (totalAlertasVisibles === 0) {
        if (cardSinAlertas) cardSinAlertas.style.display = 'block';
        if (badgeTotalAlertas) {
            badgeTotalAlertas.className = 'badge rounded-pill px-3 py-2 bg-success bg-opacity-25 text-success border border-success border-opacity-50';
            badgeTotalAlertas.innerHTML = '<i class="bi bi-check-circle me-1"></i> Todo al día (0 alertas)';
        }
    } else {
        if (cardSinAlertas) cardSinAlertas.style.display = 'none';
        if (badgeTotalAlertas) {
            badgeTotalAlertas.className = 'badge rounded-pill px-3 py-2 bg-danger bg-opacity-25 text-danger border border-danger border-opacity-50';
            badgeTotalAlertas.innerHTML = `<i class="bi bi-exclamation-triangle-fill me-1"></i> ${totalAlertasVisibles} alerta(s) activa(s)`;
        }
    }
}

// 3. Abrir Modal de Inventario Bajo
function abrirModalInventario(modelos) {
    const tbody = document.getElementById('tbody-modal-inventario');
    const badgeCount = document.getElementById('badge-modal-inventario-count');
    
    if (badgeCount) {
        badgeCount.textContent = `${modelos.length} modelos`;
    }

    if (tbody) {
        tbody.innerHTML = modelos.map((m, idx) => {
            const esAgotado = m.disponibles === 0;
            const badgeClass = esAgotado ? 'badge-agotado' : 'badge-critico';
            const estadoTexto = esAgotado ? '0 unid. (Agotado)' : `${m.disponibles} unid. (Crítico)`;
            const icon = esAgotado ? 'bi-x-circle-fill' : 'bi-exclamation-triangle-fill';

            return `
                <tr>
                    <td class="text-secondary small">${idx + 1}</td>
                    <td class="fw-bold text-white">${m.marca}</td>
                    <td class="text-white">${m.modelo}</td>
                    <td class="text-center">
                        <span class="badge ${badgeClass} rounded-pill px-3 py-1">
                            <i class="bi ${icon} me-1"></i> ${estadoTexto}
                        </span>
                    </td>
                    <td class="text-end">
                        <a href="Pages/inventario.html" class="btn btn-sm btn-outline-success rounded-pill px-3">
                            <i class="bi bi-arrow-right-circle me-1"></i> Ir a Inventario
                        </a>
                    </td>
                </tr>
            `;
        }).join('');
    }

    const modalEl = document.getElementById('modalDetallesInventario');
    if (modalEl) {
        const modal = bootstrap.Modal.getOrCreateInstance(modalEl);
        modal.show();
    }
}

// 4. Abrir Modal de Órdenes Pendientes
function abrirModalOrdenes(ordenes) {
    const tbody = document.getElementById('tbody-modal-ordenes');
    const badgeCount = document.getElementById('badge-modal-ordenes-count');

    if (badgeCount) {
        badgeCount.textContent = `${ordenes.length} órdenes`;
    }

    if (tbody) {
        tbody.innerHTML = ordenes.map((c, idx) => {
            const fechaStr = c.FechaCompra ? new Date(c.FechaCompra).toLocaleDateString('es-NI') : 'N/D';
            const totalFmt = (c.TotalCompra || 0).toLocaleString('es-NI', { style: 'currency', currency: 'USD' });
            return `
                <tr>
                    <td class="text-secondary small">${idx + 1}</td>
                    <td class="fw-bold text-white">${c.NumFactura || ('ORD-' + c.idCompra)}</td>
                    <td class="text-white">${c.Proveedor || 'Desconocido'}</td>
                    <td class="text-secondary small">${fechaStr}</td>
                    <td class="text-end fw-bold text-warning">${totalFmt}</td>
                    <td class="text-center">
                        <span class="badge badge-pendiente rounded-pill px-3 py-1">
                            <i class="bi bi-clock me-1"></i> ${c.EstadoCompra || 'Pendiente'}
                        </span>
                    </td>
                    <td class="text-end">
                        <a href="Pages/compras.html" class="btn btn-sm btn-outline-warning rounded-pill px-3">
                            <i class="bi bi-arrow-right-circle me-1"></i> Ir a Compras
                        </a>
                    </td>
                </tr>
            `;
        }).join('');
    }

    const modalEl = document.getElementById('modalDetallesOrdenes');
    if (modalEl) {
        const modal = bootstrap.Modal.getOrCreateInstance(modalEl);
        modal.show();
    }
}
