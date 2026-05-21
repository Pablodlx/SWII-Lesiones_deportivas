# SWII Lesiones Deportivas

API REST sobre **lesiones deportivas** con enriquecimiento meteorológico en tiempo real. Almacena deportistas, sesiones de entrenamiento y lesiones, y al crear una sesión consulta dos fuentes externas (Open-Meteo en JSON y Meteoalarm en XML) para calcular automáticamente el nivel de riesgo.

El proyecto incluye una **interfaz Aurora** servida por la propia API: al arrancar, abre `http://localhost:3000/` y verás todos los endpoints documentados y un botón "Probar" en cada uno para ejecutar llamadas reales sin tocar `curl`.

---

## Tabla de contenidos

1. [Stack](#stack)
2. [Requisitos previos](#requisitos-previos)
3. [Setup en 5 pasos](#setup-en-5-pasos)
4. [La interfaz Aurora](#la-interfaz-aurora)
5. [Endpoints](#endpoints)
6. [Variables de entorno](#variables-de-entorno)
7. [Scripts npm](#scripts-npm)
8. [Estructura del repositorio](#estructura-del-repositorio)
9. [Documentación adicional](#documentación-adicional)
10. [Troubleshooting](#troubleshooting)
11. [Alumnos](#alumnos)

---

## Stack

| Componente       | Tecnología                                        |
|------------------|---------------------------------------------------|
| Runtime          | Node.js ≥ 18                                      |
| Framework HTTP   | Express 5                                         |
| Base de datos    | MongoDB ≥ 6 (Mongoose 8)                          |
| Formatos         | JSON (default) y XML (negociación por `Accept`)   |
| Integraciones    | Open-Meteo (JSON) · Meteoalarm CAP feed (XML)     |
| Frontend         | HTML/CSS/JS vanilla — sin build, servido estático |

No hay claves de API que conseguir: las dos fuentes externas son públicas y gratuitas.

---

## Requisitos previos

- **Node.js 18 o superior** — comprueba con `node -v`. Instalador oficial: <https://nodejs.org/>.
- **MongoDB en local** corriendo en el puerto `27017`. Elige una de las opciones:

### Opción A — Docker (recomendado, una línea)

Si tienes Docker instalado, ésta es la vía más rápida y portable:

```bash
docker run -d -p 27017:27017 --name mongo-swii mongo:7
```

Para pararlo más tarde: `docker stop mongo-swii`. Para volver a arrancarlo: `docker start mongo-swii`.

### Opción B — Instalación local

Descarga MongoDB Community: <https://www.mongodb.com/try/download/community>. Arrástralo y déjalo escuchar en `mongodb://localhost:27017`.

### Opción C — MongoDB Atlas (cloud)

Crea un cluster gratuito en <https://www.mongodb.com/atlas>, copia la cadena de conexión y pégala en `MONGO_URI` (paso 3 del setup).

---

## Setup en 5 pasos

```bash
# 1. Clonar el repositorio
git clone https://github.com/Pablodlx/SWII-Lesiones_deportivas.git
cd SWII-Lesiones_deportivas

# 2. Instalar dependencias
npm install

# 3. Copiar el archivo de entorno (los defaults funcionan con MongoDB local)
cp .env.example .env

# 4. Sembrar la base de datos con el dataset (~15.420 sesiones)
npm run seed

# 5. Arrancar la API + interfaz
npm start
```

Tras `npm start` deberías ver:

```
Server listening on port 3000
```

Abre el navegador en **<http://localhost:3000/>**. Si todo va bien, el badge superior derecho marcará "API en línea" en verde.

> El seed borra y recarga las colecciones (`athletes`, `training_sessions`, `injuries`). Tarda un par de minutos por el volumen de sesiones; es normal.

---

## La interfaz Aurora

Está pensada para mostrar y probar la API sin necesidad de instalar Postman ni escribir `curl`. Lo que encontrarás:

- **Sidebar** con los 23 endpoints agrupados por recurso (Health · Athletes · Sessions · Injuries · External).
- **Panel central** que al seleccionar un endpoint muestra método, ruta, descripción, parámetros editables y un editor de JSON para el body. Botón "Probar" → ejecuta la llamada real contra la API y pinta status code, tiempo de respuesta y JSON formateado, resaltando los campos clave (`riskLevel`, `weatherAlertLevel`, `externalDataStatus`).
- **Pruebas rápidas** (sección inferior) — flujo de 5 pasos numerados que demuestra que la API funciona de extremo a extremo:
  1. `GET /health` — la API responde.
  2. `GET /athletes` — la BD está sembrada.
  3. `POST /athletes` — se puede crear un atleta nuevo (su `_id` se encadena al siguiente paso).
  4. `POST /sessions` — crea una sesión y muestra el enriquecimiento meteorológico + cálculo de riesgo automático.
  5. `GET /external/status` — diagnóstico de las dos fuentes externas.

Toda la UI es HTML/CSS/JS vanilla servido desde `public/`. No hay paso de build.

---

## Endpoints

Base URL: `http://localhost:3000/api/v1`

### Health

| Método | Ruta      | Descripción           |
|--------|-----------|-----------------------|
| GET    | `/health` | Liveness probe        |

### Athletes (CRUD + relaciones)

| Método | Ruta                                  | Descripción                          |
|--------|---------------------------------------|--------------------------------------|
| GET    | `/athletes`                           | Listar atletas                       |
| POST   | `/athletes`                           | Crear atleta (JSON o XML)            |
| GET    | `/athletes/:id`                       | Obtener atleta                       |
| PUT    | `/athletes/:id`                       | Actualizar atleta                    |
| DELETE | `/athletes/:id`                       | Eliminar atleta                      |
| GET    | `/athletes/:athleteId/sessions`       | Sesiones del atleta (paginado)       |
| POST   | `/athletes/:athleteId/sessions`       | Crear sesión enriquecida del atleta  |
| GET    | `/athletes/:athleteId/injuries`       | Lesiones del atleta                  |
| POST   | `/athletes/:athleteId/injuries`       | Crear lesión del atleta              |

### Sessions (CRUD + relación)

| Método | Ruta                            | Descripción                              |
|--------|---------------------------------|------------------------------------------|
| GET    | `/sessions`                     | Listar sesiones con `?page&limit` + filtros |
| POST   | `/sessions`                     | Crear sesión global (enriquecida)        |
| GET    | `/sessions/:id`                 | Obtener sesión                           |
| PUT    | `/sessions/:id`                 | Actualizar sesión                        |
| DELETE | `/sessions/:id`                 | Eliminar sesión                          |
| GET    | `/sessions/:sessionId/injuries` | Lesiones de la sesión                    |

Filtros disponibles en `GET /sessions`: `athleteId`, `riskLevel`, `weatherAlertLevel`, `from`, `to`.

### Injuries (CRUD)

| Método | Ruta             | Descripción                            |
|--------|------------------|----------------------------------------|
| GET    | `/injuries`      | Listar lesiones (`?athleteId&sessionId`) |
| POST   | `/injuries`      | Crear lesión                           |
| GET    | `/injuries/:id`  | Obtener lesión                         |
| PUT    | `/injuries/:id`  | Actualizar lesión                      |
| DELETE | `/injuries/:id`  | Eliminar lesión                        |

### External (fuentes meteorológicas)

| Método | Ruta                         | Descripción                              |
|--------|------------------------------|------------------------------------------|
| POST   | `/external/weather/refresh`  | Fuerza fetch JSON (Open-Meteo)           |
| POST   | `/external/alerts/refresh`   | Fuerza fetch XML (Meteoalarm CAP)        |
| GET    | `/external/status`           | Estado de las dos fuentes externas       |

Las dos rutas `refresh` devuelven `503 EXTERNAL_UNAVAILABLE` si las fuentes están caídas y no hay cache. La especificación OpenAPI completa está en [`documentacion/openapi.yaml`](documentacion/openapi.yaml).

### Negociación de formato

`POST /athletes`, `GET /athletes/:id`, `POST /injuries` y `POST /athletes/:id/injuries` aceptan **JSON** o **XML** según el `Content-Type`/`Accept` que envíes. Schemas XSD: [`documentacion/athlete.xsd`](documentacion/athlete.xsd), [`documentacion/injury.xsd`](documentacion/injury.xsd).

---

## Variables de entorno

Copia `.env.example` a `.env`. Todas tienen un default razonable:

| Variable               | Default                                                                | Para qué sirve                       |
|------------------------|------------------------------------------------------------------------|--------------------------------------|
| `PORT`                 | `3000`                                                                 | Puerto HTTP del servidor             |
| `MONGO_URI`            | `mongodb://localhost:27017/swii_lesiones`                              | Cadena de conexión MongoDB           |
| `OPEN_METEO_BASE_URL`  | `https://api.open-meteo.com/v1/forecast`                               | API JSON de meteorología             |
| `METEOALARM_FEED_URL`  | `https://feeds.meteoalarm.org/feeds/meteoalarm-legacy-atom.xml`        | Feed CAP XML de alertas              |

---

## Scripts npm

| Comando              | Qué hace                                                            |
|----------------------|---------------------------------------------------------------------|
| `npm start`          | Arranca la API en el puerto configurado                             |
| `npm run dev`        | Igual que `start` pero con `node --watch` (recarga al editar)       |
| `npm run seed`       | Carga `data/*.json` en MongoDB (borra colecciones existentes)       |
| `npm run generate`   | Regenera `data/*.json` a partir del CSV original en `archive/`      |

---

## Estructura del repositorio

```
SWII-Lesiones_deportivas/
├── src/                       # Código de la API
│   ├── server.js              # Entry point: conecta MongoDB y lanza Express
│   ├── app.js                 # Rutas REST + middlewares + manejo de errores
│   ├── config.js              # Lee .env y exporta configuración
│   ├── db.js                  # Conexión Mongoose
│   ├── models/                # Schemas Mongoose (athlete, session, injury, weatherSnapshot)
│   ├── services/              # Llamadas a Open-Meteo y Meteoalarm + cálculo de riesgo
│   └── utils/                 # Parseo/serialización XML
├── public/                    # Interfaz Aurora (servida estática por Express)
│   ├── index.html
│   ├── styles.css
│   ├── app.js
│   └── endpoints.js
├── scripts/
│   ├── seed.js                # Carga data/*.json en MongoDB
│   └── generate-datasets.js   # Genera data/*.json desde el CSV de Kaggle
├── data/                      # Datasets en JSON listos para sembrar
├── archive/                   # CSV original de Kaggle (15.420 muestras, 156 atletas)
├── documentacion/             # OpenAPI, modelo de datos, diseño REST, XSDs
└── README.md
```

---

## Documentación adicional

| Archivo                                                                 | Contenido                                              |
|--------------------------------------------------------------------------|--------------------------------------------------------|
| [`documentacion/openapi.yaml`](documentacion/openapi.yaml)              | OpenAPI 3.0.3 completo (todas las rutas, schemas, ejemplos) |
| [`documentacion/diseno-interfaz-rest.md`](documentacion/diseno-interfaz-rest.md) | Diseño REST: recursos, relaciones, decisiones técnicas |
| [`documentacion/modelo-datos.md`](documentacion/modelo-datos.md)        | Modelo de datos MongoDB: colecciones e índices         |
| [`documentacion/athlete.xsd`](documentacion/athlete.xsd)                | XML Schema para `Athlete`                              |
| [`documentacion/injury.xsd`](documentacion/injury.xsd)                  | XML Schema para `Injury`                               |

---

## Troubleshooting

**`MongoServerError: connect ECONNREFUSED ::1:27017`**
Mongo no está corriendo. Lánzalo con `docker start mongo-swii` (o el comando `docker run` del paso A si es la primera vez), o arranca tu servicio local de MongoDB.

**`Error: listen EADDRINUSE :::3000`**
Otra cosa ocupa el puerto 3000. O bien la matas, o cambias `PORT` en `.env`. Luego vuelve a abrir `http://localhost:<nuevo-puerto>/`.

**`npm run seed` parece colgarse**
Es normal que tarde un par de minutos: el seed inserta ~15.000 documentos. Si no avanza tras 5 minutos, verifica que Mongo está accesible (`docker ps` o conectarse con `mongosh`).

**Las llamadas a `/external/*` devuelven 503**
Open-Meteo o Meteoalarm están temporalmente caídas. Si ya habías creado snapshots previos, la API los reutiliza y marca `externalDataStatus = "cached"`. No bloquea el CRUD.

**La UI muestra "API no responde"**
Comprueba que `npm start` está corriendo en otra terminal y que respondas con `curl http://localhost:3000/api/v1/health`. Si te devuelve `{"ok":true}` pero la UI no, recarga sin caché (`Ctrl+Shift+R`).

**Mongo en Atlas no conecta**
Verifica que tu IP está en la whitelist del cluster y que la cadena en `MONGO_URI` incluye usuario, password y nombre de la BD (`.../swii_lesiones`).

---

## Alumnos



- Pablo de la Cruz
- Enrique Muñoz
- Santiago Battat
- Alberto Fernández
- Víctor Martínez
- Miguel Barrera

**Datos:** [Multimodal Sports Injury Prediction Dataset](https://www.kaggle.com/) (15.420 muestras, 156 atletas) — Kaggle.

**Fuentes meteorológicas:** [Open-Meteo](https://open-meteo.com/) y [Meteoalarm](https://feeds.meteoalarm.org/) (servicios públicos sin API key).
