const lienzo = document.getElementById('lienzo');
const capaVertices = document.getElementById('capa-vertices');
const capaAristas = document.getElementById('capa-aristas');
const lineaTemporal = document.getElementById('linea-temporal');
const listaNodosUI = document.getElementById('lista-nodos');
const contenedorMatriz = document.getElementById('contenedor-matriz');

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
    
    if(btnDibujar) btnDibujar.classList.remove('active');
    if(btnMover) btnMover.classList.remove('active');
    if(btnEliminar) btnEliminar.classList.remove('active');
    
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

if(btnDibujar) btnDibujar.addEventListener('click', () => cambiarModo('dibujar'));
if(btnMover) btnMover.addEventListener('click', () => cambiarModo('mover'));
if(btnEliminar) btnEliminar.addEventListener('click', () => cambiarModo('eliminar'));

// --- CREAR NODOS ---
lienzo.addEventListener('click', (e) => {
    if (modoActual !== 'dibujar') return;
    if (dibujandoArista) return;

    if (e.target.id === 'lienzo') {
        crearVertice(e.clientX, e.clientY);
    }
});

function crearVertice(x, y) {
    // Usamos un ID único basado en el tiempo para evitar conflictos internos
    const idUnico = `v-${Date.now()}`;
    
    listaVertices.push({ id: idUnico, numero: 0 }); // El número se asignará al reenumerar
    
    const grupo = document.createElementNS("http://www.w3.org/2000/svg", "g");
    grupo.setAttribute('class', 'vertice');
    grupo.setAttribute('transform', `translate(${x}, ${y})`);
    grupo.setAttribute('id', idUnico);
    grupo.dataset.cx = x;
    grupo.dataset.cy = y;

    grupo.addEventListener('click', (e) => {
        if (modoActual === 'eliminar') {
            e.stopPropagation();
            eliminarVertice(idUnico);
        }
    });

    grupo.addEventListener('mousedown', (e) => {
        if (modoActual === 'dibujar') {
            iniciarArista(e, idUnico);
        } else if (modoActual === 'mover') {
            iniciarArrastre(e, grupo);
        }
    });

    grupo.addEventListener('mouseup', (e) => {
        if (modoActual === 'dibujar') {
            finalizarArista(e, idUnico);
        }
    });

    const circulo = document.createElementNS("http://www.w3.org/2000/svg", "circle");
    circulo.setAttribute('r', RADIO_NODO);

    const texto = document.createElementNS("http://www.w3.org/2000/svg", "text");
    texto.setAttribute('dy', 5);
    texto.setAttribute('text-anchor', 'middle');
    // El texto se pondrá en reenumerarNodos

    grupo.appendChild(circulo);
    grupo.appendChild(texto);
    capaVertices.appendChild(grupo);

    reenumerarNodos(); // Re-calcula los números de los nodos
}

// --- REENUMERAR NODOS Y ACTUALIZAR UI ---
function reenumerarNodos() {
    listaVertices.forEach((nodo, index) => {
        nodo.numero = index + 1; // Asigna un número secuencial limpio
        const grupo = document.getElementById(nodo.id);
        if(grupo) {
            const textoElement = grupo.querySelector('text');
            if(textoElement) textoElement.textContent = nodo.numero;
        }
    });
    
    actualizarListaUI();
    actualizarMatriz();
}

// --- MOVER NODOS Y ARISTAS ---
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
    if (dibujandoArista) {
        actualizarLineaTemporal(verticeOrigen.x, verticeOrigen.y, e.clientX, e.clientY);
    }
    
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

// --- ARISTAS ---
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
    if (!dibujandoArista || !verticeOrigen) return;
    if (modoActual !== 'dibujar') return;

    if (verticeOrigen.id !== idDestino) {
        const nodoDest = document.getElementById(idDestino);
        const xDest = parseFloat(nodoDest.dataset.cx);
        const yDest = parseFloat(nodoDest.dataset.cy);
        
        // Pedir el peso
        let pesoIngresado = prompt("Ingrese el peso de la arista:", "1");
        if (pesoIngresado === null || pesoIngresado.trim() === "" || isNaN(pesoIngresado)) {
            resetearEstado();
            return; // Si cancela o pone algo inválido, no se crea la arista
        }

        crearAristaVisual(verticeOrigen.x, verticeOrigen.y, xDest, yDest, verticeOrigen.id, idDestino, parseFloat(pesoIngresado));
    }
    resetearEstado();
}

function crearAristaVisual(cx1, cy1, cx2, cy2, idOrigen, idDestino, peso) {
    const coords = obtenerPuntosBorde(cx1, cy1, cx2, cy2);
    if (!coords) return;

    const idArista = `e-${Date.now()}`; // ID único para la línea

    const linea = document.createElementNS("http://www.w3.org/2000/svg", "line");
    linea.setAttribute('class', 'arista');
    linea.setAttribute('id', idArista);
    linea.setAttribute('x1', coords.x1);
    linea.setAttribute('y1', coords.y1);
    linea.setAttribute('x2', coords.x2);
    linea.setAttribute('y2', coords.y2);
    linea.setAttribute('data-origen', idOrigen);
    linea.setAttribute('data-destino', idDestino);
    linea.setAttribute('data-peso', peso);

    // Texto del peso
    const textoPeso = document.createElementNS("http://www.w3.org/2000/svg", "text");
    textoPeso.setAttribute('class', 'peso-texto');
    textoPeso.setAttribute('id', `text-${idArista}`);
    textoPeso.textContent = peso;
    textoPeso.setAttribute('x', (coords.x1 + coords.x2) / 2);
    textoPeso.setAttribute('y', ((coords.y1 + coords.y2) / 2) - 8);

    linea.addEventListener('click', (e) => {
        if (modoActual === 'eliminar') {
            e.stopPropagation();
            textoPeso.remove(); // Borra el texto
            e.target.remove();  // Borra la línea
            actualizarMatriz(); // Actualiza matriz al borrar arco
        }
    });

    capaAristas.appendChild(linea);
    capaAristas.appendChild(textoPeso);
    actualizarMatriz(); // Actualiza matriz al crear arco
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

                // Actualizar la posición del texto del peso
                const textoPeso = document.getElementById(`text-${arista.id}`);
                if (textoPeso) {
                    textoPeso.setAttribute('x', (coords.x1 + coords.x2) / 2);
                    textoPeso.setAttribute('y', ((coords.y1 + coords.y2) / 2) - 8);
                }
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

// --- ELIMINAR VÉRTICES Y ACTUALIZAR ---
function eliminarVertice(idVertice) {
    // 1. Eliminar aristas conectadas y sus textos
    const aristas = document.querySelectorAll('.arista');
    aristas.forEach(arista => {
        if (arista.dataset.origen === idVertice || arista.dataset.destino === idVertice) {
            const textoPeso = document.getElementById(`text-${arista.id}`);
            if (textoPeso) textoPeso.remove();
            arista.remove();
        }
    });

    // 2. Eliminar el nodo físico
    const nodo = document.getElementById(idVertice);
    if (nodo) nodo.remove();

    // 3. Eliminar de la lógica
    listaVertices = listaVertices.filter(v => v.id !== idVertice);
    
    // 4. Re-enumerar nodos (esto actualiza la UI y la matriz)
    reenumerarNodos();
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

// --- MATRIZ DE ADYACENCIA ---
function actualizarMatriz() {
    if (!contenedorMatriz) return;
    const n = listaVertices.length;
    
    if (n === 0) {
        contenedorMatriz.innerHTML = '<p class="empty-msg">Matriz vacía</p>';
        return;
    }

    // Inicializar matriz NxN con ceros
    let matriz = Array(n).fill(0).map(() => Array(n).fill(0));

    // Llenar matriz con los pesos de las aristas
    const aristas = document.querySelectorAll('.arista');
    aristas.forEach(arista => {
        const idOrigen = arista.dataset.origen;
        const idDestino = arista.dataset.destino;
        const peso = parseFloat(arista.dataset.peso) || 0;

        const indexOrigen = listaVertices.findIndex(v => v.id === idOrigen);
        const indexDestino = listaVertices.findIndex(v => v.id === idDestino);

        if (indexOrigen !== -1 && indexDestino !== -1) {
            // Asumimos grafo dirigido por la flecha del CSS
            matriz[indexOrigen][indexDestino] = peso;
        }
    });

    // Construir la tabla HTML
    let html = '<table class="matriz-tabla"><thead><tr><th></th>';
    // Encabezados de columnas
    for(let i = 0; i < n; i++) {
        html += `<th>V${listaVertices[i].numero}</th>`;
    }
    html += '</tr></thead><tbody>';

    // Filas de la matriz
    for(let i = 0; i < n; i++) {
        html += `<tr><th>V${listaVertices[i].numero}</th>`;
        for(let j = 0; j < n; j++) {
            html += `<td>${matriz[i][j]}</td>`;
        }
        html += '</tr>';
    }
    
    html += '</tbody></table>';
    contenedorMatriz.innerHTML = html;
}