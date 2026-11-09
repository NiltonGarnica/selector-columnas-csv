import path from "node:path";
import { fileURLToPath } from "node:url";
import express from "express";

const app = express();

app.get("/api/estado", (_req, res) => {
  res.json({ ok: true });
});

// Entrega el frontend compilado (client/dist).
const clientDist = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../client/dist");
app.use(express.static(clientDist));
app.get(/^\/(?!api\/).*/, (_req, res) => {
  res.sendFile(path.join(clientDist, "index.html"), (err) => {
    if (err) res.status(404).send("Compila el cliente con «npm run build».");
  });
});

const port = Number(process.env.PORT) || 3001;
app.listen(port, () => {
  console.log(`Servidor de Mapper ETL en http://localhost:${port}`);
});
