# Cómo re-verificar la migración

No hace falta para usarla: ya está verificada. Esto es por si alguien toca la
0014 más adelante y quiere confirmar que no rompió nada.

`01_esquema_base.sql` reconstruye en un Postgres vacío lo mínimo del esquema
VitaeGest que la 0014 toca, con una profesional "de antes" ya cargada.
`02_casos.sql` corre veinte casos.

```bash
createdb vg
psql -d vg -v ON_ERROR_STOP=1 -f pruebas/01_esquema_base.sql
psql -d vg -v ON_ERROR_STOP=1 -f 0014_sedes_y_horarios.sql
psql -d vg -f pruebas/02_casos.sql     # termina en "TODAS LAS PRUEBAS PASARON"
```

Necesita los roles `anon` y `authenticated` (los crea Supabase; en un Postgres
suelto: `create role anon; create role authenticated;`).

Correr `02_casos.sql` dos veces sobre la misma base falla: los casos insertan
datos con id fijo. Recrear la base entre corridas.
