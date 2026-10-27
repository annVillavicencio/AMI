/**
 * AMI - Perfil de Usuario
 * Carga de datos reales, visualización de privilegios y actualización de información personal y contraseña
 */

document.addEventListener('DOMContentLoaded', () => {
    cargarDatosPerfil();
    configurarEventosPerfil();
});

let datosUsuarioActual = null;

// 1. Consultar y poblar la información del perfil del usuario logueado
async function cargarDatosPerfil() {
    const sesionStr = localStorage.getItem('usuario_ami');
    if (!sesionStr) {
        window.location.href = '../Login.html';
        return;
    }

    const sesion = JSON.parse(sesionStr);
    const idUsuario = sesion.id;

    try {
        const resp = await fetch(`/api/usuarios/perfil/${idUsuario}`);
        if (!resp.ok) {
            throw new Error('No se pudo obtener la información del perfil.');
        }

        const data = await resp.json();
        datosUsuarioActual = data;
        poblarVistaPerfil(data);

    } catch (err) {
        console.error('Error cargando perfil:', err);
        // Fallback a los datos de la sesión guardada
        poblarVistaPerfil({
            idUsuario: sesion.id,
            correo: sesion.correo,
            NombreRol: sesion.rol,
            EstadoUser: 'Activo',
            NombreEmpleado: (sesion.nombre || '').split(' ')[0] || '',
            ApellidoEmpleado: (sesion.nombre || '').split(' ').slice(1).join(' ') || '',
            Cedula: 'N/D',
            CodigoEmpleado: 'N/D',
            NombreCargo: 'Colaborador',
            NombreDepartamento: 'General',
            fechaCreacion: 'N/D',
            permisos: sesion.permisos || []
        });
    }
}

// 2. Poblar todos los elementos del DOM con la información
function poblarVistaPerfil(user) {
    const nombreCompleto = (user.NombreEmpleado && user.ApellidoEmpleado)
        ? `${user.NombreEmpleado} ${user.ApellidoEmpleado}`
        : (user.NombreEmpleado || user.correo);

    // Hero Banner
    const elHeroNombre = document.getElementById('perfil-hero-nombre');
    if (elHeroNombre) elHeroNombre.textContent = nombreCompleto;

    const elHeroRol = document.getElementById('perfil-hero-rol');
    if (elHeroRol) elHeroRol.textContent = user.NombreRol || 'Usuario';

    const elHeroCargo = document.getElementById('perfil-hero-cargo');
    if (elHeroCargo) elHeroCargo.textContent = `${user.NombreCargo || 'Colaborador'} • ${user.NombreDepartamento || 'General'}`;

    const elHeroFecha = document.getElementById('perfil-hero-fecha');
    if (elHeroFecha) {
        elHeroFecha.innerHTML = `<i class="bi bi-calendar3 me-1"></i> Miembro desde: ${user.fechaCreacion || 'N/D'}`;
    }

    // Formulario Inputs
    const inputNombre = document.getElementById('perfil-input-nombre');
    if (inputNombre) inputNombre.value = user.NombreEmpleado || '';

    const inputApellido = document.getElementById('perfil-input-apellido');
    if (inputApellido) inputApellido.value = user.ApellidoEmpleado || '';

    const inputCorreo = document.getElementById('perfil-input-correo');
    if (inputCorreo) inputCorreo.value = user.correo || '';

    const inputCedula = document.getElementById('perfil-input-cedula');
    if (inputCedula) inputCedula.value = user.Cedula || 'N/D';

    const inputCodigo = document.getElementById('perfil-input-codigo');
    if (inputCodigo) inputCodigo.value = user.CodigoEmpleado || 'N/D';

    const inputCargo = document.getElementById('perfil-input-cargo');
    if (inputCargo) inputCargo.value = user.NombreCargo || 'Colaborador';

    const inputDepto = document.getElementById('perfil-input-depto');
    if (inputDepto) inputDepto.value = user.NombreDepartamento || 'General';

    // Resumen en Columna Derecha
    const resRol = document.getElementById('perfil-resumen-rol');
    if (resRol) resRol.textContent = user.NombreRol || 'Usuario';

    const resEstado = document.getElementById('perfil-resumen-estado');
    if (resEstado) resEstado.textContent = user.EstadoUser || 'Activo';

    const resFecha = document.getElementById('perfil-resumen-fecha');
    if (resFecha) resFecha.textContent = user.fechaCreacion || 'N/D';

    const resCodigo = document.getElementById('perfil-resumen-codigo');
    if (resCodigo) resCodigo.textContent = user.CodigoEmpleado || 'N/D';

    const resCargo = document.getElementById('perfil-resumen-cargo');
    if (resCargo) resCargo.textContent = user.NombreCargo || 'Colaborador';

    const resDepto = document.getElementById('perfil-resumen-depto');
    if (resDepto) resDepto.textContent = user.NombreDepartamento || 'General';

    // Lista de Módulos Permitidos
    const contenedorModulos = document.getElementById('perfil-lista-modulos');
    if (contenedorModulos && user.permisos && user.permisos.length > 0) {
        contenedorModulos.innerHTML = user.permisos
            .filter(p => p.puedeVer)
            .map(p => `
                <div class="d-flex align-items-center justify-content-between py-1 border-bottom border-secondary border-opacity-10 small">
                    <span class="text-secondary"><i class="bi bi-check2-circle text-neon-green me-2"></i> ${p.modulo}</span>
                    <span class="badge bg-success bg-opacity-25 text-success small">Acceso</span>
                </div>
            `).join('');
    }
}

// 3. Configurar eventos de botones y alternar visibilidad de contraseña
function configurarEventosPerfil() {
    // Alternar visibilidad de contraseñas (ojito)
    const toggleButtons = document.querySelectorAll('.toggle-password-btn');
    toggleButtons.forEach(btn => {
        btn.addEventListener('click', function () {
            const targetId = this.getAttribute('data-target');
            const input = document.getElementById(targetId);
            const icon = this.querySelector('i');
            if (input) {
                if (input.type === 'password') {
                    input.type = 'text';
                    if (icon) {
                        icon.classList.remove('bi-eye');
                        icon.classList.add('bi-eye-slash');
                    }
                } else {
                    input.type = 'password';
                    if (icon) {
                        icon.classList.remove('bi-eye-slash');
                        icon.classList.add('bi-eye');
                    }
                }
            }
        });
    });

    // Botón Guardar Cambios
    const btnGuardar = document.getElementById('perfil-btn-guardar');
    if (btnGuardar) {
        btnGuardar.addEventListener('click', guardarCambiosPerfil);
    }

    // Botón Cancelar / Restablecer
    const btnCancelar = document.getElementById('perfil-btn-cancelar');
    if (btnCancelar) {
        btnCancelar.addEventListener('click', () => {
            if (datosUsuarioActual) {
                poblarVistaPerfil(datosUsuarioActual);
                // Limpiar inputs de contraseña
                const pAct = document.getElementById('perfil-pass-actual');
                const pNue = document.getElementById('perfil-pass-nueva');
                const pConf = document.getElementById('perfil-pass-confirmar');
                if (pAct) pAct.value = '';
                if (pNue) pNue.value = '';
                if (pConf) pConf.value = '';
                mostrarAlerta('Formulario restablecido a los valores originales.', 'info');
            }
        });
    }
}

// 4. Guardar cambios en el backend
async function guardarCambiosPerfil() {
    const sesionStr = localStorage.getItem('usuario_ami');
    if (!sesionStr) return;
    const sesion = JSON.parse(sesionStr);

    const inputNombre = document.getElementById('perfil-input-nombre');
    const inputApellido = document.getElementById('perfil-input-apellido');
    const inputCorreo = document.getElementById('perfil-input-correo');
    const inputPassActual = document.getElementById('perfil-pass-actual');
    const inputPassNueva = document.getElementById('perfil-pass-nueva');
    const inputPassConfirmar = document.getElementById('perfil-pass-confirmar');

    const nombre = inputNombre ? inputNombre.value.trim() : '';
    const apellido = inputApellido ? inputApellido.value.trim() : '';
    const correo = inputCorreo ? inputCorreo.value.trim() : '';
    const passActual = inputPassActual ? inputPassActual.value.trim() : '';
    const passNueva = inputPassNueva ? inputPassNueva.value.trim() : '';
    const passConfirmar = inputPassConfirmar ? inputPassConfirmar.value.trim() : '';

    if (!correo || !correo.includes('@')) {
        mostrarAlerta('Por favor ingresa un correo electrónico válido.', 'warning');
        return;
    }

    // Validación de cambio de contraseña
    if (passNueva.length > 0 || passConfirmar.length > 0) {
        if (!passActual) {
            mostrarAlerta('Para cambiar tu contraseña debes ingresar tu contraseña actual.', 'warning');
            if (inputPassActual) inputPassActual.focus();
            return;
        }
        if (passNueva.length < 4) {
            mostrarAlerta('La nueva contraseña debe tener al menos 4 caracteres.', 'warning');
            if (inputPassNueva) inputPassNueva.focus();
            return;
        }
        if (passNueva !== passConfirmar) {
            mostrarAlerta('La nueva contraseña y su confirmación no coinciden.', 'danger');
            if (inputPassConfirmar) inputPassConfirmar.focus();
            return;
        }
    }

    const btnGuardar = document.getElementById('perfil-btn-guardar');
    const textoOriginal = btnGuardar ? btnGuardar.innerHTML : '';
    if (btnGuardar) {
        btnGuardar.disabled = true;
        btnGuardar.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>Guardando...';
    }

    try {
        const resp = await fetch(`/api/usuarios/perfil/${sesion.id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                nombre,
                apellido,
                correo,
                contrasenaActual: passActual,
                nuevaContrasena: passNueva
            })
        });

        const data = await resp.json();

        if (!resp.ok) {
            throw new Error(data.error || 'Error al actualizar el perfil.');
        }

        // Actualizar sesión local con los nuevos datos
        const nuevoNombre = (nombre && apellido) ? `${nombre} ${apellido}` : (nombre || correo);
        sesion.nombre = nuevoNombre;
        sesion.correo = correo;
        localStorage.setItem('usuario_ami', JSON.stringify(sesion));

        // Actualizar nombre en navbar si existe
        const elNavName = document.getElementById('nombre-usuario');
        if (elNavName) {
            elNavName.innerHTML = `${nuevoNombre} <small class="text-secondary fw-normal">(${sesion.rol})</small> <i class="bi bi-chevron-down ms-1 text-muted"></i>`;
        }

        // Limpiar campos de contraseña
        if (inputPassActual) inputPassActual.value = '';
        if (inputPassNueva) inputPassNueva.value = '';
        if (inputPassConfirmar) inputPassConfirmar.value = '';

        mostrarAlerta('¡Tus cambios han sido guardados exitosamente!', 'success');

        // Recargar datos actualizados
        await cargarDatosPerfil();

    } catch (err) {
        console.error('Error al guardar perfil:', err);
        mostrarAlerta(err.message, 'danger');
    } finally {
        if (btnGuardar) {
            btnGuardar.disabled = false;
            btnGuardar.innerHTML = textoOriginal;
        }
    }
}

// 5. Utilidad para mostrar alertas flotantes o en banner
function mostrarAlerta(mensaje, tipo = 'success') {
    let alertContainer = document.getElementById('perfil-alert-container');
    if (!alertContainer) {
        alertContainer = document.createElement('div');
        alertContainer.id = 'perfil-alert-container';
        alertContainer.style.position = 'fixed';
        alertContainer.style.top = '25px';
        alertContainer.style.right = '25px';
        alertContainer.style.zIndex = '9999';
        alertContainer.style.maxWidth = '380px';
        document.body.appendChild(alertContainer);
    }

    const iconMap = {
        success: 'bi-check-circle-fill',
        danger: 'bi-exclamation-octagon-fill',
        warning: 'bi-exclamation-triangle-fill',
        info: 'bi-info-circle-fill'
    };
    const icon = iconMap[tipo] || 'bi-info-circle-fill';

    const alertEl = document.createElement('div');
    alertEl.className = `alert alert-${tipo} alert-dismissible fade show shadow-lg rounded-4 d-flex align-items-center mb-2`;
    alertEl.style.backgroundColor = tipo === 'success' ? '#122617' : (tipo === 'danger' ? '#2A1215' : '#2A2012');
    alertEl.style.color = '#FFF';
    alertEl.style.border = `1px solid ${tipo === 'success' ? '#22C55E' : (tipo === 'danger' ? '#EF4444' : '#F59E0B')}`;
    alertEl.innerHTML = `
        <i class="bi ${icon} fs-5 me-2" style="color: ${tipo === 'success' ? '#4ADE80' : (tipo === 'danger' ? '#F87171' : '#FBBF24')}"></i>
        <div class="small fw-semibold flex-grow-1">${mensaje}</div>
        <button type="button" class="btn-close btn-close-white ms-2" data-bs-dismiss="alert" aria-label="Close"></button>
    `;

    alertContainer.appendChild(alertEl);

    setTimeout(() => {
        alertEl.classList.remove('show');
        setTimeout(() => alertEl.remove(), 300);
    }, 4500);
}
