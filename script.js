/* ==========================================================
   Hilos y Nudos — carrito, filtros, contacto y pedido
   Un solo archivo para pagina.html y pedido.html
   ========================================================== */
'use strict';

/* ---------- CONFIGURACIÓN (cámbiala aquí) ---------- */
const CONFIG = {
  claveCarrito: 'hilosynudos_carrito',
  whatsapp: '570000000000',     // tu número con indicativo, sin + ni espacios
  envioGratisDesde: 100000,     // pedidos desde este valor no pagan envío
  costoEnvio: 10000,
  maxPorProducto: 10,
};

const NOMBRE_PAGO = {
  transferencia: 'Transferencia bancaria',
  nequi: 'Nequi / Daviplata',
  contraentrega: 'Pago contra entrega',
};

const INSTRUCCIONES_PAGO = {
  transferencia: 'Te escribiremos con los datos de la cuenta para hacer la transferencia.',
  nequi: 'Te escribiremos con el número de Nequi o Daviplata para que hagas el pago.',
  contraentrega: 'Pagarás cuando recibas tu pedido.',
};

/* ---------- Utilidades ---------- */
const $ = (selector, contexto = document) => contexto.querySelector(selector);
const $$ = (selector, contexto = document) => [...contexto.querySelectorAll(selector)];

const formatoCOP = (n) => '$' + n.toLocaleString('es-CO') + ' COP';

// Crea elementos usando textContent (evita inyectar HTML)
function crear(etiqueta, propiedades = {}, hijos = []) {
  const nodo = document.createElement(etiqueta);
  for (const [clave, valor] of Object.entries(propiedades)) {
    if (clave === 'texto') nodo.textContent = valor;
    else nodo.setAttribute(clave, valor);
  }
  hijos.forEach((hijo) => nodo.append(hijo));
  return nodo;
}

let temporizadorAviso;
function mostrarAviso(mensaje) {
  let aviso = $('#aviso');
  if (!aviso) {
    aviso = crear('div', { id: 'aviso', class: 'aviso', role: 'status', 'aria-live': 'polite' });
    document.body.append(aviso);
  }
  aviso.textContent = mensaje;
  aviso.classList.add('visible');
  clearTimeout(temporizadorAviso);
  temporizadorAviso = setTimeout(() => aviso.classList.remove('visible'), 2500);
}

/* ==========================================================
   CARRITO
   ========================================================== */
let carrito = leerCarrito();

function leerCarrito() {
  try {
    const datos = JSON.parse(localStorage.getItem(CONFIG.claveCarrito));
    if (!Array.isArray(datos)) return [];
    return datos.filter((i) =>
      i &&
      typeof i.id === 'string' &&
      typeof i.nombre === 'string' &&
      Number.isFinite(i.precio) &&
      Number.isInteger(i.cantidad) &&
      i.cantidad > 0
    );
  } catch (error) {
    return [];
  }
}

function guardarCarrito() {
  try {
    localStorage.setItem(CONFIG.claveCarrito, JSON.stringify(carrito));
  } catch (error) {
    /* si el navegador bloquea el almacenamiento, el carrito sigue en memoria */
  }
}

const totalUnidades = () => carrito.reduce((suma, i) => suma + i.cantidad, 0);
const subtotal = () => carrito.reduce((suma, i) => suma + i.precio * i.cantidad, 0);
const costoEnvio = () => {
  const sub = subtotal();
  return sub === 0 || sub >= CONFIG.envioGratisDesde ? 0 : CONFIG.costoEnvio;
};

function agregarAlCarrito(producto) {
  const existente = carrito.find((i) => i.id === producto.id);
  if (existente) {
    if (existente.cantidad >= CONFIG.maxPorProducto) {
      mostrarAviso(`Máximo ${CONFIG.maxPorProducto} unidades de ${producto.nombre}`);
      return;
    }
    existente.cantidad += 1;
  } else {
    carrito.push({ ...producto, cantidad: 1 });
  }
  actualizar();
  mostrarAviso(`${producto.nombre} agregado al carrito`);
}

function cambiarCantidad(id, cambio) {
  const item = carrito.find((i) => i.id === id);
  if (!item) return;
  item.cantidad += cambio;
  if (item.cantidad <= 0) {
    carrito = carrito.filter((i) => i.id !== id);
  } else if (item.cantidad > CONFIG.maxPorProducto) {
    item.cantidad = CONFIG.maxPorProducto;
    mostrarAviso(`Máximo ${CONFIG.maxPorProducto} unidades por producto`);
  }
  actualizar();
}

function quitarDelCarrito(id) {
  carrito = carrito.filter((i) => i.id !== id);
  actualizar();
}

function vaciarCarrito() {
  carrito = [];
  actualizar();
}

/* ---------- Pintar en pantalla ---------- */
function actualizar() {
  guardarCarrito();
  pintarTodo();
}

function pintarTodo() {
  pintarContador();
  pintarCarrito();
  pintarResumen();
}

function pintarContador() {
  const contador = $('#contador-carrito');
  if (contador) contador.textContent = totalUnidades();
}

function controlCantidad(item) {
  return crear('span', { class: 'control-cantidad' }, [
    crear('button', {
      type: 'button',
      'data-accion': 'restar',
      'data-id': item.id,
      'aria-label': `Quitar una unidad de ${item.nombre}`,
      texto: '−',
    }),
    crear('span', { class: 'cantidad', texto: String(item.cantidad) }),
    crear('button', {
      type: 'button',
      'data-accion': 'sumar',
      'data-id': item.id,
      'aria-label': `Agregar una unidad de ${item.nombre}`,
      texto: '+',
    }),
  ]);
}

function pintarCarrito() {
  const cuerpo = $('#items-carrito');
  if (!cuerpo) return;

  cuerpo.replaceChildren();

  if (carrito.length === 0) {
    cuerpo.append(
      crear('tr', {}, [
        crear('td', { colspan: '5', texto: 'Tu carrito está vacío. Agrega productos desde el catálogo.' }),
      ])
    );
  } else {
    carrito.forEach((item) => {
      cuerpo.append(
        crear('tr', {}, [
          crear('td', { texto: item.nombre }),
          crear('td', { texto: formatoCOP(item.precio) }),
          crear('td', {}, [controlCantidad(item)]),
          crear('td', { texto: formatoCOP(item.precio * item.cantidad) }),
          crear('td', {}, [
            crear('button', {
              type: 'button',
              class: 'boton-quitar',
              'data-accion': 'quitar',
              'data-id': item.id,
              'aria-label': `Quitar ${item.nombre} del carrito`,
              texto: 'Quitar',
            }),
          ]),
        ])
      );
    });
  }

  $('#total-carrito').textContent = formatoCOP(subtotal());

  const botonVaciar = $('#vaciar-carrito');
  if (botonVaciar) botonVaciar.disabled = carrito.length === 0;
}

function pintarResumen() {
  const lista = $('#resumen-items');
  if (!lista) return;

  lista.replaceChildren();

  if (carrito.length === 0) {
    lista.append(crear('li', { texto: 'Aún no hay productos en tu pedido.' }));
  } else {
    carrito.forEach((item) => {
      lista.append(
        crear('li', { class: 'resumen-item' }, [
          crear('span', { texto: `${item.cantidad} × ${item.nombre}` }),
          crear('span', { texto: formatoCOP(item.precio * item.cantidad) }),
        ])
      );
    });
  }

  const envio = costoEnvio();
  $('#resumen-subtotal').textContent = formatoCOP(subtotal());
  $('#resumen-envio').textContent = subtotal() > 0 && envio === 0 ? 'Gratis' : formatoCOP(envio);
  $('#resumen-total').textContent = formatoCOP(subtotal() + envio);

  const botonConfirmar = $('#boton-confirmar');
  const mensaje = $('#mensaje-pedido');
  const vacio = carrito.length === 0;
  if (botonConfirmar) botonConfirmar.disabled = vacio;
  if (mensaje) {
    mensaje.hidden = !vacio;
    if (vacio) mensaje.textContent = 'Tu carrito está vacío. Vuelve a la tienda para agregar productos.';
  }
}

/* ---------- Clics (agregar, sumar, restar, quitar, vaciar) ---------- */
document.addEventListener('click', (evento) => {
  // Botón "Agregar al carrito" de cada producto
  const botonAgregar = evento.target.closest('.producto button[data-id]');
  if (botonAgregar) {
    const tarjeta = botonAgregar.closest('.producto');
    agregarAlCarrito({
      id: tarjeta.dataset.id,
      nombre: tarjeta.dataset.nombre,
      precio: Number(tarjeta.dataset.precio),
    });
    return;
  }

  // Botones dentro de la tabla del carrito
  const botonAccion = evento.target.closest('[data-accion]');
  if (botonAccion) {
    const { accion, id } = botonAccion.dataset;
    if (accion === 'sumar') cambiarCantidad(id, 1);
    if (accion === 'restar') cambiarCantidad(id, -1);
    if (accion === 'quitar') quitarDelCarrito(id);
    return;
  }

  // Vaciar carrito
  if (evento.target.closest('#vaciar-carrito')) {
    if (carrito.length > 0 && window.confirm('¿Quieres vaciar el carrito?')) vaciarCarrito();
    return;
  }

  // "Hacer pedido" con el carrito vacío
  const botonPedido = evento.target.closest('a.boton-pedido');
  if (botonPedido && carrito.length === 0) {
    evento.preventDefault();
    mostrarAviso('Tu carrito está vacío. Agrega un producto primero.');
  }
});

// Si el carrito cambia en otra pestaña, se actualiza aquí
window.addEventListener('storage', (evento) => {
  if (evento.key === CONFIG.claveCarrito) {
    carrito = leerCarrito();
    pintarTodo();
  }
});

/* ==========================================================
   CATÁLOGO: búsqueda, categoría y orden
   ========================================================== */
function iniciarCatalogo() {
  const formulario = $('#form-filtros');
  const grilla = $('#grilla-productos');
  if (!formulario || !grilla) return;

  const tarjetas = $$('.producto', grilla);
  tarjetas.forEach((tarjeta, indice) => {
    tarjeta.dataset.orden = indice;
  });

  const campoBuscar = $('#buscar');
  const campoCategoria = $('#filtro-categoria');
  const campoOrden = $('#orden');
  const mensajeVacio = $('#sin-resultados');

  const normalizar = (texto) =>
    texto.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

  function aplicarFiltros() {
    const busqueda = normalizar(campoBuscar.value.trim());
    const categoria = campoCategoria.value;

    const visibles = tarjetas.filter((tarjeta) => {
      const coincideCategoria = categoria === 'todas' || tarjeta.dataset.categoria === categoria;
      const descripcion = $('.producto-descripcion', tarjeta).textContent;
      const coincideTexto = normalizar(`${tarjeta.dataset.nombre} ${descripcion}`).includes(busqueda);
      return coincideCategoria && coincideTexto;
    });

    tarjetas.forEach((tarjeta) => {
      tarjeta.hidden = !visibles.includes(tarjeta);
    });

    visibles.sort((a, b) => {
      if (campoOrden.value === 'menor-precio') return a.dataset.precio - b.dataset.precio;
      if (campoOrden.value === 'mayor-precio') return b.dataset.precio - a.dataset.precio;
      return a.dataset.orden - b.dataset.orden;
    });
    visibles.forEach((tarjeta) => grilla.append(tarjeta));

    mensajeVacio.hidden = visibles.length > 0;
  }

  formulario.addEventListener('submit', (evento) => {
    evento.preventDefault();
    aplicarFiltros();
  });
  campoBuscar.addEventListener('input', aplicarFiltros);
  campoCategoria.addEventListener('change', aplicarFiltros);
  campoOrden.addEventListener('change', aplicarFiltros);

  // Los enlaces de "Compra por categoría" filtran el catálogo
  $$('.lista-categorias a[data-categoria]').forEach((enlace) => {
    enlace.addEventListener('click', () => {
      campoCategoria.value = enlace.dataset.categoria;
      campoBuscar.value = '';
      aplicarFiltros();
    });
  });
}

/* ==========================================================
   CONTACTO: abre WhatsApp con el mensaje escrito
   ========================================================== */
function iniciarContacto() {
  const formulario = $('#form-contacto');
  if (!formulario) return;

  formulario.addEventListener('submit', (evento) => {
    evento.preventDefault();
    const datos = new FormData(formulario);
    const texto =
      `Hola, soy ${datos.get('nombre')} (${datos.get('correo')}).\n\n${datos.get('mensaje')}`;
    window.open(`https://wa.me/${CONFIG.whatsapp}?text=${encodeURIComponent(texto)}`, '_blank', 'noopener');
    formulario.reset();
    mostrarAviso('Abriendo WhatsApp para enviar tu mensaje');
  });
}

/* ==========================================================
   PEDIDO: validar, confirmar y enviar resumen por WhatsApp
   ========================================================== */
function iniciarPedido() {
  const formulario = $('#form-pedido');
  if (!formulario) return;

  const campoTelefono = $('#telefono');
  campoTelefono.addEventListener('input', () => {
    const digitos = campoTelefono.value.replace(/\D/g, '');
    const valido = digitos.length >= 7 && digitos.length <= 15;
    campoTelefono.setCustomValidity(valido ? '' : 'Escribe un teléfono válido (entre 7 y 15 dígitos).');
  });

  formulario.addEventListener('submit', (evento) => {
    evento.preventDefault();
    if (carrito.length === 0) return;

    const datos = new FormData(formulario);
    const limpio = (campo) => String(datos.get(campo) || '').trim();

    const envio = costoEnvio();
    const pedido = {
      numero: 'HN-' + Date.now().toString(36).toUpperCase().slice(-6),
      nombre: limpio('nombre'),
      correo: limpio('correo'),
      telefono: limpio('telefono'),
      departamento: limpio('departamento'),
      ciudad: limpio('ciudad'),
      direccion: limpio('direccion'),
      notas: limpio('notas'),
      pago: limpio('pago'),
      items: carrito.map((i) => ({ ...i })),
      subtotal: subtotal(),
      envio,
      total: subtotal() + envio,
    };

    mostrarConfirmacion(pedido);
    formulario.reset();
    vaciarCarrito();
  });
}

function textoWhatsApp(pedido) {
  const productos = pedido.items
    .map((i) => `- ${i.cantidad} × ${i.nombre}: ${formatoCOP(i.precio * i.cantidad)}`)
    .join('\n');

  const lineas = [
    `Hola, quiero confirmar mi pedido ${pedido.numero}:`,
    '',
    productos,
    '',
    `Subtotal: ${formatoCOP(pedido.subtotal)}`,
    `Envío: ${pedido.envio === 0 ? 'Gratis' : formatoCOP(pedido.envio)}`,
    `Total: ${formatoCOP(pedido.total)}`,
    `Pago: ${NOMBRE_PAGO[pedido.pago] || pedido.pago}`,
    '',
    'Datos de envío:',
    `Nombre: ${pedido.nombre}`,
    `Teléfono: ${pedido.telefono}`,
    `Correo: ${pedido.correo}`,
    `Dirección: ${pedido.direccion}, ${pedido.ciudad}, ${pedido.departamento}`,
  ];
  if (pedido.notas) lineas.push(`Notas: ${pedido.notas}`);
  return lineas.join('\n');
}

function mostrarConfirmacion(pedido) {
  $('#conf-numero').textContent = pedido.numero;
  $('#conf-instrucciones').textContent = INSTRUCCIONES_PAGO[pedido.pago] || '';
  $('#conf-total').textContent = formatoCOP(pedido.total);

  const detalle = $('#conf-detalle');
  detalle.replaceChildren();
  pedido.items.forEach((item) => {
    detalle.append(
      crear('li', { class: 'resumen-item' }, [
        crear('span', { texto: `${item.cantidad} × ${item.nombre}` }),
        crear('span', { texto: formatoCOP(item.precio * item.cantidad) }),
      ])
    );
  });

  $('#conf-whatsapp').href =
    `https://wa.me/${CONFIG.whatsapp}?text=${encodeURIComponent(textoWhatsApp(pedido))}`;

  $('#seccion-pedido').hidden = true;
  $('#confirmacion').hidden = false;
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

/* ---------- Inicio ---------- */
pintarTodo();
iniciarCatalogo();
iniciarContacto();
iniciarPedido();
