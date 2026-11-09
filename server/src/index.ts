import "dotenv/config";
import path from "node:path";
import { fileURLToPath } from "node:url";
import express from "express";
import { ConfigError, suggestColumns } from "./gemini.js";
import { validateRequest } from "./suggestion.js";

const app = express();
app.use(express.json({ limit: "500kb" }));

app.post("/api/sugerir-columnas", async (req, res) => {
  const validation = validateRequest(req.body);
  if (!validation.ok) {
    res.status(400).json({ error: validation.error });
    return;
  }
  try {
    const { objetivo, encabezados } = validation.value;
    res.json(await suggestColumns(objetivo, encabezados));
  } catch (err) {
    if (err instanceof ConfigError) {
      res.status(503).json({ error: err.message });
      return;
    }
    console.error("Error al consultar Gemini:", err);
    res.status(502).json({ error: "No se pudo obtener una sugerencia de Gemini. Inténtalo de nuevo." });
  }
});

// En producción, el servidor también entrega el frontend compilado.
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
