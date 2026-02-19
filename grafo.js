const lienzo = document.getElementById('lienzo');
const capaVertices = document.getElementById('capa-vertices');
const capaAristas = document.getElementById('capa-aristas');
const lineaTemporal = document.getElementById('linea-temporal');
const listaNodosUI = document.getElementById('lista-nodos');

const btnDibujar = document.getElementById('btn-dibujar');
const btnMover = document.getElementById('btn-mover');
const btnEliminar = document.getElementById('btn-eliminar');

const RADIO_NODO = 20;
let contadorVertices = 0;
let listaVertices = []; 
let modoActual = 'dibujar'; 

let verticeOrigen = null;
let dibujandoArista = false;
let nodoArrastrado = null;
let offsetDrag = { x: 0, y: 0 };

function cambiarModo(nuevoModo) {
    modoActual = nuevoModo;
    
    // Resetear clases visuales
    if(btnDibujar) btnDibujar.classList.remove('active');
    if(btnMover) btnMover.classList.remove('active');
    if(btnEliminar) btnEliminar.classList.remove('active');
    
    // Activar botón y cursor
    if (modoActual === 'dibujar') {
        if(btnDibujar) btnDibujar.classList.add('active');
        lienzo.style.cursor = "crosshair";
    } else if (modoActual === 'mover') {
        if(btnMover) btnMover.classList.add('active');
        lienzo.style.cursor = "grab";
    } else if (modoActual === 'eliminar') {
        if(btnEliminar) btnEliminar.classList.add('active');
        lienzo.style.cursor = "not-allowed";
    }
}

// Listeners seguros (solo si existen los botones)
if(btnDibujar) btnDibujar.addEventListener('click', () => cambiarModo('dibujar'));
if(btnMover) btnMover.addEventListener('click', () => cambiarModo('mover'));
if(btnEliminar) btnEliminar.addEventListener('click', () => cambiarModo('eliminar'));


// --- 2. CREAR NODOS ---
lienzo.addEventListener('click', (e) => {
    // Depuración: Si esto no sale en la consola (F12), el JS no carga.
    // console.log("Click en lienzo. Modo:", modoActual, "Target:", e.target.id);

    if (modoActual !== 'dibujar') return;
    if (dibujandoArista) return;

    // Solo crear si se clickea el fondo SVG directamente
    if (e.target.id === 'lienzo') {
        crearVertice(e.clientX, e.clientY);
    }
});

function crearVertice(x, y) {
    contadorVertices++;
    const id = `v-${contadorVertices}`;
    
    // Guardar lógica
    listaVertices.push({ id: id, numero: contadorVertices });
    actualizarListaUI();

    // Crear Grupo SVG
    const grupo = document.createElementNS("http://www.w3.org/2000/svg", "g");
    grupo.setAttribute('class', 'vertice');
    grupo.setAttribute('transform', `translate(${x}, ${y})`);
    grupo.setAttribute('id', id);
    
    // Guardar coordenadas para movimiento
    grupo.dataset.cx = x;
    grupo.dataset.cy = y;

    // EVENTOS DEL NODO
    grupo.addEventListener('click', (e) => {
        if (modoActual === 'eliminar') {
            e.stopPropagation();
            eliminarVertice(id);
        }
    });

    grupo.addEventListener('mousedown', (e) => {
        if (modoActual === 'dibujar') {
            iniciarArista(e, id);
        } else if (modoActual === 'mover') {
            iniciarArrastre(e, grupo);
        }
    });

    grupo.addEventListener('mouseup', (e) => {
        if (modoActual === 'dibujar') {
            finalizarArista(e, id);
        }
    });

    // Dibujar elementos visuales
    const circulo = document.createElementNS("http://www.w3.org/2000/svg", "circle");
    circulo.setAttribute('r', RADIO_NODO);

    const texto = document.createElementNS("http://www.w3.org/2000/svg", "text");
    texto.setAttribute('dy', 5);
    texto.setAttribute('text-anchor', 'middle');
    texto.textContent = contadorVertices;

    grupo.appendChild(circulo);
    grupo.appendChild(texto);
    capaVertices.appendChild(grupo);
}

// --- 3. MOVER NODOS Y ARISTAS ---
function iniciarArrastre(e, grupo) {
    e.stopPropagation();
    nodoArrastrado = grupo;
    const currentX = parseFloat(grupo.dataset.cx);
    const currentY = parseFloat(grupo.dataset.cy);
    offsetDrag.x = e.clientX - currentX;
    offsetDrag.y = e.clientY - currentY;
    lienzo.style.cursor = "grabbing";
}

window.addEventListener('mousemove', (e) => {
    // Caso 1: Dibujando línea temporal
    if (dibujandoArista) {
        actualizarLineaTemporal(verticeOrigen.x, verticeOrigen.y, e.clientX, e.clientY);
    }
    
    // Caso 2: Moviendo nodo
    if (nodoArrastrado && modoActual === 'mover') {
        e.preventDefault(); 
        const nuevoX = e.clientX - offsetDrag.x;
        const nuevoY = e.clientY - offsetDrag.y;
        nodoArrastrado.setAttribute('transform', `translate(${nuevoX}, ${nuevoY})`);
        nodoArrastrado.dataset.cx = nuevoX;
        nodoArrastrado.dataset.cy = nuevoY;
        actualizarAristasConectadas(nodoArrastrado.id, nuevoX, nuevoY);
    }
});

window.addEventListener('mouseup', () => {
    if (dibujandoArista) resetearEstado();
    if (nodoArrastrado) {
        nodoArrastrado = null;
        if (modoActual === 'mover') lienzo.style.cursor = "grab";
    }
});

// --- 4. ARISTAS ---
function iniciarArista(e, id) {
    e.stopPropagation();
    const nodo = document.getElementById(id);
    const x = parseFloat(nodo.dataset.cx);
    const y = parseFloat(nodo.dataset.cy);

    dibujandoArista = true;
    verticeOrigen = { id, x, y };

    actualizarLineaTemporal(x, y, x, y);
    lineaTemporal.style.display = 'block';
}

function finalizarArista(e, idDestino) {
    e.stopPropagation();
    if (!dibujandoArista || !verticeOrigen) return; // Validación extra
    if (modoActual !== 'dibujar') return;

    if (verticeOrigen.id !== idDestino) {
        const nodoDest = document.getElementById(idDestino);
        const xDest = parseFloat(nodoDest.dataset.cx);
        const yDest = parseFloat(nodoDest.dataset.cy);
        
        crearAristaVisual(verticeOrigen.x, verticeOrigen.y, xDest, yDest, verticeOrigen.id, idDestino);
    }
    resetearEstado();
}

function crearAristaVisual(cx1, cy1, cx2, cy2, idOrigen, idDestino) {
    const coords = obtenerPuntosBorde(cx1, cy1, cx2, cy2);
    if (!coords) return;

    const linea = document.createElementNS("http://www.w3.org/2000/svg", "line");
    linea.setAttribute('class', 'arista');
    linea.setAttribute('x1', coords.x1);
    linea.setAttribute('y1', coords.y1);
    linea.setAttribute('x2', coords.x2);
    linea.setAttribute('y2', coords.y2);
    linea.setAttribute('data-origen', idOrigen);
    linea.setAttribute('data-destino', idDestino);

    linea.addEventListener('click', (e) => {
        if (modoActual === 'eliminar') {
            e.stopPropagation();
            e.target.remove();
        }
    });
    capaAristas.appendChild(linea);
}

function actualizarAristasConectadas(idNodo, x, y) {
    const aristas = document.querySelectorAll('.arista');
    aristas.forEach(arista => {
        const idOrigen = arista.dataset.origen;
        const idDestino = arista.dataset.destino;
        
        if (idOrigen === idNodo || idDestino === idNodo) {
            let x1, y1, x2, y2;
            
            if (idOrigen === idNodo) {
                x1 = x; y1 = y;
                const nodoDest = document.getElementById(idDestino);
                x2 = parseFloat(nodoDest.dataset.cx);
                y2 = parseFloat(nodoDest.dataset.cy);
            } else {
                x2 = x; y2 = y;
                const nodoOrig = document.getElementById(idOrigen);
                x1 = parseFloat(nodoOrig.dataset.cx);
                y1 = parseFloat(nodoOrig.dataset.cy);
            }
            
            const coords = obtenerPuntosBorde(x1, y1, x2, y2);
            if (coords) {
                arista.setAttribute('x1', coords.x1);
                arista.setAttribute('y1', coords.y1);
                arista.setAttribute('x2', coords.x2);
                arista.setAttribute('y2', coords.y2);
            }
        }
    });
}

function obtenerPuntosBorde(x1, y1, x2, y2) {
    const dx = x2 - x1;
    const dy = y2 - y1;
    const distancia = Math.sqrt(dx*dx + dy*dy);
    if (distancia < RADIO_NODO * 2) return null;

    const angulo = Math.atan2(dy, dx);
    const startX = x1 + Math.cos(angulo) * RADIO_NODO;
    const startY = y1 + Math.sin(angulo) * RADIO_NODO;
    const endX = x2 - Math.cos(angulo) * (RADIO_NODO + 3);
    const endY = y2 - Math.sin(angulo) * (RADIO_NODO + 3);
    
    return { x1: startX, y1: startY, x2: endX, y2: endY };
}

function resetearEstado() {
    dibujandoArista = false;
    verticeOrigen = null;
    lineaTemporal.style.display = 'none';
}

function actualizarLineaTemporal(x1, y1, x2, y2) {
    lineaTemporal.setAttribute('x1', x1);
    lineaTemporal.setAttribute('y1', y1);
    lineaTemporal.setAttribute('x2', x2);
    lineaTemporal.setAttribute('y2', y2);
}

function eliminarVertice(idVertice) {
    const aristas = document.querySelectorAll('.arista');
    aristas.forEach(arista => {
        if (arista.dataset.origen === idVertice || arista.dataset.destino === idVertice) {
            arista.remove();
        }
    });
    const nodo = document.getElementById(idVertice);
    if (nodo) nodo.remove();
    listaVertices = listaVertices.filter(v => v.id !== idVertice);
    actualizarListaUI();
}

function actualizarListaUI() {
    if(!listaNodosUI) return;
    listaNodosUI.innerHTML = '';
    if (listaVertices.length === 0) {
        listaNodosUI.innerHTML = '<li class="empty-msg">No hay nodos</li>';
    } else {
        listaVertices.forEach(nodo => {
            const li = document.createElement('li');
            li.innerHTML = `<span>Nodo <strong>${nodo.numero}</strong></span>`;
            listaNodosUI.appendChild(li);
        });
    }
}