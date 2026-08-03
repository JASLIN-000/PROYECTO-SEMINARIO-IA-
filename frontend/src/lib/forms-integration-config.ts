export type FormsIntegrationConfig = {
  cotizacionUrl: string;
  pedidoUrl: string;
  cotizacionEntryEquipoId: string;
  cotizacionEntryNombreEdificio: string;
  cotizacionEntryTorreAscensor: string;
  cotizacionEntryRutaNumero: string;
  cotizacionEntrySolicitante: string;
  pedidoEntryEquipoId: string;
  pedidoEntryNombreEdificio: string;
  pedidoEntryTorreAscensor: string;
  pedidoEntryRutaNumero: string;
  pedidoEntrySolicitante: string;
  entryEquipoId: string;
  entryNombreEdificio: string;
  entryTorreAscensor: string;
  entryRutaNumero: string;
  entrySolicitante: string;
  pedidoIncluirRuta: boolean;
};

const STORAGE_KEY = 'trazadh:forms:integration-config';

const defaults: FormsIntegrationConfig = {
  cotizacionUrl: String(import.meta.env.VITE_GOOGLE_FORM_COTIZACION_URL || 'https://forms.gle/pjunEZqwXQ3bwgHZ7').trim(),
  pedidoUrl: String(import.meta.env.VITE_GOOGLE_FORM_PEDIDO_URL || 'https://forms.gle/CnPmXWCuPTbwdgx98').trim(),
  cotizacionEntryEquipoId: String(import.meta.env.VITE_GF_COT_ENTRY_EQUIPO_ID || '').trim(),
  cotizacionEntryNombreEdificio: String(import.meta.env.VITE_GF_COT_ENTRY_NOMBRE_EDIFICIO || '').trim(),
  cotizacionEntryTorreAscensor: String(import.meta.env.VITE_GF_COT_ENTRY_TORRE_ASCENSOR || '').trim(),
  cotizacionEntryRutaNumero: String(import.meta.env.VITE_GF_COT_ENTRY_RUTA_NUMERO || '').trim(),
  cotizacionEntrySolicitante: String(import.meta.env.VITE_GF_COT_ENTRY_SOLICITANTE || '').trim(),
  pedidoEntryEquipoId: String(import.meta.env.VITE_GF_PED_ENTRY_EQUIPO_ID || '').trim(),
  pedidoEntryNombreEdificio: String(import.meta.env.VITE_GF_PED_ENTRY_NOMBRE_EDIFICIO || '').trim(),
  pedidoEntryTorreAscensor: String(import.meta.env.VITE_GF_PED_ENTRY_TORRE_ASCENSOR || '').trim(),
  pedidoEntryRutaNumero: String(import.meta.env.VITE_GF_PED_ENTRY_RUTA_NUMERO || '').trim(),
  pedidoEntrySolicitante: String(import.meta.env.VITE_GF_PED_ENTRY_SOLICITANTE || '').trim(),
  entryEquipoId: String(import.meta.env.VITE_GF_ENTRY_EQUIPO_ID || '').trim(),
  entryNombreEdificio: String(import.meta.env.VITE_GF_ENTRY_NOMBRE_EDIFICIO || '').trim(),
  entryTorreAscensor: String(import.meta.env.VITE_GF_ENTRY_TORRE_ASCENSOR || '').trim(),
  entryRutaNumero: String(import.meta.env.VITE_GF_ENTRY_RUTA_NUMERO || '').trim(),
  entrySolicitante: String(import.meta.env.VITE_GF_ENTRY_SOLICITANTE || '').trim(),
  pedidoIncluirRuta: String(import.meta.env.VITE_GF_PEDIDO_INCLUIR_RUTA || 'false').trim().toLowerCase() === 'true',
};

function parse(value: string | null): Partial<FormsIntegrationConfig> {
  if (!value) {
    return {};
  }

  try {
    const parsed = JSON.parse(value) as Partial<FormsIntegrationConfig>;
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

export function getFormsIntegrationConfig(): FormsIntegrationConfig {
  if (typeof window === 'undefined') {
    return { ...defaults };
  }

  const parsed = parse(window.localStorage.getItem(STORAGE_KEY));

  return {
    cotizacionUrl: String(parsed.cotizacionUrl ?? defaults.cotizacionUrl ?? '').trim(),
    pedidoUrl: String(parsed.pedidoUrl ?? defaults.pedidoUrl ?? '').trim(),
    cotizacionEntryEquipoId: String(parsed.cotizacionEntryEquipoId ?? defaults.cotizacionEntryEquipoId ?? '').trim(),
    cotizacionEntryNombreEdificio: String(parsed.cotizacionEntryNombreEdificio ?? defaults.cotizacionEntryNombreEdificio ?? '').trim(),
    cotizacionEntryTorreAscensor: String(parsed.cotizacionEntryTorreAscensor ?? defaults.cotizacionEntryTorreAscensor ?? '').trim(),
    cotizacionEntryRutaNumero: String(parsed.cotizacionEntryRutaNumero ?? defaults.cotizacionEntryRutaNumero ?? '').trim(),
    cotizacionEntrySolicitante: String(parsed.cotizacionEntrySolicitante ?? defaults.cotizacionEntrySolicitante ?? '').trim(),
    pedidoEntryEquipoId: String(parsed.pedidoEntryEquipoId ?? defaults.pedidoEntryEquipoId ?? '').trim(),
    pedidoEntryNombreEdificio: String(parsed.pedidoEntryNombreEdificio ?? defaults.pedidoEntryNombreEdificio ?? '').trim(),
    pedidoEntryTorreAscensor: String(parsed.pedidoEntryTorreAscensor ?? defaults.pedidoEntryTorreAscensor ?? '').trim(),
    pedidoEntryRutaNumero: String(parsed.pedidoEntryRutaNumero ?? defaults.pedidoEntryRutaNumero ?? '').trim(),
    pedidoEntrySolicitante: String(parsed.pedidoEntrySolicitante ?? defaults.pedidoEntrySolicitante ?? '').trim(),
    entryEquipoId: String(parsed.entryEquipoId ?? defaults.entryEquipoId ?? '').trim(),
    entryNombreEdificio: String(parsed.entryNombreEdificio ?? defaults.entryNombreEdificio ?? '').trim(),
    entryTorreAscensor: String(parsed.entryTorreAscensor ?? defaults.entryTorreAscensor ?? '').trim(),
    entryRutaNumero: String(parsed.entryRutaNumero ?? defaults.entryRutaNumero ?? '').trim(),
    entrySolicitante: String(parsed.entrySolicitante ?? defaults.entrySolicitante ?? '').trim(),
    pedidoIncluirRuta: Boolean(parsed.pedidoIncluirRuta ?? defaults.pedidoIncluirRuta),
  };
}

export function saveFormsIntegrationConfig(input: FormsIntegrationConfig) {
  if (typeof window === 'undefined') {
    return;
  }

  const payload: FormsIntegrationConfig = {
    cotizacionUrl: String(input.cotizacionUrl || '').trim(),
    pedidoUrl: String(input.pedidoUrl || '').trim(),
    cotizacionEntryEquipoId: String(input.cotizacionEntryEquipoId || '').trim(),
    cotizacionEntryNombreEdificio: String(input.cotizacionEntryNombreEdificio || '').trim(),
    cotizacionEntryTorreAscensor: String(input.cotizacionEntryTorreAscensor || '').trim(),
    cotizacionEntryRutaNumero: String(input.cotizacionEntryRutaNumero || '').trim(),
    cotizacionEntrySolicitante: String(input.cotizacionEntrySolicitante || '').trim(),
    pedidoEntryEquipoId: String(input.pedidoEntryEquipoId || '').trim(),
    pedidoEntryNombreEdificio: String(input.pedidoEntryNombreEdificio || '').trim(),
    pedidoEntryTorreAscensor: String(input.pedidoEntryTorreAscensor || '').trim(),
    pedidoEntryRutaNumero: String(input.pedidoEntryRutaNumero || '').trim(),
    pedidoEntrySolicitante: String(input.pedidoEntrySolicitante || '').trim(),
    entryEquipoId: String(input.entryEquipoId || '').trim(),
    entryNombreEdificio: String(input.entryNombreEdificio || '').trim(),
    entryTorreAscensor: String(input.entryTorreAscensor || '').trim(),
    entryRutaNumero: String(input.entryRutaNumero || '').trim(),
    entrySolicitante: String(input.entrySolicitante || '').trim(),
    pedidoIncluirRuta: Boolean(input.pedidoIncluirRuta),
  };

  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
}

export function clearFormsIntegrationConfig() {
  if (typeof window === 'undefined') {
    return;
  }

  window.localStorage.removeItem(STORAGE_KEY);
}
