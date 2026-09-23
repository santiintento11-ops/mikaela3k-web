-- ============================================================================
-- Mikaela 3K Streaming — base de datos (Supabase)
-- Cópialo entero, pégalo en Supabase → SQL Editor → New query → Run.
-- Se puede volver a ejecutar sin romper nada.
-- ============================================================================

-- ---------------------------------------------------------------- utilidades
create or replace function public.es_admin()
returns boolean language sql security definer stable set search_path = public as $$
  select exists (select 1 from perfiles where id = auth.uid() and rol = 'admin');
$$;

create or replace function public.es_revendedor()
returns boolean language sql security definer stable set search_path = public as $$
  select exists (select 1 from perfiles where id = auth.uid() and rol in ('revendedor', 'admin'));
$$;

-- ----------------------------------------------------------------- perfiles
create table if not exists public.perfiles (
  id uuid primary key references auth.users on delete cascade,
  nombre text not null default '',
  whatsapp text not null default '',
  rol text not null default 'cliente' check (rol in ('cliente', 'revendedor', 'admin')),
  saldo numeric(10, 2) not null default 0 check (saldo >= 0),
  creado_en timestamptz not null default now()
);
alter table public.perfiles enable row level security;
drop policy if exists "ver perfil propio" on public.perfiles;
create policy "ver perfil propio" on public.perfiles for select using (id = auth.uid() or es_admin());
drop policy if exists "admin gestiona perfiles" on public.perfiles;
create policy "admin gestiona perfiles" on public.perfiles for all using (es_admin()) with check (es_admin());

-- Al registrarse un usuario se le crea su perfil solo.
create or replace function public.crear_perfil()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.perfiles (id, nombre, whatsapp)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'nombre', ''), coalesce(new.raw_user_meta_data ->> 'whatsapp', ''))
  on conflict (id) do nothing;
  return new;
end; $$;
drop trigger if exists al_crear_usuario on auth.users;
create trigger al_crear_usuario after insert on auth.users for each row execute function public.crear_perfil();

-- -------------------------------------------------------------- plataformas
create table if not exists public.plataformas (
  id text primary key,
  nombre text not null,
  categoria text not null,
  color text not null default '#5dc1b9',
  descripcion text not null default '',
  p1 numeric(10, 2),
  p3 numeric(10, 2),
  regalo boolean not null default false,
  nota text not null default '',
  activo boolean not null default true,
  orden int not null default 0
);
alter table public.plataformas enable row level security;
drop policy if exists "catalogo publico" on public.plataformas;
create policy "catalogo publico" on public.plataformas for select using (true);
drop policy if exists "admin edita catalogo" on public.plataformas;
create policy "admin edita catalogo" on public.plataformas for all using (es_admin()) with check (es_admin());

-- Precios de revendedor: SOLO los ve quien tiene rol revendedor o admin.
create table if not exists public.precios_rev (
  plataforma_id text primary key references public.plataformas(id) on delete cascade,
  p1 numeric(10, 2),
  p3 numeric(10, 2)
);
alter table public.precios_rev enable row level security;
drop policy if exists "solo revendedores ven precios" on public.precios_rev;
create policy "solo revendedores ven precios" on public.precios_rev for select using (es_revendedor());
drop policy if exists "admin edita precios rev" on public.precios_rev;
create policy "admin edita precios rev" on public.precios_rev for all using (es_admin()) with check (es_admin());

-- -------------------------------------------------------------------- stock
-- Las cuentas que Mikaela carga. Nadie más que el admin puede leer esta tabla:
-- al cliente se le entrega su cuenta copiada dentro de su pedido.
create table if not exists public.stock (
  id bigserial primary key,
  plataforma_id text not null references public.plataformas(id) on delete cascade,
  meses int not null default 1 check (meses in (1, 3)),
  contenido text not null,
  estado text not null default 'libre' check (estado in ('libre', 'entregada')),
  pedido_id bigint,
  creado_en timestamptz not null default now(),
  entregado_en timestamptz
);
create index if not exists stock_busqueda on public.stock (plataforma_id, meses, estado, id);
alter table public.stock enable row level security;
drop policy if exists "stock solo admin" on public.stock;
create policy "stock solo admin" on public.stock for all using (es_admin()) with check (es_admin());

-- ------------------------------------------------------------------ pedidos
create table if not exists public.pedidos (
  id bigserial primary key,
  usuario_id uuid not null references auth.users on delete cascade,
  plataforma_id text references public.plataformas(id),
  plataforma_nombre text not null default '',
  meses int not null default 1,
  precio numeric(10, 2) not null default 0,
  estado text not null default 'en_espera' check (estado in ('entregado', 'en_espera', 'cancelado')),
  contenido text,
  creado_en timestamptz not null default now(),
  entregado_en timestamptz
);
alter table public.pedidos enable row level security;
drop policy if exists "ver pedidos propios" on public.pedidos;
create policy "ver pedidos propios" on public.pedidos for select using (usuario_id = auth.uid() or es_admin());
drop policy if exists "admin gestiona pedidos" on public.pedidos;
create policy "admin gestiona pedidos" on public.pedidos for all using (es_admin()) with check (es_admin());

-- ----------------------------------------------------------------- recargas
create table if not exists public.recargas (
  id bigserial primary key,
  usuario_id uuid not null references auth.users on delete cascade,
  monto numeric(10, 2) not null check (monto > 0),
  comprobante text,
  estado text not null default 'pendiente' check (estado in ('pendiente', 'aprobada', 'rechazada')),
  nota text not null default '',
  creado_en timestamptz not null default now(),
  revisado_en timestamptz
);
alter table public.recargas enable row level security;
drop policy if exists "ver recargas propias" on public.recargas;
create policy "ver recargas propias" on public.recargas for select using (usuario_id = auth.uid() or es_admin());
drop policy if exists "pedir recarga" on public.recargas;
create policy "pedir recarga" on public.recargas for insert with check (usuario_id = auth.uid() and estado = 'pendiente');
drop policy if exists "admin gestiona recargas" on public.recargas;
create policy "admin gestiona recargas" on public.recargas for all using (es_admin()) with check (es_admin());

-- -------------------------------------------------------------- movimientos
create table if not exists public.movimientos (
  id bigserial primary key,
  usuario_id uuid not null references auth.users on delete cascade,
  tipo text not null,
  monto numeric(10, 2) not null,
  detalle text not null default '',
  creado_en timestamptz not null default now()
);
alter table public.movimientos enable row level security;
drop policy if exists "ver movimientos propios" on public.movimientos;
create policy "ver movimientos propios" on public.movimientos for select using (usuario_id = auth.uid() or es_admin());
drop policy if exists "admin gestiona movimientos" on public.movimientos;
create policy "admin gestiona movimientos" on public.movimientos for all using (es_admin()) with check (es_admin());

-- ------------------------------------------------- solicitudes de revendedor
create table if not exists public.solicitudes_rev (
  id bigserial primary key,
  usuario_id uuid references auth.users on delete set null,
  nombre text not null default '',
  ciudad text not null default '',
  whatsapp text not null default '',
  volumen text not null default '',
  mensaje text not null default '',
  estado text not null default 'pendiente' check (estado in ('pendiente', 'aprobada', 'rechazada')),
  creado_en timestamptz not null default now()
);
alter table public.solicitudes_rev enable row level security;
drop policy if exists "postular a revendedor" on public.solicitudes_rev;
create policy "postular a revendedor" on public.solicitudes_rev for insert with check (true);
drop policy if exists "ver solicitud propia" on public.solicitudes_rev;
create policy "ver solicitud propia" on public.solicitudes_rev for select using (usuario_id = auth.uid() or es_admin());
drop policy if exists "admin gestiona solicitudes" on public.solicitudes_rev;
create policy "admin gestiona solicitudes" on public.solicitudes_rev for all using (es_admin()) with check (es_admin());

-- ============================================================================
-- Operaciones (lo que de verdad mueve el saldo y entrega las cuentas)
-- ============================================================================

create or replace function public.mi_perfil()
returns json language sql security definer stable set search_path = public as $$
  select coalesce((
    select json_build_object('id', id, 'nombre', nombre, 'whatsapp', whatsapp, 'rol', rol, 'saldo', saldo)
    from perfiles where id = auth.uid()), 'null'::json);
$$;

create or replace function public.actualizar_perfil(p_nombre text, p_whatsapp text)
returns json language plpgsql security definer set search_path = public as $$
begin
  update perfiles set nombre = coalesce(nullif(trim(p_nombre), ''), nombre),
                      whatsapp = coalesce(p_whatsapp, whatsapp)
  where id = auth.uid();
  return mi_perfil();
end; $$;

-- Precio que le toca a quien está comprando (normal o de revendedor).
create or replace function public.precio_para(p_plataforma text, p_meses int)
returns numeric language plpgsql security definer stable set search_path = public as $$
declare v numeric;
begin
  if es_revendedor() then
    select case when p_meses = 3 then p3 else p1 end into v from precios_rev where plataforma_id = p_plataforma;
    if v is not null then return v; end if;
  end if;
  select case when p_meses = 3 then p3 else p1 end into v from plataformas where id = p_plataforma and activo;
  return v;
end; $$;

-- Comprar con saldo: descuenta, crea el pedido y entrega del stock si hay.
create or replace function public.comprar(p_plataforma text, p_meses int)
returns json language plpgsql security definer set search_path = public as $$
declare
  v_perfil perfiles; v_precio numeric; v_stock_id bigint; v_contenido text;
  v_pedido pedidos; v_nombre text;
begin
  select * into v_perfil from perfiles where id = auth.uid() for update;
  if v_perfil.id is null then raise exception 'Necesitas iniciar sesión para comprar'; end if;
  if p_meses not in (1, 3) then raise exception 'Ese plan no existe'; end if;

  select nombre into v_nombre from plataformas where id = p_plataforma and activo;
  if v_nombre is null then raise exception 'Esa plataforma no está disponible'; end if;

  v_precio := precio_para(p_plataforma, p_meses);
  if v_precio is null then raise exception 'Ese plan no está disponible'; end if;
  if v_perfil.saldo < v_precio then
    raise exception 'Te falta saldo: cuesta % Bs y tienes % Bs', v_precio, v_perfil.saldo;
  end if;

  update perfiles set saldo = saldo - v_precio where id = v_perfil.id;

  insert into pedidos (usuario_id, plataforma_id, plataforma_nombre, meses, precio, estado)
  values (v_perfil.id, p_plataforma, v_nombre, p_meses, v_precio, 'en_espera')
  returning * into v_pedido;

  insert into movimientos (usuario_id, tipo, monto, detalle)
  values (v_perfil.id, 'compra', -v_precio, v_nombre || ' · ' || p_meses || ' mes(es)');

  select id, contenido into v_stock_id, v_contenido
  from stock where plataforma_id = p_plataforma and meses = p_meses and estado = 'libre'
  order by id limit 1 for update skip locked;

  if v_stock_id is not null then
    update stock set estado = 'entregada', pedido_id = v_pedido.id, entregado_en = now() where id = v_stock_id;
    update pedidos set estado = 'entregado', contenido = v_contenido, entregado_en = now()
    where id = v_pedido.id returning * into v_pedido;
  end if;

  return json_build_object(
    'pedido', row_to_json(v_pedido),
    'saldo', (select saldo from perfiles where id = v_perfil.id),
    'entregado', v_pedido.estado = 'entregado'
  );
end; $$;

-- Pedir una recarga (queda pendiente hasta que Mikaela la aprueba).
create or replace function public.pedir_recarga(p_monto numeric, p_comprobante text, p_nota text default '')
returns json language plpgsql security definer set search_path = public as $$
declare v recargas;
begin
  if auth.uid() is null then raise exception 'Necesitas iniciar sesión'; end if;
  if p_monto is null or p_monto <= 0 then raise exception 'El monto debe ser mayor a 0'; end if;
  insert into recargas (usuario_id, monto, comprobante, nota)
  values (auth.uid(), p_monto, p_comprobante, coalesce(p_nota, '')) returning * into v;
  return row_to_json(v);
end; $$;

-- Admin: aprobar o rechazar una recarga.
create or replace function public.revisar_recarga(p_id bigint, p_aprobar boolean, p_nota text default '')
returns json language plpgsql security definer set search_path = public as $$
declare v recargas;
begin
  if not es_admin() then raise exception 'Solo el administrador puede hacer esto'; end if;
  select * into v from recargas where id = p_id for update;
  if v.id is null then raise exception 'No encuentro esa recarga'; end if;
  if v.estado <> 'pendiente' then raise exception 'Esa recarga ya fue revisada'; end if;

  if p_aprobar then
    update perfiles set saldo = saldo + v.monto where id = v.usuario_id;
    insert into movimientos (usuario_id, tipo, monto, detalle)
    values (v.usuario_id, 'recarga', v.monto, coalesce(nullif(p_nota, ''), 'Recarga aprobada'));
    update recargas set estado = 'aprobada', nota = coalesce(p_nota, ''), revisado_en = now() where id = p_id returning * into v;
    perform entregar_pendientes();
  else
    update recargas set estado = 'rechazada', nota = coalesce(p_nota, ''), revisado_en = now() where id = p_id returning * into v;
  end if;
  return row_to_json(v);
end; $$;

-- Entrega los pedidos que estaban esperando stock (por orden de llegada).
create or replace function public.entregar_pendientes()
returns int language plpgsql security definer set search_path = public as $$
declare p pedidos; v_id bigint; v_contenido text; n int := 0;
begin
  for p in select * from pedidos where estado = 'en_espera' order by id loop
    select id, contenido into v_id, v_contenido from stock
    where plataforma_id = p.plataforma_id and meses = p.meses and estado = 'libre'
    order by id limit 1 for update skip locked;
    if v_id is not null then
      update stock set estado = 'entregada', pedido_id = p.id, entregado_en = now() where id = v_id;
      update pedidos set estado = 'entregado', contenido = v_contenido, entregado_en = now() where id = p.id;
      n := n + 1;
    end if;
  end loop;
  return n;
end; $$;

-- Admin: cargar cuentas al stock (una por línea) y entregar lo que esperaba.
create or replace function public.cargar_stock(p_plataforma text, p_meses int, p_lineas text)
returns json language plpgsql security definer set search_path = public as $$
declare l text; n int := 0; entregadas int;
begin
  if not es_admin() then raise exception 'Solo el administrador puede hacer esto'; end if;
  foreach l in array string_to_array(coalesce(p_lineas, ''), E'\n') loop
    if length(trim(l)) > 0 then
      insert into stock (plataforma_id, meses, contenido) values (p_plataforma, p_meses, trim(l));
      n := n + 1;
    end if;
  end loop;
  entregadas := entregar_pendientes();
  return json_build_object('cargadas', n, 'entregadas', entregadas);
end; $$;

-- Admin: cambiar el rol de alguien (cliente / revendedor / admin).
create or replace function public.cambiar_rol(p_usuario uuid, p_rol text)
returns json language plpgsql security definer set search_path = public as $$
begin
  if not es_admin() then raise exception 'Solo el administrador puede hacer esto'; end if;
  if p_rol not in ('cliente', 'revendedor', 'admin') then raise exception 'Rol inválido'; end if;
  update perfiles set rol = p_rol where id = p_usuario;
  return json_build_object('ok', true);
end; $$;

-- Admin: ajustar saldo a mano (por si cobra en efectivo o corrige algo).
create or replace function public.ajustar_saldo(p_usuario uuid, p_monto numeric, p_detalle text)
returns json language plpgsql security definer set search_path = public as $$
begin
  if not es_admin() then raise exception 'Solo el administrador puede hacer esto'; end if;
  update perfiles set saldo = greatest(0, saldo + p_monto) where id = p_usuario;
  insert into movimientos (usuario_id, tipo, monto, detalle)
  values (p_usuario, case when p_monto >= 0 then 'ajuste' else 'ajuste' end, p_monto, coalesce(p_detalle, 'Ajuste manual'));
  perform entregar_pendientes();
  return json_build_object('ok', true);
end; $$;

-- Cuánto stock hay disponible (sin mostrar las cuentas).
create or replace function public.disponibles()
returns table (plataforma_id text, meses int, cantidad bigint)
language sql security definer stable set search_path = public as $$
  select plataforma_id, meses, count(*) from stock where estado = 'libre' group by 1, 2;
$$;

-- Resumen para el panel de Mikaela.
create or replace function public.resumen_panel()
returns json language sql security definer stable set search_path = public as $$
  select case when es_admin() then json_build_object(
    'recargas_pendientes', (select count(*) from recargas where estado = 'pendiente'),
    'pedidos_en_espera', (select count(*) from pedidos where estado = 'en_espera'),
    'solicitudes_pendientes', (select count(*) from solicitudes_rev where estado = 'pendiente'),
    'stock_libre', (select count(*) from stock where estado = 'libre'),
    'clientes', (select count(*) from perfiles),
    'vendido_hoy', (select coalesce(sum(precio), 0) from pedidos where creado_en::date = now()::date)
  ) else 'null'::json end;
$$;

-- ============================================================================
-- Permisos de las funciones
-- ============================================================================
grant execute on function public.mi_perfil, public.actualizar_perfil, public.precio_para,
  public.comprar, public.pedir_recarga, public.disponibles to authenticated;
grant execute on function public.revisar_recarga, public.cargar_stock, public.cambiar_rol,
  public.ajustar_saldo, public.entregar_pendientes, public.resumen_panel to authenticated;
grant execute on function public.disponibles to anon;

-- ============================================================================
-- Carpeta para los comprobantes de pago
-- ============================================================================
insert into storage.buckets (id, name, public) values ('comprobantes', 'comprobantes', false)
on conflict (id) do nothing;

drop policy if exists "subir comprobante propio" on storage.objects;
create policy "subir comprobante propio" on storage.objects for insert to authenticated
with check (bucket_id = 'comprobantes' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "ver comprobante propio" on storage.objects;
create policy "ver comprobante propio" on storage.objects for select to authenticated
using (bucket_id = 'comprobantes' and ((storage.foldername(name))[1] = auth.uid()::text or public.es_admin()));
