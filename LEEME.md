# Mikaela 3K Streaming — cómo encender la tienda

La web ya funciona en **modo prueba**: puedes crear cuentas, recargar saldo,
comprar y usar el panel, pero todo se guarda **solo en tu navegador**. Sirve
para practicar sin miedo. Para que funcione de verdad (con clientes reales,
desde cualquier celular) hay que conectarla a Supabase. Son 3 pasos.

---

## Paso 1 — Crear el proyecto (5 minutos, gratis)

1. Entra a **supabase.com** y crea tu cuenta con tu Gmail. No pide tarjeta.
2. Botón **New project**.
   - Nombre: `mikaela-3k`
   - Región: **South America (São Paulo)**
   - Te pide una contraseña de base de datos: invéntala y **guárdala**. Es tuya.
3. Espera a que termine de crearse (un minuto).

## Paso 2 — Crear las tablas

1. En el menú de la izquierda entra a **SQL Editor** → **New query**.
2. Abre el archivo `sql/01-instalar.sql`, copia **todo** y pégalo ahí. Dale **Run**.
3. Nueva consulta. Ahora copia todo `sql/02-catalogo.sql` y dale **Run**.
   (Esto carga las 16 plataformas con sus precios.)

## Paso 3 — Conectar la web

1. En Supabase entra a **Project Settings → API**.
2. Copia el **Project URL** y la clave **anon public**.
3. Ábrelos en el archivo `js/config.js` y pégalos entre las comillas:

```js
M3K.config = {
  supabaseUrl: 'https://xxxxxxxx.supabase.co',
  supabaseKey: 'eyJhbGciOi...'
};
```

> La clave **service_role** NO se usa aquí y no se le pasa a nadie.

## Paso 4 — Hacerte administradora

1. Abre la web, toca **Entrar** y crea tu cuenta con el correo de Mikaela.
2. Vuelve al **SQL Editor** de Supabase y corre esto, cambiando el correo:

```sql
update public.perfiles set rol = 'admin'
where id = (select id from auth.users where email = 'correo-de-mikaela@gmail.com');
```

3. Listo. Entra a `panel.html` con esa cuenta y ya tienes el panel.

---

## El día a día

**Cuando alguien recarga saldo**
El cliente paga con el QR, sube su comprobante y aparece en el panel, pestaña
**Recargas**. Revisas el monto en tu app del banco y tocas **Aprobar**. El saldo
se le carga al instante y, si tenía un pedido esperando, se le entrega solo.

**Cargar cuentas al stock**
Panel → **Cargar cuentas**. Eliges la plataforma y el plan, y pegas las cuentas
**una por línea**, tal cual quieres que le lleguen al cliente. Por ejemplo:

```
correo1@gmail.com | clave123 | Perfil: el tuyo
correo2@gmail.com | clave456 | PIN 1234
```

Cada línea es una cuenta. Al cargarlas, los pedidos que estaban esperando se
entregan automáticamente.

**Precios de revendedor**
Panel → **Precios revendedor**. Pones el precio de 1 mes y de 3 meses de cada
plataforma. Si dejas una vacía, ese revendedor verá el precio normal. Esos
precios **solo** los ven las cuentas marcadas como revendedor: nadie más puede
leerlos, ni mirando el código de la página.

**Aprobar revendedores**
Panel → **Solicitudes**. Al aprobar, esa persona pasa a ver sus precios de mayor
con su misma cuenta. También puedes cambiar el rol a mano en **Clientes**.

**Cobros en efectivo**
Panel → **Clientes** → **Ajustar saldo**. Le sumas (o restas) saldo a mano y
queda registrado en su historial.

---

## Preguntas que te van a hacer

**¿Y si no hay stock cuando alguien compra?**
El saldo se descuenta, el pedido queda **En camino** y al cliente le aparece un
botón para escribir a soporte. Apenas cargues esa cuenta, se entrega sola.

**¿Se puede seguir comprando por WhatsApp?**
Sí. El botón de siempre sigue ahí; el saldo es un camino extra, no un reemplazo.

**¿Dónde se guardan los comprobantes?**
En Supabase, en una carpeta privada. Solo los ve quien subió el archivo y tú.

---

## Archivos

| Carpeta / archivo | Para qué es |
|---|---|
| `index.html` | La web que ven los clientes |
| `panel.html` | El panel de Mikaela |
| `js/datos.js` | Catálogo de respaldo y datos del negocio (WhatsApp, QR) |
| `js/config.js` | Las dos claves de Supabase |
| `js/backend.js` | Conexión con la base de datos (y el modo prueba) |
| `js/cuenta.js` | Cuenta, saldo, recargas, compras, zona revendedor |
| `js/panel.js` | El panel |
| `js/mika.js` | Mika, el asistente del chat |
| `sql/` | Lo que se pega en Supabase |
| `img/` | Logo, flyers, QR |
| `_video/` | Herramientas para grabar el video de presentación (no se publica) |
| `originales/` | Las imágenes tal cual llegaron por WhatsApp (no se publica) |
