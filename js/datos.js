/* ==========================================================================
   Mikaela 3K Streaming — datos del negocio
   Todo lo que la web muestra (precios, textos del catálogo, pago) sale de aquí.
   Para cambiar un precio: edita p1 (1 mes) o p3 (3 meses). null = no disponible.
   ========================================================================== */
window.M3K = window.M3K || {};

M3K.negocio = {
  nombre: 'Mikaela 3K',
  whatsapp: '59160953013',
  whatsappVisible: '+591 609 53013',
  pago: {
    metodo: 'QR Altoke',
    cuenta: '2617575-000-002',
    validoHasta: '27 de agosto de 2027',
    referencia: 'Varios',
    qr: 'img/qr-altoke.png'
  }
};

M3K.categorias = [
  { id: 'todo',   nombre: 'Todo' },
  { id: 'series', nombre: 'Películas y series' },
  { id: 'anime',  nombre: 'Anime y doramas' },
  { id: 'musica', nombre: 'Música y video' },
  { id: 'tv',     nombre: 'TV por cable' },
  { id: 'ia',     nombre: 'Edición e IA' }
];

M3K.plataformas = [
  { id: 'netflix', nombre: 'Netflix', cat: 'series', color: '#e50914', p1: 35, p3: 90,
    desc: 'Series, películas y documentales para toda la familia.',
    alias: ['netflix', 'netflis', 'nexflix', 'netflx', 'netfix', 'nf'] },
  { id: 'disney', nombre: 'Disney+', cat: 'series', color: '#2b6cf6', p1: 40, p3: 90,
    desc: 'Disney, Pixar, Marvel y Star Wars en un solo lugar.',
    alias: ['disney', 'disney plus', 'disneyplus', 'disney+', 'dysney', 'disnei'] },
  { id: 'prime', nombre: 'Prime Video', cat: 'series', color: '#1aa8e0', p1: 20, p3: 50,
    desc: 'Películas y series originales de Amazon.',
    alias: ['prime', 'prime video', 'amazon', 'amazon prime', 'primevideo'] },
  { id: 'hbo', nombre: 'HBO Max', cat: 'series', color: '#8b5cf6', p1: 25, p3: 60,
    desc: 'Las series de HBO, Warner y el universo DC.',
    alias: ['hbo', 'hbo max', 'hbomax', 'max'] },
  { id: 'paramount', nombre: 'Paramount+', cat: 'series', color: '#3b82f6', p1: 25, p3: 55,
    desc: 'Cine de Paramount, series y Nickelodeon.',
    alias: ['paramount', 'paramount plus', 'paramount+', 'paramaunt'] },
  { id: 'vix', nombre: 'ViX', cat: 'series', color: '#ff6a13', p1: 27, p3: 60,
    desc: 'Novelas, series y cine en español.',
    alias: ['vix', 'vix plus', 'vix+', 'bix'] },
  { id: 'crunchyroll', nombre: 'Crunchyroll', cat: 'anime', color: '#f47521', p1: 20, p3: 50,
    desc: 'El hogar del anime: estrenos y clásicos.',
    alias: ['crunchyroll', 'crunchy', 'crunchiroll', 'cruchyroll', 'crunchyrol', 'crunch'] },
  { id: 'iqiyi', nombre: 'iQIYI', cat: 'anime', color: '#22c55e', p1: 35, p3: 85,
    desc: 'Doramas y los dramas cortos que ves en TikTok, completos.',
    alias: ['iqiyi', 'iqiy', 'iqyi', 'iquiyi', 'iqi', 'iq'] },
  { id: 'youtube', nombre: 'YouTube Premium', cat: 'musica', color: '#ff2640', p1: 60, p3: null,
    desc: 'Sin anuncios y en segundo plano. Te damos el correo incluido.',
    nota: 'Activación instantánea',
    alias: ['youtube', 'youtube premium', 'yt', 'yutub', 'youtub', 'yutube'] },
  { id: 'spotify', nombre: 'Spotify Premium', cat: 'musica', color: '#1ed760', p1: 40, p3: 100,
    desc: 'Tu música sin anuncios. Renovable con tu correo.',
    alias: ['spotify', 'spoti', 'spotifi', 'espotify', 'spotyfy'] },
  { id: 'flujo', nombre: 'Flujo TV', cat: 'tv', color: '#2f6bff', p1: 30, p3: 85, regalo: true,
    desc: 'Canales, películas y series por cable.',
    alias: ['flujo', 'flujo tv', 'flujotv'] },
  { id: 'zonamovie', nombre: 'Zona Movie TV', cat: 'tv', color: '#8b5cf6', p1: 30, p3: 85, regalo: true,
    desc: 'Canales, películas y series por cable.',
    alias: ['zona movie', 'zonamovie', 'zona movie tv', 'zona movi'] },
  { id: 'oleada', nombre: 'Oleada TV', cat: 'tv', color: '#22a447', p1: 35, p3: 85, regalo: true,
    desc: 'Canales, películas y series por cable.',
    alias: ['oleada', 'oleada tv', 'oleadatv'] },
  { id: 'capcut', nombre: 'CapCut', cat: 'ia', color: '#e9f4f2', p1: 75, p3: 190,
    desc: 'Edita fotos y videos con todas las funciones.',
    alias: ['capcut', 'cap cut', 'capcat', 'capkut'] },
  { id: 'gemini', nombre: 'Gemini', cat: 'ia', color: '#7aa7ff', p1: 35, p3: 100,
    desc: 'La inteligencia artificial de Google.',
    alias: ['gemini', 'geminis', 'gemeni', 'geminy'] },
  { id: 'chatgpt', nombre: 'ChatGPT', cat: 'ia', color: '#10a37f', p1: 60, p3: 180,
    desc: 'La IA para estudiar, trabajar y crear.',
    alias: ['chatgpt', 'chat gpt', 'gpt', 'chat gtp', 'chatgtp', 'openai'] }
];

/* "¿Qué quieres ver hoy?" — cada gusto apunta a sus plataformas */
M3K.gustos = [
  { id: 'anime',    nombre: 'Anime',                  ids: ['crunchyroll'] },
  { id: 'doramas',  nombre: 'Doramas y dramas cortos', ids: ['iqiyi'] },
  { id: 'novelas',  nombre: 'Novelas',                ids: ['vix'] },
  { id: 'marvel',   nombre: 'Marvel, Pixar y Star Wars', ids: ['disney'] },
  { id: 'series',   nombre: 'Series y estrenos',      ids: ['netflix', 'hbo', 'prime', 'paramount'] },
  { id: 'musica',   nombre: 'Música',                 ids: ['spotify', 'youtube'] },
  { id: 'canales',  nombre: 'Canales de TV',          ids: ['flujo', 'zonamovie', 'oleada'] },
  { id: 'crear',    nombre: 'Crear contenido',        ids: ['capcut'] },
  { id: 'estudiar', nombre: 'Estudiar con IA',        ids: ['chatgpt', 'gemini'] }
];

/* Material de venta (flyers del negocio) */
M3K.promos = [
  { id: 'anime',  titulo: 'Anime, doramas y novelas', img: 'img/promo-anime-doramas', w: 1600, h: 872 },
  { id: 'apps',   titulo: 'Apps de películas y series', img: 'img/promo-apps-peliculas', w: 1536, h: 1024 },
  { id: 'musica', titulo: 'YouTube y Spotify', img: 'img/promo-youtube-spotify', w: 1600, h: 872 },
  { id: 'ia',     titulo: 'Edición e IA', img: 'img/promo-edicion-ia', w: 1600, h: 872 },
  { id: 'tv',     titulo: 'TV por cable', img: 'img/promo-tv-cable', w: 1024, h: 1536 }
];

/* Utilidades de precio compartidas por la web y por Mika */
M3K.buscar = function (id) { return M3K.plataformas.find(function (p) { return p.id === id; }); };
M3K.precio = function (p, meses) { return meses === 3 && p.p3 ? p.p3 : p.p1; };
M3K.ahorro = function (p) { return p.p3 ? p.p1 * 3 - p.p3 : 0; };
M3K.nombreCat = function (id) { var c = M3K.categorias.find(function (c) { return c.id === id; }); return c ? c.nombre : ''; };
M3K.waLink = function (texto) { return 'https://wa.me/' + M3K.negocio.whatsapp + '?text=' + encodeURIComponent(texto); };
