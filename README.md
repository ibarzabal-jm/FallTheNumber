# Fall The Number

Juego simple en **HTML + CSS + JS** (sin dependencias) inspirado en mecánicas de caída con gravedad y unión de números iguales.

## Reglas

- Cae un bloque numérico en un tablero de 5 columnas (valores aleatorios entre 2 y 128).
- Puedes moverlo izquierda/derecha antes de que se fije.
- Al tocar fondo (o con caída rápida), se fija.
- Bloques con el mismo número se fusionan en uno de valor doble.
- Después de cada fusión se vuelve a aplicar gravedad para permitir cascadas.
- Si no hay espacio para crear el siguiente bloque, termina la partida.

## Controles

- **Mobile recomendado**:
  - Arrastra el dedo en la barra superior de columnas y **al soltar** cae en esa columna.
  - Botones táctiles: `◀`, `▶`, `⤓`
- Teclado (desktop):
  - `←` / `→`
  - `↓` o `Espacio` para caída rápida

## Ejecutar local

No requiere build:

1. Abre `index.html` directamente, o
2. Levanta un server estático:

```bash
python3 -m http.server 4173
```

## Deploy rápido en Netlify

### Opción 1 (drag & drop)
1. Comprime la carpeta del proyecto.
2. En Netlify, usa **Add new site > Deploy manually**.
3. Arrastra el zip.

### Opción 2 (Git)
1. Sube este repo a GitHub/GitLab/Bitbucket.
2. En Netlify: **Add new site > Import an existing project**.
3. Build command: *(vacío)*.
4. Publish directory: `.`

Incluye `netlify.toml` para que Netlify publique directamente la raíz.
