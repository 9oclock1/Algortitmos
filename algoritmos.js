document.addEventListener("DOMContentLoaded", () => {
    const cards = document.querySelectorAll('.card');
    const observerOptions = {
        threshold: 0.2
    };

    const observer = new IntersectionObserver((entries, observer) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('visible');
                observer.unobserve(entry.target);
            }
        });
    }, observerOptions);
    cards.forEach(card => {
        observer.observe(card);
    });
});
const imagen = document.getElementById('miGrafo');
        imagen.addEventListener('click', function() {
            const pagAlgor = 'grafo.html';
            window.open(pagAlgor, '_blank');
        });
    