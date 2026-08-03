import { getFormsIntegrationConfig } from '@/lib/forms-integration-config';

export type SolicitudFormType = 'COTIZACION' | 'PEDIDO';

export type SolicitudFormContext = {
  equipoId: string;
  nombreEdificio: string;
  torreAscensor: string;
  rutaNumero: string;
  solicitante: string;
};

function parseBaseUrl(url: string) {
  if (!url) {
    return null;
  }

  try {
    return new URL(url);
  } catch {
    return null;
  }
}

function normalizeEntryKey(entryKey: string) {
  const raw = String(entryKey || '').trim();
  if (!raw) {
    return '';
  }

  const matched = raw.match(/entry\.\d+/i);
  if (matched?.[0]) {
    return matched[0].toLowerCase();
  }

  const numeric = raw.match(/^\d+$/);
  if (numeric) {
    return `entry.${raw}`;
  }

  return raw.replace(/=$/, '');
}

function appendIfPresent(search: URLSearchParams, entryKey: string, value: string) {
  const key = normalizeEntryKey(entryKey);
  if (!key) {
    return;
  }

  const normalized = String(value || '').trim();
  search.set(key, normalized);
}

function entryKeyFor(
  type: SolicitudFormType,
  specificCotizacion: string,
  specificPedido: string,
  fallback: string,
) {
  if (type === 'COTIZACION') {
    return specificCotizacion || fallback;
  }

  return specificPedido || fallback;
}

export function buildGoogleSolicitudUrl(type: SolicitudFormType, context: SolicitudFormContext) {
  const config = getFormsIntegrationConfig();

  const baseUrl = type === 'COTIZACION'
    ? config.cotizacionUrl
    : config.pedidoUrl;

  const parsed = parseBaseUrl(baseUrl);
  if (!parsed) {
    throw new Error(`No se configuró la URL del formulario de ${type.toLowerCase()}.`);
  }

  const search = parsed.searchParams;

  // Google Forms prefilled links are more reliable with usp=pp_url.
  search.set('usp', 'pp_url');

  appendIfPresent(
    search,
    entryKeyFor(type, config.cotizacionEntryEquipoId, config.pedidoEntryEquipoId, config.entryEquipoId),
    context.equipoId,
  );
  appendIfPresent(
    search,
    entryKeyFor(type, config.cotizacionEntryNombreEdificio, config.pedidoEntryNombreEdificio, config.entryNombreEdificio),
    context.nombreEdificio,
  );
  appendIfPresent(
    search,
    entryKeyFor(type, config.cotizacionEntryTorreAscensor, config.pedidoEntryTorreAscensor, config.entryTorreAscensor),
    context.torreAscensor,
  );
  appendIfPresent(
    search,
    entryKeyFor(type, config.cotizacionEntryRutaNumero, config.pedidoEntryRutaNumero, config.entryRutaNumero),
    context.rutaNumero,
  );
  appendIfPresent(
    search,
    entryKeyFor(type, config.cotizacionEntrySolicitante, config.pedidoEntrySolicitante, config.entrySolicitante),
    context.solicitante,
  );

  if (type === 'PEDIDO') {
    if (config.pedidoIncluirRuta) {
      appendIfPresent(
        search,
        entryKeyFor(type, config.cotizacionEntryRutaNumero, config.pedidoEntryRutaNumero, config.entryRutaNumero),
        context.rutaNumero,
      );
    }
  }

  return parsed.toString();
}
