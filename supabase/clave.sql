-- Mostrador · Ajuste 1 (Etapa 12)
-- 1) Cada negocio puede tener sus propios códigos de producto sin chocar con otro negocio.
-- 2) Las fotos recortadas (PNG) pueden pesar hasta 10 MB.
-- Se puede correr más de una vez sin problema.

alter table public.productos drop constraint if exists productos_pkey;
alter table public.productos add constraint productos_pkey primary key (negocio_id, id);

update storage.buckets set file_size_limit = 10485760 where id = 'fotos';
