# Mapper ETL

Aplicación web para subir un archivo CSV, elegir qué columnas incluir y exportar el resultado.

- **Frontend:** React + TypeScript (Vite)
- **Backend:** Node.js + Express + TypeScript
- **CSV:** Papa Parse (comillas, comas, punto y coma, tabuladores y saltos de línea dentro de los campos)

## Funciones

- **Subir CSV**: lee los encabezados reales del archivo, con cualquier cantidad de columnas. Detecta el separador y la codificación (UTF-8 o Windows-1252).
- Paneles **CSV original** y **Resultado** lado a lado, con desplazamiento horizontal y todos los registros.
- Casillas por columna y contador («5 de 15 columnas seleccionadas»).
- **Exportar CSV**: descarga exactamente las columnas del panel Resultado, con sus nombres, en su orden original y con todos los registros en el mismo orden.
- Mensajes claros si el archivo está vacío o no se puede leer.

## Puesta en marcha

Requisitos: Node.js 20 o superior.

```bash
npm install
npm run dev
```

- Frontend: http://localhost:5173
- Backend: http://localhost:3001

## Producción

```bash
npm run build
npm start        # sirve la API y el frontend compilado en http://localhost:3001
```

## Pruebas

```bash
npm test
```

Incluye el caso de un CSV de 15 columnas del que se seleccionan 5: el archivo exportado tiene esas 5 columnas y la misma cantidad de registros que el original.
