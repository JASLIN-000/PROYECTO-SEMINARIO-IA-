# React + TypeScript + Vite

This template provides a minimal setup to get React working in Vite with HMR and some Oxlint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Oxc](https://oxc.rs)
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/)

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the Oxlint configuration

If you are developing a production application, we recommend enabling type-aware lint rules by installing `oxlint-tsgolint` and editing `.oxlintrc.json`:

```json
{
  "$schema": "./node_modules/oxlint/configuration_schema.json",
  "plugins": ["react", "typescript", "oxc"],
  "options": {
    "typeAware": true
  },
  "rules": {
    "react/rules-of-hooks": "error",
    "react/only-export-components": ["warn", { "allowConstantExport": true }]
  }
}
```

See the [Oxlint rules documentation](https://oxc.rs/docs/guide/usage/linter/rules) for the full list of rules and categories.

## Variables de entorno para Solicitudes (Google Forms)

Para habilitar la generación de solicitudes de cotización y pedido desde TrazaDH, define estas variables en `.env` del frontend:

```bash
VITE_GOOGLE_FORM_COTIZACION_URL="https://docs.google.com/forms/d/e/TU_FORM_COTIZACION/viewform"
VITE_GOOGLE_FORM_PEDIDO_URL="https://docs.google.com/forms/d/e/TU_FORM_PEDIDO/viewform"

# IDs de preguntas (entry.xxxxx) que reciben autocompletado
VITE_GF_ENTRY_EQUIPO_ID="entry.111111111"
VITE_GF_ENTRY_NOMBRE_EDIFICIO="entry.222222222"
VITE_GF_ENTRY_TORRE_ASCENSOR="entry.333333333"
VITE_GF_ENTRY_RUTA_NUMERO="entry.444444444"
VITE_GF_ENTRY_SOLICITANTE="entry.555555555"

# Opcional: incluir ruta también en el formulario de pedido
VITE_GF_PEDIDO_INCLUIR_RUTA="false"
```

Con esto, TrazaDH abrirá Google Forms con los datos generales del equipo y solicitante ya diligenciados.
