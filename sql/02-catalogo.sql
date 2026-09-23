-- Catálogo de Mikaela 3K (precios del 19 sep 2026). Pégalo en Supabase > SQL Editor y dale Run.
-- Después puedes cambiar precios desde el panel: manda lo que esté en la base.

insert into public.plataformas (id, nombre, categoria, color, descripcion, p1, p3, regalo, nota, orden) values
  ('netflix', 'Netflix', 'series', '#e50914', 'Series, películas y documentales para toda la familia.', 35, 90, false, '', 1),
  ('disney', 'Disney+', 'series', '#2b6cf6', 'Disney, Pixar, Marvel y Star Wars en un solo lugar.', 40, 90, false, '', 2),
  ('prime', 'Prime Video', 'series', '#1aa8e0', 'Películas y series originales de Amazon.', 20, 50, false, '', 3),
  ('hbo', 'HBO Max', 'series', '#8b5cf6', 'Las series de HBO, Warner y el universo DC.', 25, 60, false, '', 4),
  ('paramount', 'Paramount+', 'series', '#3b82f6', 'Cine de Paramount, series y Nickelodeon.', 25, 55, false, '', 5),
  ('vix', 'ViX', 'series', '#ff6a13', 'Novelas, series y cine en español.', 27, 60, false, '', 6),
  ('crunchyroll', 'Crunchyroll', 'anime', '#f47521', 'El hogar del anime: estrenos y clásicos.', 20, 50, false, '', 7),
  ('iqiyi', 'iQIYI', 'anime', '#22c55e', 'Doramas y los dramas cortos que ves en TikTok, completos.', 35, 85, false, '', 8),
  ('youtube', 'YouTube Premium', 'musica', '#ff2640', 'Sin anuncios y en segundo plano. Te damos el correo incluido.', 60, null, false, 'Activación instantánea', 9),
  ('spotify', 'Spotify Premium', 'musica', '#1ed760', 'Tu música sin anuncios. Renovable con tu correo.', 40, 100, false, '', 10),
  ('flujo', 'Flujo TV', 'tv', '#2f6bff', 'Canales, películas y series por cable.', 30, 85, true, '', 11),
  ('zonamovie', 'Zona Movie TV', 'tv', '#8b5cf6', 'Canales, películas y series por cable.', 30, 85, true, '', 12),
  ('oleada', 'Oleada TV', 'tv', '#22a447', 'Canales, películas y series por cable.', 35, 85, true, '', 13),
  ('capcut', 'CapCut', 'ia', '#e9f4f2', 'Edita fotos y videos con todas las funciones.', 75, 190, false, '', 14),
  ('gemini', 'Gemini', 'ia', '#7aa7ff', 'La inteligencia artificial de Google.', 35, 100, false, '', 15),
  ('chatgpt', 'ChatGPT', 'ia', '#10a37f', 'La IA para estudiar, trabajar y crear.', 60, 180, false, '', 16)
on conflict (id) do update set nombre = excluded.nombre, categoria = excluded.categoria, color = excluded.color,
  descripcion = excluded.descripcion, p1 = excluded.p1, p3 = excluded.p3, regalo = excluded.regalo, nota = excluded.nota, orden = excluded.orden;
