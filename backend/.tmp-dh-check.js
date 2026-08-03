require("dotenv").config();
const { Client } = require("pg");
(async () => {
  const c = new Client({host:process.env.DB_HOST||"localhost",port:Number(process.env.DB_PORT||5432),user:process.env.DB_USER||"postgres",password:process.env.DB_PASSWORD||"raul123",database:process.env.DB_NAME||"mantenimiento"});
  await c.connect();
  const a = await c.query("SELECT acuerdo_nivel_servicio_dh dh, COUNT(*)::int total FROM equipos WHERE UPPER(COALESCE(estado,''))='ACTIVO' GROUP BY 1 ORDER BY 1");
  const i = await c.query("SELECT acuerdo_nivel_servicio_dh dh, COUNT(*)::int total FROM equipos WHERE UPPER(COALESCE(estado,''))<>'ACTIVO' GROUP BY 1 ORDER BY 1");
  console.log('ACTIVOS_POR_DH', a.rows);
  console.log('INACTIVOS_POR_DH', i.rows);
  await c.end();
})().catch(e=>{console.error(e);process.exit(1);});
