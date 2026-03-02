document.addEventListener("DOMContentLoaded", () => {
    // 1. Lógica para mostrar las tarjetas con efecto suave al hacer scroll
    const cards = document.querySelectorAll('.card');
    const observerOptions = {
        threshold: 0.2
    };

    const observer = new IntersectionObserver((entries, observer) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('visible'); // Activa el CSS de opacidad
                observer.unobserve(entry.target);
            }
        });
    }, observerOptions);

    cards.forEach(card => {
        observer.observe(card);
    });

    // 2. Lógica del clic en el título de "Nodos"
    const tituloGrafo = document.getElementById('miGrafo');
    
    if (tituloGrafo) {
        tituloGrafo.addEventListener('click', function() {
            const pagAlgor = 'grafo.html';
            window.open(pagAlgor, '_blank');
        });
    }
});