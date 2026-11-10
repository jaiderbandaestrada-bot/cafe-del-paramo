/* =====================================================================
   CAFÉ DEL PÁRAMO - script.js
   Proyecto final de Programación Web I
   Contenido:
   1. Utilidades
   2. Menú de navegación (responsive) y resaltado de la sección activa
   3. Tema claro / oscuro
   4. Botón "volver arriba" y contadores animados
   5. Botón "Sorpréndeme"
   6. Filtros del menú
   7. Pedido (carrito)
   8. Formulario de reservas con validación
   9. Preguntas frecuentes (acordeón)
   ===================================================================== */

"use strict";

/* ---------- 1. UTILIDADES ---------- */
const $ = (selector, contexto = document) => contexto.querySelector(selector);
const $$ = (selector, contexto = document) => [...contexto.querySelectorAll(selector)];

function formatoMoneda(valor) {
    return "$" + valor.toLocaleString("es-CO");
}

/* localStorage puede fallar (modo privado, etc.), por eso se protege con try/catch */
function guardar(clave, valor) {
    try { localStorage.setItem(clave, JSON.stringify(valor)); } catch (e) { /* sin almacenamiento */ }
}
function leer(clave, porDefecto) {
    try {
        const dato = localStorage.getItem(clave);
        return dato ? JSON.parse(dato) : porDefecto;
    } catch (e) {
        return porDefecto;
    }
}

/* ---------- 2. MENÚ DE NAVEGACIÓN ---------- */
const btnMenu = $("#btn-menu");
const menuPrincipal = $("#menu-principal");
const enlacesMenu = $$(".enlace-menu");

function alternarMenu(forzarCierre = false) {
    const abrir = forzarCierre ? false : !menuPrincipal.classList.contains("abierto");
    menuPrincipal.classList.toggle("abierto", abrir);
    btnMenu.setAttribute("aria-expanded", String(abrir));
    btnMenu.setAttribute("aria-label", abrir ? "Cerrar menú" : "Abrir menú");
}

btnMenu.addEventListener("click", () => alternarMenu());

/* Al elegir una opción del menú en móvil, se cierra el menú */
enlacesMenu.forEach(enlace => enlace.addEventListener("click", () => alternarMenu(true)));

/* Con la tecla Escape también se cierra */
document.addEventListener("keydown", evento => {
    if (evento.key === "Escape") alternarMenu(true);
});

/* Si la pantalla se agranda, el menú móvil se restablece */
window.addEventListener("resize", () => {
    if (window.innerWidth > 820) alternarMenu(true);
});

/* Resaltar el enlace de la sección que se está viendo */
const secciones = $$("main section[id]");

function resaltarSeccionActiva() {
    const referencia = window.scrollY + 120;
    let actual = secciones[0].id;
    secciones.forEach(seccion => {
        if (seccion.offsetTop <= referencia) actual = seccion.id;
    });
    /* Al llegar al final de la página se marca la última sección */
    if (window.innerHeight + window.scrollY >= document.body.offsetHeight - 4) {
        actual = secciones[secciones.length - 1].id;
    }
    enlacesMenu.forEach(enlace => {
        const coincide = enlace.getAttribute("href") === "#" + actual;
        enlace.classList.toggle("activo", coincide);
        if (coincide) enlace.setAttribute("aria-current", "page");
        else enlace.removeAttribute("aria-current");
    });
}

/* ---------- 3. TEMA CLARO / OSCURO ---------- */
const btnTema = $("#btn-tema");

function aplicarTema(tema) {
    document.documentElement.setAttribute("data-tema", tema);
    btnTema.textContent = tema === "oscuro" ? "☀️" : "🌙";
    guardar("tema", tema);
}

btnTema.addEventListener("click", () => {
    const actual = document.documentElement.getAttribute("data-tema");
    aplicarTema(actual === "oscuro" ? "claro" : "oscuro");
});
aplicarTema(leer("tema", "claro"));

/* ---------- 4. VOLVER ARRIBA Y CONTADORES ---------- */
const btnSubir = $("#btn-subir");

window.addEventListener("scroll", () => {
    btnSubir.hidden = window.scrollY < 400;
    resaltarSeccionActiva();
});
btnSubir.addEventListener("click", () => window.scrollTo({ top: 0, behavior: "smooth" }));

function animarCifra(elemento) {
    const meta = Number(elemento.dataset.meta);
    const pasos = 40;
    let paso = 0;
    const intervalo = setInterval(() => {
        paso++;
        elemento.textContent = Math.round(meta * paso / pasos).toLocaleString("es-CO");
        if (paso >= pasos) clearInterval(intervalo);
    }, 30);
}

const observador = new IntersectionObserver((entradas, obs) => {
    entradas.forEach(entrada => {
        if (entrada.isIntersecting) {
            animarCifra(entrada.target);
            obs.unobserve(entrada.target);
        }
    });
}, { threshold: 0.6 });
$$(".cifra").forEach(cifra => observador.observe(cifra));

/* ---------- 5. BOTÓN "SORPRÉNDEME" ---------- */
$("#btn-sorpresa").addEventListener("click", () => {
    const productos = $$(".producto");
    const elegido = productos[Math.floor(Math.random() * productos.length)];
    $("#mensaje-sorpresa").textContent =
        `Hoy te recomendamos: ${elegido.dataset.nombre} (${formatoMoneda(Number(elegido.dataset.precio))})`;
});

/* ---------- 6. FILTROS DEL MENÚ ---------- */
const botonesFiltro = $$(".btn-filtro");
const productos = $$(".producto");

function filtrarProductos(categoria) {
    productos.forEach(producto => {
        const visible = categoria === "todos" || producto.dataset.categoria === categoria;
        producto.classList.toggle("oculto", !visible);
    });
    botonesFiltro.forEach(boton => {
        const activo = boton.dataset.filtro === categoria;
        boton.classList.toggle("activo", activo);
        boton.setAttribute("aria-pressed", String(activo));
    });
}

botonesFiltro.forEach(boton =>
    boton.addEventListener("click", () => filtrarProductos(boton.dataset.filtro)));

/* ---------- 7. PEDIDO (CARRITO) ---------- */
let pedido = leer("pedido", []);          // arreglo de { nombre, precio, cantidad }

const listaPedido = $("#lista-pedido");
const pedidoVacio = $("#pedido-vacio");
const totalPedido = $("#total-pedido");
const contador = $("#contador");
const mensajePedido = $("#mensaje-pedido");

function agregarAlPedido(nombre, precio) {
    const existente = pedido.find(item => item.nombre === nombre);
    if (existente) existente.cantidad++;
    else pedido.push({ nombre, precio, cantidad: 1 });
    mensajePedido.textContent = "";
    dibujarPedido();
}

function cambiarCantidad(nombre, cambio) {
    const item = pedido.find(i => i.nombre === nombre);
    if (!item) return;
    item.cantidad += cambio;
    if (item.cantidad <= 0) pedido = pedido.filter(i => i.nombre !== nombre);
    dibujarPedido();
}

function crearBotonCantidad(texto, etiqueta, nombre, cambio) {
    const boton = document.createElement("button");
    boton.type = "button";
    boton.className = "btn-cantidad";
    boton.textContent = texto;
    boton.setAttribute("aria-label", `${etiqueta} ${nombre}`);
    boton.addEventListener("click", () => cambiarCantidad(nombre, cambio));
    return boton;
}

function dibujarPedido() {
    listaPedido.innerHTML = "";
    pedido.forEach(item => {
        const fila = document.createElement("li");

        const nombre = document.createElement("span");
        nombre.className = "item-nombre";
        nombre.textContent = `${item.nombre} - ${formatoMoneda(item.precio * item.cantidad)}`;

        const controles = document.createElement("span");
        controles.className = "item-controles";
        const cantidad = document.createElement("span");
        cantidad.textContent = item.cantidad;
        controles.append(
            crearBotonCantidad("−", "Quitar uno de", item.nombre, -1),
            cantidad,
            crearBotonCantidad("+", "Agregar uno de", item.nombre, 1)
        );

        fila.append(nombre, controles);
        listaPedido.appendChild(fila);
    });

    const unidades = pedido.reduce((suma, item) => suma + item.cantidad, 0);
    const total = pedido.reduce((suma, item) => suma + item.precio * item.cantidad, 0);
    contador.textContent = unidades;
    totalPedido.textContent = formatoMoneda(total);
    pedidoVacio.hidden = pedido.length > 0;
    guardar("pedido", pedido);
}

/* Un solo escuchador en la cuadrícula atiende todos los botones "Agregar" */
$("#grid-menu").addEventListener("click", evento => {
    const boton = evento.target.closest(".btn-agregar");
    if (!boton) return;
    const producto = boton.closest(".producto");
    agregarAlPedido(producto.dataset.nombre, Number(producto.dataset.precio));
});

$("#btn-vaciar").addEventListener("click", () => {
    pedido = [];
    mensajePedido.textContent = "";
    dibujarPedido();
});

$("#btn-confirmar").addEventListener("click", () => {
    if (pedido.length === 0) {
        mensajePedido.style.color = "var(--error)";
        mensajePedido.textContent = "Agrega al menos un producto antes de confirmar.";
        return;
    }
    const total = pedido.reduce((suma, item) => suma + item.precio * item.cantidad, 0);
    const numero = Math.floor(1000 + Math.random() * 9000);
    pedido = [];
    dibujarPedido();
    mensajePedido.style.color = "var(--exito)";
    mensajePedido.textContent = `¡Pedido #${numero} confirmado! Total: ${formatoMoneda(total)}. Lo estamos preparando.`;
});

dibujarPedido();

/* ---------- 8. FORMULARIO DE RESERVAS ---------- */
const formulario = $("#form-reserva");
const campos = {
    nombre: $("#nombre"),
    correo: $("#correo"),
    telefono: $("#telefono"),
    fecha: $("#fecha"),
    hora: $("#hora"),
    personas: $("#personas"),
    terminos: $("#terminos")
};

/* Llenar las horas disponibles (8:00 a. m. a 8:00 p. m.) */
for (let h = 8; h <= 20; h++) {
    const opcion = document.createElement("option");
    opcion.value = String(h).padStart(2, "0") + ":00";
    const hora12 = h > 12 ? h - 12 : h;
    opcion.textContent = `${hora12}:00 ${h >= 12 ? "p. m." : "a. m."}`;
    campos.hora.appendChild(opcion);
}

/* Fecha mínima: hoy (en hora local) y máxima: dentro de 90 días */
function fechaISO(fecha) {
    const mes = String(fecha.getMonth() + 1).padStart(2, "0");
    const dia = String(fecha.getDate()).padStart(2, "0");
    return `${fecha.getFullYear()}-${mes}-${dia}`;
}
const hoy = new Date();
const limite = new Date(); limite.setDate(limite.getDate() + 90);
campos.fecha.min = fechaISO(hoy);
campos.fecha.max = fechaISO(limite);

/* Cada función devuelve un texto de error ("" si el dato es válido) */
const validadores = {
    nombre() {
        const valor = campos.nombre.value.trim();
        if (valor === "") return "Escribe tu nombre completo.";
        if (!/^[A-Za-zÁÉÍÓÚÜÑáéíóúüñ' .-]+$/.test(valor)) return "El nombre solo puede tener letras.";
        if (valor.split(/\s+/).length < 2) return "Escribe tu nombre y apellido.";
        if (valor.length < 5) return "El nombre es demasiado corto.";
        return "";
    },
    correo() {
        const valor = campos.correo.value.trim();
        if (valor === "") return "Escribe tu correo electrónico.";
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(valor)) return "Escribe un correo válido (ej: nombre@correo.com).";
        return "";
    },
    telefono() {
        const valor = campos.telefono.value.trim();
        if (valor === "") return "Escribe tu número de celular.";
        if (!/^\d+$/.test(valor)) return "El celular solo puede tener números.";
        if (!/^3\d{9}$/.test(valor)) return "Debe tener 10 dígitos y empezar por 3.";
        return "";
    },
    fecha() {
        const valor = campos.fecha.value;
        if (valor === "") return "Selecciona una fecha.";
        if (valor < campos.fecha.min) return "La fecha no puede ser anterior a hoy.";
        if (valor > campos.fecha.max) return "Solo se puede reservar con 90 días de anticipación.";
        return "";
    },
    hora() {
        const valor = campos.hora.value;
        if (valor === "") return "Selecciona una hora.";
        /* Si la reserva es para hoy, la hora debe ser posterior a la actual */
        if (campos.fecha.value === fechaISO(new Date())) {
            const horaElegida = Number(valor.slice(0, 2));
            if (horaElegida <= new Date().getHours()) return "Esa hora ya pasó. Elige una posterior.";
        }
        return "";
    },
    personas() {
        const valor = campos.personas.value;
        const numero = Number(valor);
        if (valor === "") return "Indica el número de personas.";
        if (!Number.isInteger(numero)) return "Debe ser un número entero.";
        if (numero < 1 || numero > 10) return "Puedes reservar de 1 a 10 personas.";
        return "";
    },
    terminos() {
        return campos.terminos.checked ? "" : "Debes aceptar el tratamiento de datos.";
    }
};

/* Muestra u oculta el mensaje de error de un campo */
function validarCampo(nombre) {
    const mensaje = validadores[nombre]();
    const contenedor = campos[nombre].closest(".campo");
    $("#error-" + nombre).textContent = mensaje;
    contenedor.classList.toggle("con-error", mensaje !== "");
    contenedor.classList.toggle("correcto", mensaje === "" && nombre !== "terminos");
    campos[nombre].setAttribute("aria-invalid", String(mensaje !== ""));
    return mensaje === "";
}

/* Validación en tiempo real: al salir del campo y al corregirlo */
Object.keys(campos).forEach(nombre => {
    const evento = (campos[nombre].type === "checkbox" || campos[nombre].tagName === "SELECT") ? "change" : "blur";
    campos[nombre].addEventListener(evento, () => validarCampo(nombre));
    campos[nombre].addEventListener("input", () => {
        if (campos[nombre].closest(".campo").classList.contains("con-error")) validarCampo(nombre);
    });
});
/* Si cambia la fecha, la hora debe revisarse otra vez */
campos.fecha.addEventListener("change", () => { if (campos.hora.value) validarCampo("hora"); });

/* El celular solo acepta números mientras se escribe */
campos.telefono.addEventListener("input", () => {
    campos.telefono.value = campos.telefono.value.replace(/\D/g, "");
});

/* Contador de caracteres del comentario */
const mensajeTexto = $("#mensaje");
const contadorMensaje = $("#contador-mensaje");
mensajeTexto.addEventListener("input", () => {
    contadorMensaje.textContent = mensajeTexto.value.length;
});

const respuesta = $("#respuesta-reserva");

function mostrarRespuesta(tipo, titulo, detalles = []) {
    respuesta.className = "respuesta " + tipo;
    respuesta.innerHTML = "";
    const encabezado = document.createElement("h3");
    encabezado.textContent = titulo;
    respuesta.appendChild(encabezado);
    if (detalles.length > 0) {
        const lista = document.createElement("ul");
        detalles.forEach(texto => {
            const li = document.createElement("li");
            li.textContent = texto;
            lista.appendChild(li);
        });
        respuesta.appendChild(lista);
    }
}

formulario.addEventListener("submit", evento => {
    evento.preventDefault();                       // evita que la página se recargue

    let primerInvalido = null;
    Object.keys(campos).forEach(nombre => {
        if (!validarCampo(nombre) && !primerInvalido) primerInvalido = campos[nombre];
    });

    if (primerInvalido) {
        mostrarRespuesta("fallo", "Revisa los campos marcados en rojo.");
        primerInvalido.focus();
        return;
    }

    /* Se guardan los datos ANTES de limpiar el formulario */
    const fecha = new Date(campos.fecha.value + "T00:00:00");
    const fechaTexto = fecha.toLocaleDateString("es-CO", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
    const detalles = [
        `Fecha: ${fechaTexto}`,
        `Hora: ${campos.hora.options[campos.hora.selectedIndex].textContent}`,
        `Personas: ${Number(campos.personas.value)}`,
        `Zona: ${$('input[name="zona"]:checked').value}`,
        `Te enviaremos la confirmación a ${campos.correo.value.trim()}.`
    ];
    const primerNombre = campos.nombre.value.trim().split(/\s+/)[0];

    formulario.reset();                            // dispara el evento "reset" (ver más abajo)
    campos.personas.value = 2;

    /* La respuesta se muestra DESPUÉS del reset para que no se borre */
    mostrarRespuesta("exito", `¡Gracias, ${primerNombre}! Tu reserva fue recibida.`, detalles);
});

/* El botón "Limpiar" también borra errores y la respuesta */
formulario.addEventListener("reset", () => {
    respuesta.className = "respuesta";
    respuesta.innerHTML = "";
    contadorMensaje.textContent = "0";
    $$(".campo").forEach(c => c.classList.remove("correcto", "con-error"));
    $$(".error").forEach(e => { e.textContent = ""; });
});

/* ---------- 9. PREGUNTAS FRECUENTES (ACORDEÓN) ---------- */
$$(".faq-pregunta").forEach(boton => {
    boton.addEventListener("click", () => {
        const panel = boton.nextElementSibling;
        const abierta = boton.getAttribute("aria-expanded") === "true";

        /* Se cierran las demás preguntas */
        $$(".faq-pregunta").forEach(otro => {
            otro.setAttribute("aria-expanded", "false");
            otro.nextElementSibling.style.maxHeight = null;
            otro.nextElementSibling.classList.remove("abierta");
        });

        if (!abierta) {
            boton.setAttribute("aria-expanded", "true");
            panel.classList.add("abierta");
            panel.style.maxHeight = panel.scrollHeight + "px";
        }
    });
});

/* ---------- INICIO ---------- */
$("#anio").textContent = new Date().getFullYear();
resaltarSeccionActiva();
