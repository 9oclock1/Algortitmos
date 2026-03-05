document.addEventListener("DOMContentLoaded", () => {
    const lienzo = document.getElementById('lienzo');
    const capaVertices = document.getElementById('capa-vertices');
    const capaAristas = document.getElementById('capa-aristas');
    const lineaTemporal = document.getElementById('linea-temporal');
    const listaNodosUI = document.getElementById('lista-nodos');
    const contenedorMatriz = document.getElementById('contenedor-matriz');

    // --- Botones Principales ---
    const btnDibujar = document.getElementById('btn-dibujar');
    const btnMover = document.getElementById('btn-mover');
    const btnEditar = document.getElementById('btn-editar'); 
    const btnEliminar = document.getElementById('btn-eliminar');
    const btnLimpiar = document.getElementById('btn-limpiar');

    // --- ESTOS BOTONES FALTABAN (JSON) ---
    const btnExportar = document.getElementById('btn-exportar');
    const btnImportar = document.getElementById('btn-importar');
    const fileImportar = document.getElementById('file-importar');

    const RADIO_NODO = 22; 
    let listaVertices = []; 
    let modoActual = 'dibujar'; 

    let verticeOrigen = null;
    let dibujandoArista = false;
    let nodoArrastrado = null;
    let offsetDrag = { x: 0, y: 0 };
    
    // Variables modal Nodo
    let nodoPendiente = null;
    let nodoEditando = null; 
    const modalNodo = document.getElementById('modal-nodo');
    const inputNodo = document.getElementById('input-nodo');
    const btnConfirmarNodo = document.getElementById('btn-confirmar-nodo');
    const btnCancelarNodo = document.getElementById('btn-cancelar-nodo');
    const errorNodo = document.getElementById('modal-error-nodo');
    const tituloModalNodo = document.querySelector('#modal-nodo h4');

    // Variables modal Arista
    let aristaPendiente = null; 
    let aristaEditando = null; 
    const modalPeso = document.getElementById('modal-peso');
    const inputPeso = document.getElementById('input-peso');
    const btnConfirmarPeso = document.getElementById('btn-confirmar-peso');
    const btnCancelarPeso = document.getElementById('btn-cancelar-peso');
    const errorPeso = document.getElementById('modal-error');
    const tituloModalPeso = document.querySelector('#modal-peso h4');

    // Variables modal Exportar
    const modalExportar = document.getElementById('modal-exportar');
    const inputExportar = document.getElementById('input-exportar');
    const btnConfirmarExportar = document.getElementById('btn-confirmar-exportar');
    const btnCancelarExportar = document.getElementById('btn-cancelar-exportar');
    const errorExportar = document.getElementById('modal-error-exportar');

    // Variables modal Limpiar
    const modalLimpiar = document.getElementById('modal-limpiar');
    const btnConfirmarLimpiar = document.getElementById('btn-confirmar-limpiar');
    const btnCancelarLimpiar = document.getElementById('btn-cancelar-limpiar');

    // --- CAMBIO DE MODOS ---
    function cambiarModo(nuevoModo) {
        modoActual = nuevoModo;
        
        if (btnDibujar) btnDibujar.classList.remove('active');
        if (btnMover) btnMover.classList.remove('active');
        if (btnEditar) btnEditar.classList.remove('active');
        if (btnEliminar) btnEliminar.classList.remove('active');
        
        if (modoActual === 'dibujar') {
            if (btnDibujar) btnDibujar.classList.add('active');
            lienzo.style.cursor = "crosshair";
        } else if (modoActual === 'mover') {
            if (btnMover) btnMover.classList.add('active');
            lienzo.style.cursor = "grab";
        } else if (modoActual === 'editar') {
            if (btnEditar) btnEditar.classList.add('active');
            lienzo.style.cursor = "pointer"; 
        } else if (modoActual === 'eliminar') {
            if (btnEliminar) btnEliminar.classList.add('active');
            lienzo.style.cursor = "not-allowed";
        }
    }

    if (btnDibujar) btnDibujar.addEventListener('click', () => cambiarModo('dibujar'));
    if (btnMover) btnMover.addEventListener('click', () => cambiarModo('mover'));
    if (btnEditar) btnEditar.addEventListener('click', () => cambiarModo('editar'));
    if (btnEliminar) btnEliminar.addEventListener('click', () => cambiarModo('eliminar'));

    // --- LÓGICA: LIMPIAR TODO ---
    if (btnLimpiar) {
        btnLimpiar.addEventListener('click', () => {
            if (listaVertices.length === 0) return;
            modalLimpiar.style.display = 'flex';
        });
    }

    if (btnConfirmarLimpiar) {
        btnConfirmarLimpiar.addEventListener('click', () => {
            capaVertices.innerHTML = '';
            capaAristas.innerHTML = '';
            listaVertices = [];
            actualizarVistas();
            resetearEstado();
            modalLimpiar.style.display = 'none';
        });
    }

    if (btnCancelarLimpiar) {
        btnCancelarLimpiar.addEventListener('click', () => {
            modalLimpiar.style.display = 'none';
        });
    }

    // --- LÓGICA DE NODOS ---
    lienzo.addEventListener('click', (e) => {
        if (modoActual !== 'dibujar' || dibujandoArista) return;
        if (e.target.id === 'lienzo') {
            nodoPendiente = { x: e.clientX, y: e.clientY };
            const nextLetter = String.fromCharCode(65 + (listaVertices.length % 26));
            inputNodo.value = nextLetter;
            tituloModalNodo.textContent = "Nombre del Nodo";
            errorNodo.style.display = 'none';
            modalNodo.style.display = 'flex';
            setTimeout(() => inputNodo.focus(), 50);
        }
    });

    function abrirEdicionNodo(idNodo) {
        nodoEditando = idNodo;
        tituloModalNodo.textContent = "Editar Nombre";
        const nodoObj = listaVertices.find(v => v.id === idNodo);
        inputNodo.value = nodoObj.nombre;
        errorNodo.style.display = 'none';
        modalNodo.style.display = 'flex';
        setTimeout(() => {
            inputNodo.focus();
            inputNodo.select();
        }, 50);
    }

    function procesarModalNodo() {
        let nombreVal = inputNodo.value.trim().substring(0, 4); 
        if (nombreVal === "") {
            errorNodo.textContent = "El nombre no puede estar vacío.";
            errorNodo.style.display = 'block'; return;
        }

        if (nodoEditando) {
            const nodoObj = listaVertices.find(v => v.id === nodoEditando);
            if (nodoObj) {
                nodoObj.nombre = nombreVal;
                const nodoDOM = document.getElementById(nodoEditando);
                if (nodoDOM) nodoDOM.querySelector('text').textContent = nombreVal;
            }
            actualizarVistas();
            cerrarModalNodo();
        } else if (nodoPendiente) {
            crearVertice(nodoPendiente.x, nodoPendiente.y, null, nombreVal);
            cerrarModalNodo();
        }
    }

    function cerrarModalNodo() {
        modalNodo.style.display = 'none';
        nodoPendiente = null;
        nodoEditando = null;
    }

    if (btnConfirmarNodo) btnConfirmarNodo.addEventListener('click', procesarModalNodo);
    if (btnCancelarNodo) btnCancelarNodo.addEventListener('click', cerrarModalNodo);
    if (inputNodo) inputNodo.addEventListener('keyup', (e) => { if (e.key === 'Enter') procesarModalNodo(); });

    function crearVertice(x, y, idForzado = null, nombreForzado = null) {
        const idUnico = idForzado || `v-${Date.now()}`;
        
        // Lo guardamos siempre en la lista lógica
        listaVertices.push({ id: idUnico, nombre: nombreForzado });
        
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
            } else if (modoActual === 'editar') {
                e.stopPropagation();
                abrirEdicionNodo(idUnico);
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
        texto.textContent = nombreForzado; 

        texto.addEventListener('dblclick', (e) => {
            e.stopPropagation(); 
            if (modoActual !== 'eliminar') abrirEdicionNodo(idUnico);
        });

        grupo.appendChild(circulo);
        grupo.appendChild(texto);
        capaVertices.appendChild(grupo);

        if (!idForzado) actualizarVistas(); 
    }

    function actualizarVistas() {
        actualizarListaUI();
        actualizarMatriz();
    }

    function actualizarListaUI() {
        if(!listaNodosUI) return;
        listaNodosUI.innerHTML = '';
        if (listaVertices.length === 0) listaNodosUI.innerHTML = '<li class="empty-msg">No hay nodos</li>';
        else listaVertices.forEach(nodo => {
            const li = document.createElement('li');
            li.innerHTML = `<span>Nodo <strong>${nodo.nombre}</strong></span>`;
            listaNodosUI.appendChild(li);
        });
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

    // --- ARISTAS ---
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

        aristaPendiente = { origen: verticeOrigen.id, destino: idDestino };
        inputPeso.value = "1";
        tituloModalPeso.textContent = "Peso de la conexión";
        errorPeso.style.display = 'none';
        modalPeso.style.display = 'flex';
        setTimeout(() => inputPeso.focus(), 50);

        dibujandoArista = false;
        lineaTemporal.style.display = 'none';
    }

    function abrirEdicionArista(idArista, pesoActual) {
        aristaEditando = idArista;
        tituloModalPeso.textContent = "Editar Peso";
        inputPeso.value = pesoActual;
        errorPeso.style.display = 'none';
        modalPeso.style.display = 'flex';
        setTimeout(() => {
            inputPeso.focus();
            inputPeso.select();
        }, 50);
    }

    function procesarModalPeso() {
        let p = inputPeso.value.trim();
        if (p === "") {
            errorPeso.textContent = "El peso no puede estar vacío.";
            errorPeso.style.display = 'block'; return;
        }
        
        let pesoFinal = parseFloat(p);
        if (isNaN(pesoFinal) || pesoFinal <= 0) {
            errorPeso.textContent = "Ingresa un número mayor a cero.";
            errorPeso.style.display = 'block'; return;
        }

        if (aristaEditando) {
            const aristaDOM = document.getElementById(aristaEditando);
            if (aristaDOM) {
                aristaDOM.dataset.peso = pesoFinal;
                const textoSVG = document.getElementById(`text-${aristaEditando}`);
                if (textoSVG) textoSVG.textContent = pesoFinal;
            }
            actualizarVistas();
            cerrarModalPeso();
        } else if (aristaPendiente) {
            crearAristaVisual(aristaPendiente.origen, aristaPendiente.destino, pesoFinal);
            cerrarModalPeso();
        }
    }

    function cerrarModalPeso() {
        modalPeso.style.display = 'none';
        aristaPendiente = null;
        aristaEditando = null;
        verticeOrigen = null;
    }

    if (btnConfirmarPeso) btnConfirmarPeso.addEventListener('click', procesarModalPeso);
    if (btnCancelarPeso) btnCancelarPeso.addEventListener('click', cerrarModalPeso);
    if (inputPeso) inputPeso.addEventListener('keyup', (e) => { if (e.key === 'Enter') procesarModalPeso(); });

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

            return { d: `M ${sx} ${sy} C ${cp1X} ${cp1Y}, ${cp2X} ${cp2Y}, ${ex} ${ey}`, tx: x1, ty: y1 - r * 4 };
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

            return { d: `M ${sx} ${sy} Q ${cx} ${cy} ${ex} ${ey}`, tx: tx, ty: ty + 5 };
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

        const clickHandler = (e) => {
            if (modoActual === 'eliminar') {
                e.stopPropagation();
                textoPeso.remove(); 
                arista.remove();  
                actualizarVistas(); 
            } else if (modoActual === 'editar') {
                e.stopPropagation();
                abrirEdicionArista(idArista, arista.dataset.peso);
            }
        };

        arista.addEventListener('click', clickHandler);
        textoPeso.addEventListener('click', clickHandler);

        textoPeso.addEventListener('dblclick', (e) => {
            e.stopPropagation();
            if (modoActual !== 'eliminar') abrirEdicionArista(idArista, arista.dataset.peso);
        });

        capaAristas.appendChild(arista);
        capaAristas.appendChild(textoPeso);
        actualizarVistas(); 
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
        actualizarVistas();
    }

    // --- MATRIZ ---
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
        for(let i=0; i<n; i++) html += `<th>${listaVertices[i].nombre}</th>`;
        html += '<th class="col-suma">Sum_F</th><th class="col-cont">Cont_F</th></tr></thead><tbody>';

        for(let i=0; i<n; i++) {
            html += `<tr><th>${listaVertices[i].nombre}</th>`;
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

    // --- IMPORTAR / EXPORTAR JSON COMPLETAMENTE FUNCIONAL ---
    if (btnExportar) {
        btnExportar.addEventListener('click', () => {
            if (listaVertices.length === 0) {
                alert("No hay nada que guardar. ¡Dibuja algunos nodos primero!");
                return;
            }
            inputExportar.value = "mi_grafo";
            errorExportar.style.display = 'none';
            modalExportar.style.display = 'flex';
            setTimeout(() => {
                inputExportar.focus();
                inputExportar.select();
            }, 50);
        });
    }

    function procesarExportar() {
        let nombreArchivo = inputExportar.value.trim();
        if (nombreArchivo === "") {
            errorExportar.textContent = "El nombre no puede estar vacío.";
            errorExportar.style.display = 'block';
            return;
        }

        if (!nombreArchivo.endsWith('.json')) {
            nombreArchivo += '.json';
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
                nombre: v.nombre, 
                x: parseFloat(nodoSVG.dataset.cx),
                y: parseFloat(nodoSVG.dataset.cy)
            };
        });

        const dataJSON = JSON.stringify({ nodos: nodosData, aristas: aristasData }, null, 2);
        const blob = new Blob([dataJSON], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        
        const a = document.createElement('a');
        a.href = url;
        a.download = nombreArchivo;
        a.click();
        URL.revokeObjectURL(url);
        
        cerrarModalExportar();
    }

    function cerrarModalExportar() {
        modalExportar.style.display = 'none';
    }

    if (btnConfirmarExportar) btnConfirmarExportar.addEventListener('click', procesarExportar);
    if (btnCancelarExportar) btnCancelarExportar.addEventListener('click', cerrarModalExportar);
    if (inputExportar) inputExportar.addEventListener('keyup', (e) => { if (e.key === 'Enter') procesarExportar(); });

    // --- IMPORTAR JSON ---
    if (btnImportar && fileImportar) {
        btnImportar.addEventListener('click', () => { fileImportar.click(); });
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
            // Soporte para archivos viejos (numero) y nuevos (nombre)
            let nombreAsignado = nodo.nombre || `N${nodo.numero}`;
            crearVertice(nodo.x, nodo.y, nodo.id, nombreAsignado); 
        });

        data.aristas.forEach(arista => {
            crearAristaVisual(arista.origen, arista.destino, arista.peso);
        });
        
        actualizarVistas();
    }
});