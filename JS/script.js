
document.addEventListener("DOMContentLoaded", function() {
    
    // 1. Lógica del Menú Lateral Activo
    const menuLinks = document.querySelectorAll('.sidebar-menu a');

    menuLinks.forEach(link => {
        link.addEventListener('click', function(e) {
            // Evita que la página intente recargar si el href es "#"
            if(this.getAttribute('href') === '#') {
                e.preventDefault();
            }

            // Remueve la clase activa de todos los enlaces
            menuLinks.forEach(l => {
                l.classList.remove('active-tab');
                l.classList.add('sidebar-link'); // Asegura que vuelvan a su estado normal
            });

            // Agrega la clase activa solo al botón presionado
            this.classList.remove('sidebar-link');
            this.classList.add('active-tab');
            
            // Aquí puedes agregar la lógica de enrutamiento (cambiar de ventana)
            // window.location.href = this.getAttribute('href'); 
        });
    });

    // 2. Simulación de Notificaciones Dinámicas
    // En el futuro, esta función consultará tu base de datos mediante una API
    function verificarNotificaciones(cantidadNuevas) {
        const dot = document.getElementById('notif-dot');
        
        if (cantidadNuevas > 0) {
            dot.classList.remove('d-none'); // Muestra el punto
        } else {
            dot.classList.add('d-none'); // Oculta el punto
        }
    }

    // Simulamos que el sistema detecta 1 alerta de stock bajo después de 2 segundos
    setTimeout(() => {
        verificarNotificaciones(1); 
    }, 2000);

});