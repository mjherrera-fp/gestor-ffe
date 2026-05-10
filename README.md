<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# Run and deploy your AI Studio app

This contains everything you need to run your app locally.

View your app in AI Studio: https://ai.studio/apps/118188c6-b950-4a0e-8699-8bc8f15a880c

## Run Locally

**Prerequisites:**  Node.js


1. Install dependencies:
   `npm install`
2. Set the `GEMINI_API_KEY` in [.env.local](.env.local) to your Gemini API key
3. Run the app:
   `npm run dev`
4. Package (Desde un terminal como administrador):
   `sudo npm run pack:win` 
5. Una vez empaquetado hay que volver a hacer un rebuild de sqlite
   `npm rebuild better-sqlite3`


   relaciones/
├── RelacionesView.tsx          ~100 líneas  ← orquestador puro
├── hooks/
│   └── useRelaciones.ts        ~280 líneas  ← todo el estado y lógica
├── utils/
│   └── relacionesUtils.ts      ~200 líneas  ← funciones puras (fechas, estados, badges)
└── components/
    ├── RelacionesListado.tsx   ~180 líneas  ← columna izquierda (tabla + filtros)
    ├── RelacionDetalle.tsx     ~150 líneas  ← columna derecha (documentación)
    └── RelacionFormModal.tsx   ~300 líneas  ← modal crear/editar