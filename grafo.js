document.addEventListener("DOMContentLoaded", () => {
    const lienzo = document.getElementById('lienzo');
    const capaVertices = document.getElementById('capa-vertices');
    const capaAristas = document.getElementById('capa-aristas');
    const lineaTemporal = document.getElementById('linea-temporal');
    const listaNodosUI = document.getElementById('lista-nodos');
    const contenedorMatriz = document.getElementById('contenedor-matriz');

    const btnDibujar = document.getElementById('btn-dibujar');
    const btnMover = document.getElementById('btn-mover');
    const btnEliminar = document.getElementById('btn-eliminar');

    const RADIO_NODO = 22; 
    let listaVertices = []; 
    let modoActual = 'dibujar'; 

    let verticeOrigen = null;
    let dibujandoArista = false;
    let nodoArrastrado = null;
    let offsetDrag = { x: 0, y: 0 };
    
    // --- NUEVO: Variables para el modal ---
    let aristaPendiente = null; 
    const modalPeso = document.getElementById('modal-peso');
    const inputPeso = document.getElementById('input-peso');
    const btnConfirmarPeso = document.getElementById('btn-confirmar-peso');
    const btnCancelarPeso = document.getElementById('btn-cancelar-peso');
    const errorPeso = document.getElementById('modal-error');

    function cambiarModo(nuevoModo) {
        modoActual = nuevoModo;
        
        if (btnDibujar) btnDibujar.classList.remove('active');
        if (btnMover) btnMover.classList.remove('active');
        if (btnEliminar) btnEliminar.classList.remove('active');
        
        if (modoActual === 'dibujar') {
            if (btnDibujar) btnDibujar.classList.add('active');
            lienzo.style.cursor = "crosshair";
        } else if (modoActual === 'mover') {
            if (btnMover) btnMover.classList.add('active');
            lienzo.style.cursor = "grab";
        } else if (modoActual === 'eliminar') {
            if (btnEliminar) btnEliminar.classList.add('active');
            lienzo.style.cursor = "not-allowed";
        }
    }

    if (btnDibujar) btnDibujar.addEventListener('click', () => cambiarModo('dibujar'));
    if (btnMover) btnMover.addEventListener('click', () => cambiarModo('mover'));
    if (btnEliminar) btnEliminar.addEventListener('click', () => cambiarModo('eliminar'));

    // --- CREAR NODOS ---
    lienzo.addEventListener('click', (e) => {
        if (modoActual !== 'dibujar' || dibujandoArista) return;
        if (e.target.id === 'lienzo') crearVertice(e.clientX, e.clientY);
    });

    function crearVertice(x, y, idForzado = null) {
        const idUnico = idForzado || `v-${Date.now()}`;
        if (!idForzado) listaVertices.push({ id: idUnico, numero: 0 });
        
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
            if (modoActual === 'dibujar') iniciarArista(e, idUnico);
            else if (modoActual === 'mover') iniciarArrastre(e, grupo);
        });

        grupo.addEventListener('mouseup', (e) => {
            if (modoActual === 'dibujar') finalizarArista(e, idUnico);
        });

        const circulo = document.createElementNS("http://www.w3.org/2000/svg", "circle");
        circulo.setAttribute('r', RADIO_NODO);

        const texto = document.createElementNS("http://www.w3.org/2000/svg", "text");
        texto.setAttribute('dy', 5);
        texto.setAttribute('text-anchor', 'middle');

        grupo.appendChild(circulo);
        grupo.appendChild(texto);
        capaVertices.appendChild(grupo);

        if (!idForzado) reenumerarNodos(); 
    }

    function reenumerarNodos() {
        listaVertices.forEach((nodo, index) => {
            nodo.numero = index + 1;
            const grupo = document.getElementById(nodo.id);
            if(grupo) {
                const textoElement = grupo.querySelector('text');
                if(textoElement) textoElement.textContent = nodo.numero;
            }
        });
        actualizarListaUI();
        actualizarMatriz();
    }

    function iniciarArrastre(e, grupo) {
        e.stopPropagation();
        nodoArrastrado = grupo;
        offsetDrag.x = e.clientX - parseFloat(grupo.dataset.cx);
        offsetDrag.y = e.clientY - parseFloat(grupo.dataset.cy);
        lienzo.style.cursor = "grabbing";
    }

    window.addEventListener('mousemove', (e) => {
        if (dibujandoArista) actualizarLineaTemporal(verticeOrigen.x, verticeOrigen.y, e.clientX, e.clientY);
        
        if (nodoArrastrado && modoActual === 'mover') {
            e.preventDefault(); 
            const nuevoX = e.clientX - offsetDrag.x;
            const nuevoY = e.clientY - offsetDrag.y;
            nodoArrastrado.setAttribute('transform', `translate(${nuevoX}, ${nuevoY})`);
            nodoArrastrado.dataset.cx = nuevoX;
            nodoArrastrado.dataset.cy = nuevoY;
            actualizarAristasConectadas(nodoArrastrado.id);
        }
    });

    window.addEventListener('mouseup', () => {
        if (dibujandoArista) resetearEstado();
        if (nodoArrastrado) {
            nodoArrastrado = null;
            if (modoActual === 'mover') lienzo.style.cursor = "grab";
        }
    });

    // --- ARISTAS Y MODAL ---
    function iniciarArista(e, id) {
        e.stopPropagation();
        const nodo = document.getElementById(id);
        verticeOrigen = { id, x: parseFloat(nodo.dataset.cx), y: parseFloat(nodo.dataset.cy) };
        dibujandoArista = true;
        actualizarLineaTemporal(verticeOrigen.x, verticeOrigen.y, verticeOrigen.x, verticeOrigen.y);
        lineaTemporal.style.display = 'block';
    }

    function finalizarArista(e, idDestino) {
        e.stopPropagation();
        if (!dibujandoArista || !verticeOrigen || modoActual !== 'dibujar') return;

        const existeArista = Array.from(document.querySelectorAll('.arista')).some(
            a => a.dataset.origen === verticeOrigen.id && a.dataset.destino === idDestino
        );
        
        if (existeArista) {
            alert("⚠️ Ya existe una conexión directa en esta dirección.");
            resetearEstado(); return;
        }

        // En lugar de usar prompt, preparamos y mostramos el modal
        aristaPendiente = { origen: verticeOrigen.id, destino: idDestino };
        
        inputPeso.value = "1";
        errorPeso.style.display = 'none';
        modalPeso.style.display = 'flex';
        
        // Timeout ligero para asegurar que el modal renderice antes del focus
        setTimeout(() => inputPeso.focus(), 50);

        dibujandoArista = false;
        lineaTemporal.style.display = 'none';
    }

    // Funciones del modal
    function procesarModalPeso() {
        if (!aristaPendiente) return;
        
        let p = inputPeso.value.trim();
        if (p === "") {
            errorPeso.textContent = "El peso no puede estar vacío.";
            errorPeso.style.display = 'block';
            return;
        }
        
        let pesoFinal = parseFloat(p);
        if (isNaN(pesoFinal) || pesoFinal <= 0) {
            errorPeso.textContent = "Ingresa un número mayor a cero.";
            errorPeso.style.display = 'block';
            return;
        }

        crearAristaVisual(aristaPendiente.origen, aristaPendiente.destino, pesoFinal);
        cerrarModalPeso();
    }

    function cerrarModalPeso() {
        modalPeso.style.display = 'none';
        aristaPendiente = null;
        verticeOrigen = null;
    }

    if (btnConfirmarPeso) btnConfirmarPeso.addEventListener('click', procesarModalPeso);
    if (btnCancelarPeso) btnCancelarPeso.addEventListener('click', cerrarModalPeso);
    
    // Permitir enviar con la tecla Enter
    if (inputPeso) {
        inputPeso.addEventListener('keyup', (e) => {
            if (e.key === 'Enter') procesarModalPeso();
        });
    }

    function calcularRutaArista(idOrigen, idDestino) {
        const nodoOrig = document.getElementById(idOrigen);
        const nodoDest = document.getElementById(idDestino);
        const x1 = parseFloat(nodoOrig.dataset.cx);
        const y1 = parseFloat(nodoOrig.dataset.cy);
        const x2 = parseFloat(nodoDest.dataset.cx);
        const y2 = parseFloat(nodoDest.dataset.cy);

        if (idOrigen === idDestino) {
            const r = RADIO_NODO;
            const sx = x1 + r * Math.cos(-Math.PI / 4);
            const sy = y1 + r * Math.sin(-Math.PI / 4);
            const ex = x1 + (r + 6) * Math.cos(-3 * Math.PI / 4);
            const ey = y1 + (r + 6) * Math.sin(-3 * Math.PI / 4);

            const cp1X = x1 + r * 3.5;
            const cp1Y = y1 - r * 6;
            const cp2X = x1 - r * 3.5;
            const cp2Y = y1 - r * 6;

            return {
                d: `M ${sx} ${sy} C ${cp1X} ${cp1Y}, ${cp2X} ${cp2Y}, ${ex} ${ey}`,
                tx: x1, ty: y1 - r * 4
            };
        } else {
            const dx = x2 - x1;
            const dy = y2 - y1;
            const dist = Math.sqrt(dx*dx + dy*dy);
            if (dist < RADIO_NODO * 2) return null;

            const angulo = Math.atan2(dy, dx);
            const sx = x1 + Math.cos(angulo) * RADIO_NODO;
            const sy = y1 + Math.sin(angulo) * RADIO_NODO;
            
            const ex = x2 - Math.cos(angulo) * (RADIO_NODO + 10);
            const ey = y2 - Math.sin(angulo) * (RADIO_NODO + 10);

            const curva = 40; 
            const mx = (sx + ex) / 2;
            const my = (sy + ey) / 2;
            const cx = mx + (-dy/dist) * curva;
            const cy = my + (dx/dist) * curva;

            const offsetTexto = 15;
            const tx = 0.25 * sx + 0.5 * cx + 0.25 * ex + (-dy/dist) * offsetTexto;
            const ty = 0.25 * sy + 0.5 * cy + 0.25 * ey + (dx/dist) * offsetTexto;

            return {
                d: `M ${sx} ${sy} Q ${cx} ${cy} ${ex} ${ey}`,
                tx: tx, ty: ty + 5
            };
        }
    }

    function crearAristaVisual(idOrigen, idDestino, peso) {
        const ruta = calcularRutaArista(idOrigen, idDestino);
        if (!ruta) return;

        const idArista = `e-${Date.now()}-${Math.random()}`; 

        const arista = document.createElementNS("http://www.w3.org/2000/svg", "path");
        arista.setAttribute('class', 'arista');
        arista.setAttribute('id', idArista);
        arista.setAttribute('d', ruta.d);
        arista.setAttribute('data-origen', idOrigen);
        arista.setAttribute('data-destino', idDestino);
        arista.setAttribute('data-peso', peso);

        const textoPeso = document.createElementNS("http://www.w3.org/2000/svg", "text");
        textoPeso.setAttribute('class', 'peso-texto');
        textoPeso.setAttribute('id', `text-${idArista}`);
        textoPeso.textContent = peso;
        textoPeso.setAttribute('x', ruta.tx);
        textoPeso.setAttribute('y', ruta.ty);

        arista.addEventListener('click', (e) => {
            if (modoActual === 'eliminar') {
                e.stopPropagation();
                textoPeso.remove(); 
                e.target.remove();  
                actualizarMatriz(); 
            }
        });

        capaAristas.appendChild(arista);
        capaAristas.appendChild(textoPeso);
        actualizarMatriz(); 
    }

    function actualizarAristasConectadas(idNodo) {
        const aristas = document.querySelectorAll('.arista');
        aristas.forEach(arista => {
            if (arista.dataset.origen === idNodo || arista.dataset.destino === idNodo) {
                const ruta = calcularRutaArista(arista.dataset.origen, arista.dataset.destino);
                if (ruta) {
                    arista.setAttribute('d', ruta.d);
                    const textoPeso = document.getElementById(`text-${arista.id}`);
                    if (textoPeso) {
                        textoPeso.setAttribute('x', ruta.tx);
                        textoPeso.setAttribute('y', ruta.ty);
                    }
                }
            }
        });
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
        document.querySelectorAll('.arista').forEach(arista => {
            if (arista.dataset.origen === idVertice || arista.dataset.destino === idVertice) {
                document.getElementById(`text-${arista.id}`)?.remove();
                arista.remove();
            }
        });
        document.getElementById(idVertice)?.remove();
        listaVertices = listaVertices.filter(v => v.id !== idVertice);
        reenumerarNodos();
    }

    function actualizarListaUI() {
        if(!listaNodosUI) return;
        listaNodosUI.innerHTML = '';
        if (listaVertices.length === 0) listaNodosUI.innerHTML = '<li class="empty-msg">No hay nodos</li>';
        else listaVertices.forEach(nodo => {
            const li = document.createElement('li');
            li.innerHTML = `<span>Nodo <strong>${nodo.numero}</strong></span>`;
            listaNodosUI.appendChild(li);
        });
    }

    function actualizarMatriz() {
        if (!contenedorMatriz) return;
        const n = listaVertices.length;
        if (n === 0) {
            contenedorMatriz.innerHTML = '<p class="empty-msg">Matriz vacía</p>';
            return;
        }

        let matriz = Array(n).fill(0).map(() => Array(n).fill(0));
        let sumFila = Array(n).fill(0), contFila = Array(n).fill(0);
        let sumCol = Array(n).fill(0), contCol = Array(n).fill(0);

        document.querySelectorAll('.arista').forEach(arista => {
            const i = listaVertices.findIndex(v => v.id === arista.dataset.origen);
            const j = listaVertices.findIndex(v => v.id === arista.dataset.destino);
            const peso = parseFloat(arista.dataset.peso) || 0;

            if (i !== -1 && j !== -1) {
                matriz[i][j] = peso;
                sumFila[i] += peso;
                contFila[i]++;
                sumCol[j] += peso;
                contCol[j]++;
            }
        });

        let html = '<table class="matriz-tabla"><thead><tr><th></th>';
        for(let i=0; i<n; i++) html += `<th>V${listaVertices[i].numero}</th>`;
        html += '<th class="col-suma">Sum_F</th><th class="col-cont">Cont_F</th></tr></thead><tbody>';

        for(let i=0; i<n; i++) {
            html += `<tr><th>V${listaVertices[i].numero}</th>`;
            for(let j=0; j<n; j++) html += `<td>${matriz[i][j]}</td>`;
            html += `<td class="col-suma">${sumFila[i]}</td><td class="col-cont">${contFila[i]}</td></tr>`;
        }
        
        html += '<tr class="fila-suma"><th>Sum_C</th>';
        for(let j=0; j<n; j++) html += `<td>${sumCol[j]}</td>`;
        html += '<td>-</td><td>-</td></tr>';

        html += '<tr class="fila-cont"><th>Cont_C</th>';
        for(let j=0; j<n; j++) html += `<td>${contCol[j]}</td>`;
        html += '<td>-</td><td>-</td></tr>';

        html += '</tbody></table>';
        contenedorMatriz.innerHTML = html;
    }

    // --- IMPORTAR / EXPORTAR JSON ---

    const btnExportar = document.getElementById('btn-exportar');
    const btnImportar = document.getElementById('btn-importar');
    const fileImportar = document.getElementById('file-importar');

    if (btnExportar) {
        btnExportar.addEventListener('click', () => {
            if (listaVertices.length === 0) {
                alert("No hay nada que guardar. ¡Dibuja algunos nodos primero!");
                return;
            }

            const aristasData = Array.from(document.querySelectorAll('.arista')).map(a => ({
                origen: a.dataset.origen,
                destino: a.dataset.destino,
                peso: parseFloat(a.dataset.peso)
            }));

            const nodosData = listaVertices.map(v => {
                const nodoSVG = document.getElementById(v.id);
                return {
                    id: v.id,
                    numero: v.numero,
                    x: parseFloat(nodoSVG.dataset.cx),
                    y: parseFloat(nodoSVG.dataset.cy)
                };
            });

            const dataJSON = JSON.stringify({ nodos: nodosData, aristas: aristasData }, null, 2);
            const blob = new Blob([dataJSON], { type: "application/json" });
            const url = URL.createObjectURL(blob);
            
            const a = document.createElement('a');
            a.href = url;
            a.download = "mi_grafo.json";
            a.click();
            URL.revokeObjectURL(url);
        });
    }

    if (btnImportar && fileImportar) {
        btnImportar.addEventListener('click', () => {
            fileImportar.click();
        });

        fileImportar.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (!file) return;

            const reader = new FileReader();
            reader.onload = (event) => {
                try {
                    const data = JSON.parse(event.target.result);
                    if (!data.nodos || !data.aristas) throw new Error("Formato inválido");
                    cargarGrafoDesdeJSON(data);
                } catch (error) {
                    alert("Error al cargar el archivo. Asegúrate de que es un JSON válido generado por este editor.");
                }
            };
            reader.readAsText(file);
            e.target.value = ""; 
        });
    }

    function cargarGrafoDesdeJSON(data) {
        capaVertices.innerHTML = '';
        capaAristas.innerHTML = '';
        listaVertices = [];

        data.nodos.forEach(nodo => {
            listaVertices.push({ id: nodo.id, numero: nodo.numero });
            crearVertice(nodo.x, nodo.y, nodo.id); 
        });

        reenumerarNodos();

        data.aristas.forEach(arista => {
            crearAristaVisual(arista.origen, arista.destino, arista.peso);
        });
    }
});