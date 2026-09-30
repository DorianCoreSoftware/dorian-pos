/*
 * Configuración genérica para encabezado y pie de tickets.
 *
 * El logo raster ESC/POS deja de ser obligatorio: la impresora puede
 * identificar cualquier negocio usando los datos configurados aquí.
 */

alter table public.business_settings
  add column if not exists address text,
  add column if not exists ticket_footer text;

update public.business_settings
set ticket_footer = coalesce(
  nullif(trim(ticket_footer), ''),
  'Gracias por tu compra'
)
where id = 1;
