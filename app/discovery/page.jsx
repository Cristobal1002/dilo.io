'use client';

import {
  useState,
  useEffect,
  useRef,
  useCallback,
  useMemo,
  useSyncExternalStore,
  createContext,
  useContext,
} from 'react';
import {
  SunIcon,
  MoonIcon,
  ChevronLeftIcon,
  PencilSquareIcon,
  PhotoIcon,
  DocumentIcon,
} from '@heroicons/react/24/outline';

// ─── Brand (alineado con globals: --mordecai-purple / --mordecai-green) ───────
const P = '#9C77F5';
const P_DARK = '#7B5BD4';
const P_LIGHT = '#F3EEFF';
const P_XLIGHT = '#FAF7FF';
const MINT = '#00d4b0';

const THEME_STORAGE_KEY = 'theme';
const THEME_EVENT = 'mordecai-theme-change';
const DISCOVERY_SESSION_KEY = 'dilo-discovery-client-session-id';
const DISCOVERY_API = '/api/v1/public/discovery';

async function putDiscoverySession(clientSessionId, body) {
  const headers = { 'Content-Type': 'application/json' };
  if (typeof process !== 'undefined' && process.env.NEXT_PUBLIC_DISCOVERY_INGEST_SECRET) {
    headers['x-mordecai-discovery-secret'] = process.env.NEXT_PUBLIC_DISCOVERY_INGEST_SECRET;
  }
  const res = await fetch(`${DISCOVERY_API}/sessions/${clientSessionId}`, {
    method: 'PUT',
    headers,
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(text || `Discovery save failed (${res.status})`);
  }
}

const getThemeSnapshot = () => {
  if (typeof window === 'undefined') return 'light';
  const stored = localStorage.getItem(THEME_STORAGE_KEY);
  if (stored === 'dark' || stored === 'light') return stored;
  return 'light';
};

const subscribeToTheme = (callback) => {
  if (typeof window === 'undefined') return () => {};
  const media = window.matchMedia('(prefers-color-scheme: dark)');
  const handler = () => callback();
  media.addEventListener('change', handler);
  window.addEventListener('storage', handler);
  window.addEventListener(THEME_EVENT, handler);
  return () => {
    media.removeEventListener('change', handler);
    window.removeEventListener('storage', handler);
    window.removeEventListener(THEME_EVENT, handler);
  };
};

/** Tokens alineados con DashboardShell (light) y (auth)/layout + login (dark). */
function discoveryTokens(isDark) {
  if (!isDark) {
    return {
      ink: '#1A1A1A',
      inkMuted: '#5B5670',
      pageBg: `linear-gradient(165deg, ${P_XLIGHT} 0%, #FDFBFF 42%, #F4FBF8 100%)`,
      progressBg: 'linear-gradient(180deg, rgba(250,247,255,0.92) 0%, rgba(250,247,255,0.65) 100%)',
      progressBorder: '1px solid rgba(156,119,245,0.12)',
      progressTrack: 'rgba(156,119,245,0.15)',
      bubbleBotBg: 'rgba(255,255,255,0.95)',
      bubbleBotBorder: '1px solid rgba(156,119,245,0.14)',
      bubbleBotShadow: '0 10px 40px rgba(15,11,26,0.07)',
      typingBg: 'rgba(255,255,255,0.92)',
      typingBorder: '1px solid rgba(156,119,245,0.12)',
      inputShellBg: 'rgba(255,255,255,0.88)',
      inputShellBorder: '1px solid rgba(156,119,245,0.14)',
      inputShellShadow: '0 -12px 40px rgba(15,11,26,0.06)',
      pillInactiveBg: 'rgba(255,255,255,0.85)',
      pillInactiveColor: '#1A1A1A',
      pillInactiveBorder: '1px solid rgba(156,119,245,0.22)',
      inputBg: 'rgba(255,255,255,0.95)',
      inputBorder: '1px solid rgba(156,119,245,0.22)',
      inputColor: '#1A1A1A',
      inputShadow: '0 2px 8px rgba(15,11,26,0.04)',
      hintColor: '#9CA3AF',
      tagBg: 'rgba(255,255,255,0.7)',
      tagColor: P_DARK,
      tagBorder: '1px solid rgba(156,119,245,0.2)',
      doneCardBg: 'rgba(255,255,255,0.92)',
      doneCardBorder: '1px solid rgba(156,119,245,0.15)',
      doneInnerBg: `linear-gradient(180deg, ${P_XLIGHT} 0%, rgba(255,255,255,0.6) 100%)`,
      doneRowBorder: '#EDE9F7',
      doneLabelMuted: '#6B7280',
      doneValue: '#1A1A1A',
      submitDisabledBg: '#E8E4EF',
      submitDisabledColor: '#9CA3AF',
      feedbackSelectedBg: P_LIGHT,
      feedbackBorder: 'rgba(156,119,245,0.2)',
      labelUpper: P_DARK,
      showOrbs: false,
    };
  }
  return {
    ink: '#F8F9FB',
    inkMuted: '#9CA3AF',
    pageBg: '#0F1117',
    progressBg: 'linear-gradient(180deg, rgba(26,29,41,0.96) 0%, rgba(26,29,41,0.78) 100%)',
    progressBorder: '1px solid #2A2F3F',
    progressTrack: 'rgba(156,119,245,0.2)',
    bubbleBotBg: '#1A1D29',
    bubbleBotBorder: '1px solid #2A2F3F',
    bubbleBotShadow: '0 12px 40px rgba(0,0,0,0.35)',
    typingBg: '#1A1D29',
    typingBorder: '1px solid #2A2F3F',
    inputShellBg: 'rgba(26,29,41,0.94)',
    inputShellBorder: '1px solid #2A2F3F',
    inputShellShadow: '0 -16px 48px rgba(0,0,0,0.4)',
    pillInactiveBg: '#252936',
    pillInactiveColor: '#F8F9FB',
    pillInactiveBorder: '1px solid #2A2F3F',
    inputBg: '#252936',
    inputBorder: '1px solid #2A2F3F',
    inputColor: '#F8F9FB',
    inputShadow: '0 2px 8px rgba(0,0,0,0.25)',
    hintColor: '#6B7280',
    tagBg: '#252936',
    tagColor: '#9CA3AF',
    tagBorder: '1px solid #2A2F3F',
    doneCardBg: '#1A1D29',
    doneCardBorder: '1px solid #2A2F3F',
    doneInnerBg: 'linear-gradient(180deg, rgba(156,119,245,0.12) 0%, rgba(26,29,41,0.9) 100%)',
    doneRowBorder: '#2A2F3F',
    doneLabelMuted: '#9CA3AF',
    doneValue: '#F8F9FB',
    submitDisabledBg: '#252936',
    submitDisabledColor: '#6B7280',
    feedbackSelectedBg: 'rgba(156,119,245,0.22)',
    feedbackBorder: '#2A2F3F',
    labelUpper: '#9C77F5',
    showOrbs: true,
  };
}

const DiscoveryUiContext = createContext(null);

function useDiscoveryUi() {
  const v = useContext(DiscoveryUiContext);
  if (!v) throw new Error('useDiscoveryUi dentro de DiscoveryPage');
  return v;
}

// ─── Steps ────────────────────────────────────────────────────────────────────
const STEPS = [
  // Contact
  { key: 'name',  text: '¡Hola! 👋 Soy el asistente de **Dilo**.\n\nVoy a ayudarte a contar tu proyecto — sin formularios aburridos, una pregunta a la vez.\n\n¿Cuál es tu nombre completo?', type: 'text', placeholder: 'Tu nombre completo' },
  { key: 'email', text: '¡Mucho gusto, {name}! ✨\n\n¿Cuál es tu correo electrónico?', type: 'email', placeholder: 'tu@correo.com' },
  { key: 'phone', text: '¿Y un número de WhatsApp o teléfono donde podamos contactarte?', type: 'tel', placeholder: '+57 300 000 0000' },

  // Sección 1 — Negocio
  { key: 'business_name', section: 'Tu negocio', text: '¡Perfecto! Ahora cuéntame sobre tu proyecto. ¿Cuál es el nombre de tu marca o negocio?', type: 'text', placeholder: 'Nombre de tu negocio' },
  { key: 'business_desc', section: 'Tu negocio', text: '¿A qué se dedica **{business_name}**? Cuéntamelo con tus palabras, sin sonar formal.', type: 'textarea', placeholder: 'Ej: Tengo una tienda de ropa deportiva...', hint: 'Cuéntamelo como le contarías a un amigo' },
  { key: 'business_stage', section: 'Tu negocio', text: '¿En qué etapa está tu negocio hoy?', type: 'single', options: ['🌱 Apenas estoy empezando', '👥 Tengo clientes pero sin presencia digital', '📈 Tengo presencia digital pero quiero mejorarla', '🔄 Tengo web y quiero rediseñarla'] },
  { key: 'website', section: 'Tu negocio', text: '¿Tienes sitio web actualmente? Si sí, ¿cuál es la URL?', type: 'text', placeholder: 'https://... o escribe "No tengo"' },
  { key: 'social', section: 'Tu negocio', text: '¿En qué redes sociales tienes presencia hoy?', type: 'multi', options: ['Instagram', 'Facebook', 'YouTube', 'TikTok', 'LinkedIn', 'Twitter / X', 'WhatsApp Business', 'Mercado Libre / Amazon', 'No tengo presencia digital'] },

  // Sección 2 — Tipo de página
  { key: 'page_type', section: 'Tipo de página', text: '¿Qué tipo de página web necesitas?', type: 'single', options: ['🛍️ Tienda online / E-commerce', '💻 Productos digitales', '🎯 Landing page / captura de leads', '💼 Servicios / portafolio', '✍️ Blog o revista digital', '🏢 Página corporativa / institucional', '🔐 Membresía o comunidad', '📅 Reservas o citas', '⚙️ Aplicación web / SaaS', '🤔 No estoy seguro/a'] },
  { key: 'page_goal', section: 'Tipo de página', text: '¿Cuál es el objetivo PRINCIPAL de tu página? (Elige hasta 2)', type: 'multi', maxSelect: 2, options: ['Vender productos o servicios', 'Captar leads / prospectos', 'Mostrar portafolio o trabajo', 'Informar sobre mi negocio', 'Construir comunidad', 'Automatizar procesos', 'Posicionarme como experto/a', 'Dar soporte a clientes'] },
  { key: 'ideal_client', section: 'Tipo de página', text: '¿Quién es tu cliente ideal? Descríbelo brevemente.', type: 'textarea', placeholder: 'Edad, intereses, dónde vive, qué problema resuelves...' },

  // Sección 3 — Productos
  { key: 'offerings', section: 'Productos y servicios', text: '¿Qué vas a ofrecer en tu página?', type: 'multi', options: ['Productos físicos', 'Productos digitales', 'Cursos online', 'Servicios profesionales', 'Servicios presenciales', 'Membresía / suscripción', 'Eventos o entradas', 'Reservas de citas', 'Solo informativa por ahora'] },
  { key: 'product_count', section: 'Productos y servicios', text: '¿Cuántos productos o servicios tienes para mostrar?', type: 'single', options: ['Solo 1 (producto / servicio estrella)', 'Entre 2 y 10', 'Entre 11 y 50', 'Más de 50', 'Aún no lo tengo definido'] },
  { key: 'price_range', section: 'Productos y servicios', text: '¿Cuál es el rango de precio promedio de lo que ofreces?', type: 'single', options: ['Menos de $50.000 COP', '$50K – $300K COP', '$300K – $1M COP', 'Más de $1.000.000 COP', 'Varía mucho según el cliente', 'Es gratuito / no vendo directamente'] },

  // Sección 4 — Integraciones
  { key: 'tools', section: 'Integraciones', text: '¿Qué herramientas usas actualmente en tu negocio?', type: 'multi', options: ['Google Workspace', 'Zoom / Google Meet', 'Calendly u otra agenda', 'Email marketing (Mailchimp, etc.)', 'CRM (HubSpot, Salesforce)', 'Pasarela de pagos', 'Plataforma de cursos (Hotmart, etc.)', 'Shopify / WooCommerce', 'Notion / Trello / Asana', 'Meta Ads / Google Ads', 'WhatsApp Business API', 'Ninguna por ahora'] },
  { key: 'integrations', section: 'Integraciones', text: '¿Qué integraciones necesitas en tu página?', type: 'multi', options: ['Pasarela de pagos', 'Canal de YouTube', 'Chat de WhatsApp', 'Formulario de contacto', 'Agendamiento / reservas', 'Email marketing', 'Analytics / Pixel', 'Chat en vivo', 'CRM', 'Google Maps', 'Login / área privada', 'Blog', 'Reseñas o testimonios', 'No sé aún, me orientas tú'] },
  { key: 'payments', section: 'Integraciones', text: '¿Necesitas que la página acepte pagos online?', type: 'single', options: ['Sí, tarjeta crédito/débito', 'Sí, PSE o transferencia', 'Sí, Nequi / Daviplata', 'Sí, pagos internacionales', 'No, los pagos los gestiono por fuera', 'No sé aún'] },

  // Sección 5 — Funcionalidades
  { key: 'features', section: 'Funcionalidades', text: '¿Cuáles de estas funcionalidades necesitas?', type: 'multi', options: ['Carrito de compras', 'Login / registro', 'Área privada', 'Buscador', 'Filtros y categorías', 'Galería de fotos', 'Video integrado', 'Cupones / descuentos', 'Programa de afiliados', 'Emails automáticos al comprar', 'Rastreo de pedidos', 'Progreso de cursos', 'Certificados', 'Comentarios / foro', 'Multiidioma', 'Responsive mobile', 'Modo oscuro', 'Carga rápida'] },
  { key: 'language', section: 'Funcionalidades', text: '¿En qué idioma(s) debe estar la página?', type: 'single', options: ['Solo español', 'Solo inglés', 'Bilingüe (español e inglés)', 'Otro idioma o más de dos'] },

  // Sección 6 — Diseño
  { key: 'design_refs', section: 'Diseño', text: '¿Tienes páginas web que te gusten como referencia? Pega las URLs y cuéntame qué te gusta de ellas.', type: 'textarea', placeholder: 'https://... y lo que te gusta de cada una', optional: true },
  { key: 'visual_style', section: 'Diseño', text: '¿Cómo describirías el estilo visual que quieres?', type: 'single', options: ['✨ Moderno y minimalista', '🌸 Cálido y cercano', '💼 Profesional y corporativo', '🎨 Dinámico y colorido', '💎 Elegante y premium', '🖼️ Creativo y artístico', '🤝 Confío en tu criterio'] },
  { key: 'brand_identity', section: 'Diseño', text: '¿Ya tienes identidad visual definida?', type: 'single', options: ['✅ Sí, tengo logo, colores y tipografías', '🎨 Tengo logo pero sin sistema de colores', '❌ No tengo nada, necesito ayuda con diseño', '🔄 Quiero renovar mi imagen actual'] },

  // Sección 7 — Gestión
  { key: 'management', section: 'Gestión', text: '¿Quién va a gestionar la página una vez esté lista?', type: 'single', options: ['Yo mismo/a (necesito que sea fácil, sin código)', 'Un asistente o equipo', 'Quiero contratar mantenimiento mensual', 'No lo he pensado aún'] },
  { key: 'update_freq', section: 'Gestión', text: '¿Qué tan seguido planeas actualizar el contenido?', type: 'single', options: ['Diariamente', 'Semanalmente', 'Mensualmente', 'Muy poco, es casi estática', 'No lo sé aún'] },
  { key: 'support', section: 'Gestión', text: '¿Qué soporte necesitas después de la entrega?', type: 'multi', options: ['Capacitación para manejarlo yo', 'Soporte por WhatsApp o email', 'Mantenimiento técnico mensual', 'Actualización de contenidos', 'Hosting y dominio gestionado', 'Solo la entrega, yo me encargo'] },

  // Sección 8 — Presupuesto
  { key: 'budget', section: 'Presupuesto y tiempos', text: '¿Cuál es tu presupuesto estimado para el desarrollo?', type: 'single', options: ['< $1.000.000 COP', '$1M – $3M COP', '$3M – $8M COP', '$8M – $20M COP', '> $20.000.000 COP', 'Quiero una cotización primero'] },
  { key: 'timeline', section: 'Presupuesto y tiempos', text: '¿Para cuándo necesitas tener la página lista?', type: 'single', options: ['En 2 semanas (urgente)', 'En aproximadamente 1 mes', 'En 2 a 3 meses', 'Sin fecha fija, quiero hacerlo bien'] },
  { key: 'domain', section: 'Presupuesto y tiempos', text: '¿Tienes dominio propio comprado?', type: 'single', options: ['✅ Sí, ya tengo dominio', '🔍 No tengo, quiero comprar uno', '❓ No sé qué es eso, necesito orientación'] },
  { key: 'extra', section: 'Cierre', text: '¡Ya casi terminamos! ¿Algo más que quieras contarme? Tu visión, tus miedos, lo que ha fallado antes...', type: 'textarea', placeholder: 'Cualquier detalle que creas importante...', optional: true },

  // Archivos (al final, antes del feedback)
  {
    key: 'assets_logo',
    section: 'Referencias visuales',
    fileGroupLabel: 'Logo',
    text: '**Casi listo.** Si quieres, sube el **logo** de tu marca (PNG, JPG, SVG o WebP). Nos ayuda a alinear el diseño.\n\nSi aún no lo tienes, puedes omitir este paso.',
    type: 'files',
    accept: 'image/png,image/jpeg,image/jpg,image/svg+xml,image/webp',
    maxFiles: 1,
    maxBytesPerFile: 2 * 1024 * 1024,
    optional: true,
    hint: '1 imagen · máx. 2 MB (las imágenes se comprimen al subir)',
  },
  {
    key: 'assets_brand',
    section: 'Referencias visuales',
    fileGroupLabel: 'Marca y guías',
    text: '¿Tienes **guía de marca**, paleta de colores, tipografías o un PDF de identidad? Súbelo aquí (imágenes o PDF).',
    type: 'files',
    accept: 'image/png,image/jpeg,image/jpg,image/webp,image/gif,application/pdf',
    maxFiles: 5,
    maxBytesPerFile: 5 * 1024 * 1024,
    optional: true,
    hint: 'Hasta 5 archivos · máx. 5 MB c/u',
  },
  {
    key: 'assets_screenshots',
    section: 'Referencias visuales',
    fileGroupLabel: 'Capturas de referencia',
    text: 'Si mencionaste **sitios o pantallas** que te gustan, puedes subir **capturas** de lo que te inspira (opcional).',
    type: 'files',
    accept: 'image/png,image/jpeg,image/jpg,image/webp',
    maxFiles: 6,
    maxBytesPerFile: 3 * 1024 * 1024,
    optional: true,
    hint: 'Hasta 6 imágenes · máx. 3 MB c/u',
  },
  {
    key: 'assets_review',
    section: 'Referencias visuales',
    text: 'Aquí tienes un **resumen** de lo que adjuntaste. Revísalo y, si todo está bien, seguimos a la última pregunta.',
    type: 'upload_summary',
  },

  // Feedback
  { key: 'feedback', text: '¡Eso es todo! 🎉\n\nUna última cosa: ¿cómo fue tu experiencia llenando este formulario conversacional?', type: 'feedback' },
];

const ASSET_FILE_STEP_KEYS = ['assets_logo', 'assets_brand', 'assets_screenshots'];

// ─── Helpers ──────────────────────────────────────────────────────────────────
function interpolate(text, lead) {
  return text.replace(/\{(\w+)\}/g, (_, k) => lead[k] || k);
}

function isFilePayload(v) {
  return Boolean(v && typeof v === 'object' && typeof v.skipped === 'boolean' && Array.isArray(v.items));
}

/** Evita payloads enormes en el servidor (los data URL siguen en memoria en esta pestaña). */
function discoveryAnswersForPersistence(answers) {
  const o = { ...answers };
  for (const key of ASSET_FILE_STEP_KEYS) {
    const v = o[key];
    if (isFilePayload(v) && Array.isArray(v.items)) {
      o[key] = {
        ...v,
        items: v.items.map(({ name, mime, size }) => ({ name, mime, size })),
      };
    }
  }
  return o;
}

function formatFileAnswerForBubble(val) {
  if (!isFilePayload(val)) return typeof val === 'string' ? val : JSON.stringify(val);
  if (val.skipped) return '(Omitido)';
  const n = val.items.length;
  if (!n) return '(Sin archivos)';
  const names = val.items.map((i) => i.name).slice(0, 4).join(', ');
  return n === 1 ? `📎 1 archivo: ${names}` : `📎 ${n} archivos: ${names}${n > 4 ? '…' : ''}`;
}

function formatSummaryReviewAnswer(val) {
  if (val && typeof val === 'object' && val.confirmed) return 'Listo, revisado ✓';
  return val != null && val !== '' ? String(val) : '';
}

function readFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const fr = new FileReader();
    fr.onload = () => resolve(fr.result);
    fr.onerror = () => reject(new Error('No se pudo leer el archivo'));
    fr.readAsDataURL(file);
  });
}

async function rasterToCompressedDataUrl(file, maxDim, quality) {
  const bitmap = await createImageBitmap(file);
  try {
    let w = bitmap.width;
    let h = bitmap.height;
    const scale = Math.min(1, maxDim / Math.max(w, h));
    w = Math.round(w * scale);
    h = Math.round(h * scale);
    const c = document.createElement('canvas');
    c.width = w;
    c.height = h;
    const ctx = c.getContext('2d');
    if (!ctx) throw new Error('Canvas no disponible');
    ctx.drawImage(bitmap, 0, 0, w, h);
    return c.toDataURL('image/jpeg', quality);
  } finally {
    bitmap.close();
  }
}

async function buildFileItemsFromFiles(files, step) {
  const maxB = step.maxBytesPerFile || 2 * 1024 * 1024;
  const accept = (step.accept || '').split(',').map((s) => s.trim()).filter(Boolean);

  const mimeMatches = (file) => {
    if (!accept.length) return true;
    const type = file.type || '';
    const lower = file.name.toLowerCase();
    return accept.some((pat) => {
      if (pat.startsWith('.')) return lower.endsWith(pat.toLowerCase());
      if (pat.endsWith('/*')) return type.startsWith(pat.slice(0, -1));
      return type === pat;
    });
  };

  const out = [];
  for (const file of files) {
    if (file.size > maxB) {
      throw new Error(`${file.name} supera el máximo de ${Math.round(maxB / (1024 * 1024))} MB`);
    }
    if (!mimeMatches(file)) {
      throw new Error(`${file.name}: formato no permitido en este paso`);
    }
    let dataUrl;
    const isRaster = file.type.startsWith('image/') && file.type !== 'image/svg+xml';
    if (isRaster) {
      dataUrl = await rasterToCompressedDataUrl(file, 1600, 0.82);
    } else {
      dataUrl = await readFileAsDataUrl(file);
    }
    const approxBytes = Math.round((dataUrl.length * 3) / 4);
    if (approxBytes > maxB * 1.35) {
      throw new Error(`${file.name} sigue siendo demasiado grande; prueba otro archivo o menor resolución`);
    }
    out.push({
      name: file.name,
      mime: isRaster ? 'image/jpeg' : file.type || 'application/octet-stream',
      size: file.size,
      dataUrl,
    });
  }
  return out;
}

function parseBold(text) {
  return text.split('**').map((part, i) =>
    i % 2 === 1 ? <strong key={i}>{part}</strong> : part
  );
}

/** Reconstruye el hilo del chat hasta la pregunta actual (índice stepIndex). */
function rebuildMessagesForStep(stepIndex, lead) {
  const uid = () => `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
  const out = [];
  for (let i = 0; i < stepIndex; i++) {
    const s = STEPS[i];
    out.push({ id: uid(), role: 'assistant', content: interpolate(s.text, lead) });
    const ans = lead[s.key];
    if (ans == null) continue;
    let userLine = '';
    if (s.type === 'files') userLine = formatFileAnswerForBubble(ans);
    else if (s.type === 'upload_summary') userLine = formatSummaryReviewAnswer(ans);
    else if (String(ans).length > 0) userLine = String(ans);
    if (userLine) {
      out.push({ id: uid(), role: 'user', content: userLine, stepKey: s.key });
    }
  }
  const cur = STEPS[stepIndex];
  if (cur) {
    out.push({ id: uid(), role: 'assistant', content: interpolate(cur.text, lead) });
  }
  return out;
}

function DiscoveryThemeToggleButton({ className = '' }) {
  const { isDark, toggleTheme } = useDiscoveryUi();
  return (
    <button
      type="button"
      onClick={toggleTheme}
      className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-[#E5E7EB] bg-white/90 text-[#6B7280] shadow-sm backdrop-blur-sm transition-colors hover:bg-[#F8F9FB] dark:border-[#2A2F3F] dark:bg-[#1A1D29]/95 dark:text-[#9CA3AF] dark:hover:bg-[#252936] ${className}`}
      aria-label={isDark ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
    >
      {isDark ? <SunIcon className="h-5 w-5" /> : <MoonIcon className="h-5 w-5" />}
    </button>
  );
}

/** Progreso: atrás + logo + % + tema (toggle a la derecha del %). */
function DiscoveryProgress({ stepIdx, totalSteps, showBack, onBack }) {
  const { t, isDark } = useDiscoveryUi();
  const idx = Math.max(0, stepIdx);
  const n = Math.min(idx + 1, totalSteps);
  const pct = Math.round((n / totalSteps) * 100);
  return (
    <div
      style={{
        flexShrink: 0,
        padding: '6px 14px 10px',
        paddingTop: 'max(6px, env(safe-area-inset-top))',
        background: t.progressBg,
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        borderBottom: t.progressBorder,
      }}
    >
      <div style={{ maxWidth: 680, margin: '0 auto' }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            marginBottom: 8,
            minHeight: 52,
          }}
        >
          {showBack ? (
            <button
              type="button"
              onClick={onBack}
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border text-sm font-semibold transition-colors dark:border-[#2A2F3F] dark:bg-[#252936] dark:text-[#F8F9FB] dark:hover:bg-[#2A2F3F]"
              style={{
                borderColor: 'rgba(156,119,245,0.25)',
                background: 'rgba(255,255,255,0.75)',
                color: P_DARK,
              }}
              aria-label="Volver a la pregunta anterior"
            >
              <ChevronLeftIcon className="h-5 w-5" />
            </button>
          ) : (
            <span className="w-10 shrink-0" aria-hidden />
          )}
          <div className="flex min-w-0 flex-1 items-center">
            <div className="relative flex h-[52px] w-full max-w-[min(72vw,260px)] items-center sm:h-14 md:h-16">
              <span
                style={{
                  fontSize: 26,
                  fontWeight: 800,
                  letterSpacing: '-0.02em',
                  background: `linear-gradient(110deg, ${P} 0%, ${MINT} 100%)`,
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  backgroundClip: 'text',
                }}
              >
                Dilo
              </span>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 2 }}>
              <span
                style={{
                  fontSize: 22,
                  fontWeight: 800,
                  fontVariantNumeric: 'tabular-nums',
                  background: `linear-gradient(110deg, ${P} 0%, ${MINT} 100%)`,
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  backgroundClip: 'text',
                }}
              >
                {pct}
              </span>
              <span style={{ fontSize: 13, fontWeight: 600, color: t.inkMuted }}>%</span>
            </div>
            <DiscoveryThemeToggleButton />
          </div>
        </div>
        <div
          style={{
            height: 6,
            borderRadius: 999,
            background: t.progressTrack,
            overflow: 'hidden',
            boxShadow: isDark ? 'inset 0 1px 2px rgba(0,0,0,0.35)' : 'inset 0 1px 2px rgba(15,11,26,0.06)',
          }}
        >
          <div
            style={{
              height: '100%',
              width: `${pct}%`,
              borderRadius: 999,
              background: `linear-gradient(90deg, ${P} 0%, ${MINT} 100%)`,
              transition: 'width 0.55s cubic-bezier(0.22, 1, 0.36, 1)',
              boxShadow: `0 0 20px ${P}66`,
            }}
          />
        </div>
        <div
          style={{
            marginTop: 8,
            fontSize: 11,
            fontWeight: 600,
            color: t.inkMuted,
            textAlign: 'center',
            fontVariantNumeric: 'tabular-nums',
            letterSpacing: '0.02em',
          }}
        >
          {n} de {totalSteps} · seguimos cuando quieras
        </div>
      </div>
    </div>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────
function Avatar() {
  return (
    <div
      style={{
        width: 36,
        height: 36,
        borderRadius: 12,
        background: `linear-gradient(145deg, ${P} 0%, ${P_DARK} 100%)`,
        color: '#fff',
        fontWeight: 800,
        fontSize: 14,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
        marginRight: 12,
        marginTop: 2,
        boxShadow: `0 4px 14px ${P}55`,
        border: `2px solid rgba(0,212,176,0.35)`,
      }}
      >
      D
    </div>
  );
}

function TypingIndicator() {
  const { t, isDark } = useDiscoveryUi();
  return (
    <div style={{ display: 'flex', marginBottom: 16, alignItems: 'flex-start' }}>
      <Avatar />
      <div
        style={{
          background: t.typingBg,
          backdropFilter: 'blur(8px)',
          borderRadius: '6px 20px 20px 20px',
          border: t.typingBorder,
          boxShadow: isDark ? '0 8px 32px rgba(0,0,0,0.35)' : '0 8px 32px rgba(15,11,26,0.06)',
          padding: '12px 18px',
          display: 'flex',
          gap: 5,
          alignItems: 'center',
        }}
      >
        {[0, 1, 2].map(i => (
          <span key={i} style={{ width: 7, height: 7, borderRadius: '50%', background: P, display: 'inline-block', animation: `mdBounce 1.4s ${i * 0.2}s infinite ease-in-out` }} />
        ))}
      </div>
    </div>
  );
}

function Bubble({ msg, onEditAnswer, allowEdit }) {
  const { t } = useDiscoveryUi();
  const isBot = msg.role === 'assistant';
  if (isBot) return (
    <div style={{ display: 'flex', marginBottom: 16, alignItems: 'flex-start' }}>
      <Avatar />
      <div
        style={{
          background: t.bubbleBotBg,
          backdropFilter: 'blur(10px)',
          borderRadius: '6px 20px 20px 20px',
          border: t.bubbleBotBorder,
          boxShadow: t.bubbleBotShadow,
          padding: '14px 18px',
          maxWidth: '78%',
          fontSize: 15,
          lineHeight: 1.65,
          color: t.ink,
          whiteSpace: 'pre-line',
        }}
      >
        {parseBold(msg.content)}
      </div>
    </div>
  );
  const showEdit = Boolean(allowEdit && msg.stepKey && typeof onEditAnswer === 'function');
  return (
    <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 16 }}>
      <div style={{ maxWidth: '78%', display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6 }}>
        <div
          style={{
            position: 'relative',
            background: `linear-gradient(135deg, ${P} 0%, ${P_DARK} 100%)`,
            color: '#fff',
            borderRadius: '20px 6px 20px 20px',
            padding: showEdit ? '14px 40px 14px 18px' : '14px 18px',
            fontSize: 15,
            lineHeight: 1.65,
            boxShadow: `0 8px 28px ${P}44`,
          }}
        >
          {showEdit ? (
            <button
              type="button"
              onClick={() => onEditAnswer(msg.stepKey)}
              className="absolute right-2 top-2 rounded-md p-1 text-white/85 transition hover:bg-white/15 hover:text-white"
              aria-label="Editar esta respuesta"
              title="Editar respuesta"
            >
              <PencilSquareIcon className="h-4 w-4" />
            </button>
          ) : null}
          <span style={{ whiteSpace: 'pre-line' }}>{msg.content}</span>
        </div>
      </div>
    </div>
  );
}

function WelcomeScreen({ onStart, draftAvailable, onResume, onDiscardDraft }) {
  const { t, isDark } = useDiscoveryUi();
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '70vh', textAlign: 'center', padding: '28px 20px' }}>
      <div className="relative mb-6 flex h-30 w-[min(100%,300px)] items-center justify-center sm:h-32 md:h-36">
        <span
          style={{
            fontSize: 42,
            fontWeight: 800,
            letterSpacing: '-0.03em',
            background: `linear-gradient(105deg, ${P} 0%, ${MINT} 100%)`,
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
          }}
        >
          Dilo
        </span>
      </div>
      <p
        style={{
          fontSize: 11,
          fontWeight: 700,
          letterSpacing: '0.2em',
          textTransform: 'uppercase',
          color: t.labelUpper,
          margin: '0 0 12px',
          opacity: isDark ? 1 : 0.9,
        }}
      >
        Discovery
      </p>
      <h1 style={{ fontSize: 32, fontWeight: 800, color: t.ink, margin: '0 0 16px', lineHeight: 1.15, maxWidth: 420 }}>
        Cuéntame sobre tu{' '}
        <span style={{ background: `linear-gradient(105deg, ${P} 0%, ${MINT} 100%)`, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>
          proyecto web
        </span>
      </h1>
      <p style={{ fontSize: 16, color: t.inkMuted, maxWidth: 420, lineHeight: 1.65, margin: '0 0 28px' }}>
        Sin formularios largos: una conversación guiada para entender qué necesitas.
      </p>
      <div style={{ display: 'flex', gap: 8, marginBottom: 36, flexWrap: 'wrap', justifyContent: 'center' }}>
        {[`⏱️ 12–18 min`, `💬 ~${STEPS.length} pasos`, '🎯 Claro y humano'].map((tag) => (
          <span
            key={tag}
            style={{
              background: t.tagBg,
              backdropFilter: 'blur(8px)',
              color: t.tagColor,
              padding: '8px 14px',
              borderRadius: 999,
              fontSize: 12,
              fontWeight: 600,
              border: t.tagBorder,
            }}
          >
            {tag}
          </span>
        ))}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
        <button
          type="button"
          onClick={onStart}
          style={{
            background: `linear-gradient(135deg, ${P} 0%, ${P_DARK} 100%)`,
            color: '#fff',
            border: 'none',
            borderRadius: 999,
            padding: '16px 40px',
            fontSize: 15,
            fontWeight: 700,
            cursor: 'pointer',
            boxShadow: `0 8px 28px ${P}55`,
            transition: 'transform 0.18s ease, box-shadow 0.18s ease',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'translateY(-2px)';
            e.currentTarget.style.boxShadow = `0 12px 36px ${P}66`;
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'translateY(0)';
            e.currentTarget.style.boxShadow = `0 8px 28px ${P}55`;
          }}
        >
          {draftAvailable ? 'Empezar de nuevo' : 'Empezar ahora'}
        </button>
        {draftAvailable ? (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, justifyContent: 'center' }}>
            <button
              type="button"
              onClick={onResume}
              style={{
                background: 'transparent',
                color: P,
                border: `2px solid ${P}`,
                borderRadius: 999,
                padding: '12px 28px',
                fontSize: 14,
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              Continuar donde lo dejé
            </button>
            <button
              type="button"
              onClick={onDiscardDraft}
              style={{
                background: 'transparent',
                color: t.inkMuted,
                border: `1px solid ${isDark ? '#2A2F3F' : '#E5E7EB'}`,
                borderRadius: 999,
                padding: '12px 20px',
                fontSize: 13,
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              Descartar borrador
            </button>
          </div>
        ) : null}
      </div>
    </div>
  );
}

function DoneScreen({ lead }) {
  const { t, isDark } = useDiscoveryUi();
  const firstName = (lead.name || 'amigo').split(' ')[0];
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '85vh', padding: 24 }}>
      <div className="mb-5 flex h-16 w-full max-w-[220px] items-center justify-center">
        <span
          style={{
            fontSize: 32,
            fontWeight: 800,
            background: `linear-gradient(105deg, ${P} 0%, ${MINT} 100%)`,
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
          }}
        >
          Dilo
        </span>
      </div>
      <div
        style={{
          background: t.doneCardBg,
          backdropFilter: 'blur(16px)',
          borderRadius: 28,
          padding: '40px 32px',
          maxWidth: 500,
          width: '100%',
          textAlign: 'center',
          border: t.doneCardBorder,
          boxShadow: isDark
            ? '0 24px 64px rgba(0,0,0,0.45)'
            : `0 24px 64px rgba(15,11,26,0.08), 0 0 0 1px rgba(255,255,255,0.5) inset`,
        }}
      >
        <div style={{ fontSize: 56, marginBottom: 16, lineHeight: 1 }}>🎉</div>
        <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.18em', textTransform: 'uppercase', color: t.labelUpper, margin: '0 0 8px' }}>Dilo</p>
        <h2 style={{ fontSize: 26, fontWeight: 800, color: t.ink, margin: '0 0 12px' }}>
          ¡Listo, {firstName}!
        </h2>
        <p style={{ color: t.inkMuted, lineHeight: 1.65, margin: '0 0 28px', fontSize: 15 }}>
          Recibí la información sobre <strong style={{ color: t.ink }}>{lead.business_name || 'tu proyecto'}</strong>. Te contactaremos para los siguientes pasos.
        </p>
        <div
          style={{
            background: t.doneInnerBg,
            borderRadius: 18,
            padding: '16px 20px',
            textAlign: 'left',
            marginBottom: 24,
            border: t.doneCardBorder,
          }}
        >
          <div style={{ fontSize: 10, fontWeight: 700, color: P, textTransform: 'uppercase', letterSpacing: '0.14em', marginBottom: 12 }}>Contacto</div>
          {[['Nombre', lead.name], ['Email', lead.email], ['Teléfono', lead.phone]].map(([label, val]) =>
            val ? (
              <div
                key={label}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  padding: '7px 0',
                  borderBottom: `1px solid ${t.doneRowBorder}`,
                  fontSize: 14,
                }}
              >
                <span style={{ color: t.doneLabelMuted }}>{label}</span>
                <span style={{ color: t.doneValue, fontWeight: 600 }}>{val}</span>
              </div>
            ) : null
          )}
        </div>
        <DiscoveryDoneAttachments lead={lead} />
        <div style={{ fontSize: 12, color: t.inkMuted }}>
          <span style={{ opacity: 0.75 }}>Con </span>
          <strong style={{ background: `linear-gradient(90deg, ${P}, ${MINT})`, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>Dilo</strong>
        </div>
      </div>
    </div>
  );
}

/** Miniatura o icono según tipo de archivo guardado en el lead. */
function AttachmentThumb({ item }) {
  const { t, isDark } = useDiscoveryUi();
  const src = item.dataUrl && String(item.dataUrl).startsWith('data:image') ? item.dataUrl : null;
  if (src) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={src}
        alt=""
        style={{ width: '100%', height: 88, objectFit: 'cover', borderRadius: 10, border: t.inputBorder }}
      />
    );
  }
  return (
    <div
      style={{
        height: 88,
        borderRadius: 10,
        border: t.inputBorder,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: isDark ? '#252936' : P_XLIGHT,
        color: t.inkMuted,
      }}
    >
      <DocumentIcon className="h-8 w-8" aria-hidden />
    </div>
  );
}

function DiscoveryDoneAttachments({ lead }) {
  const { t } = useDiscoveryUi();
  const blocks = ASSET_FILE_STEP_KEYS.map((key) => {
    const st = STEPS.find((s) => s.key === key);
    const val = lead[key];
    if (!st || !isFilePayload(val)) return null;
    const label = st.fileGroupLabel || st.section || key;
    if (val.skipped || !val.items.length) {
      return (
        <div key={key} style={{ marginBottom: 14 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: P, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 6 }}>{label}</div>
          <div style={{ fontSize: 13, color: t.doneLabelMuted }}>{val.skipped ? 'Omitido' : 'Sin archivos'}</div>
        </div>
      );
    }
    return (
      <div key={key} style={{ marginBottom: 14 }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: P, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 8 }}>{label}</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(72px, 1fr))', gap: 8 }}>
          {val.items.map((it, i) => (
            <div key={`${it.name}-${i}`}>
              <AttachmentThumb item={it} />
              <div style={{ fontSize: 10, color: t.doneLabelMuted, marginTop: 4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={it.name}>
                {it.name}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }).filter(Boolean);
  if (!blocks.length) return null;
  return (
    <div
      style={{
        background: t.doneInnerBg,
        borderRadius: 18,
        padding: '16px 20px',
        textAlign: 'left',
        marginBottom: 20,
        border: t.doneCardBorder,
      }}
    >
      <div style={{ fontSize: 10, fontWeight: 700, color: P, textTransform: 'uppercase', letterSpacing: '0.14em', marginBottom: 12 }}>Archivos enviados</div>
      {blocks}
    </div>
  );
}

function FileUploadStep({
  step,
  editBanner,
  pendingFiles,
  setPendingFiles,
  onSubmitFiles,
  onSkip,
  submitting,
  error,
}) {
  const { t } = useDiscoveryUi();
  const inputId = `discovery-upload-${step.key}`;
  const maxF = step.maxFiles || 1;

  const onPick = (e) => {
    const list = Array.from(e.target.files || []);
    e.target.value = '';
    setPendingFiles((prev) => {
      const merged = [...prev, ...list];
      return merged.slice(0, maxF);
    });
  };

  return (
    <InputShell topSlot={editBanner} hint={step.hint}>
      <input id={inputId} type="file" accept={step.accept} multiple={maxF > 1} className="sr-only" onChange={onPick} />
      <label
        htmlFor={inputId}
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 10,
          padding: '20px 16px',
          marginBottom: 14,
          borderRadius: 16,
          border: t.inputBorder,
          background: t.inputBg,
          cursor: 'pointer',
          textAlign: 'center',
        }}
      >
        <PhotoIcon className="h-10 w-10" style={{ color: P }} aria-hidden />
        <span style={{ fontSize: 14, fontWeight: 600, color: t.ink }}>Toca para elegir archivos</span>
        <span style={{ fontSize: 12, color: t.hintColor }}>Máximo {maxF} · {step.accept?.replace(/,/g, ', ') || 'archivos'}</span>
      </label>
      {pendingFiles.length > 0 ? (
        <ul style={{ listStyle: 'none', margin: '0 0 14px', padding: 0, display: 'flex', flexDirection: 'column', gap: 8 }}>
          {pendingFiles.map((f, i) => (
            <li
              key={`${f.name}-${i}-${f.size}`}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 10,
                padding: '10px 12px',
                borderRadius: 12,
                border: t.inputBorder,
                background: t.pillInactiveBg,
                fontSize: 13,
                color: t.ink,
              }}
            >
              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={f.name}>
                {f.name}
              </span>
              <button
                type="button"
                onClick={() => setPendingFiles((prev) => prev.filter((_, j) => j !== i))}
                style={{
                  flexShrink: 0,
                  border: 'none',
                  background: 'transparent',
                  color: t.inkMuted,
                  cursor: 'pointer',
                  fontSize: 12,
                  fontWeight: 600,
                }}
              >
                Quitar
              </button>
            </li>
          ))}
        </ul>
      ) : null}
      {error ? (
        <div style={{ marginBottom: 12, fontSize: 13, color: '#B91C1C', lineHeight: 1.45 }} role="alert">
          {error}
        </div>
      ) : null}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, justifyContent: 'flex-end' }}>
        {step.optional ? (
          <button
            type="button"
            disabled={submitting}
            onClick={onSkip}
            style={{
              borderRadius: 999,
              padding: '12px 20px',
              fontSize: 14,
              fontWeight: 600,
              cursor: submitting ? 'not-allowed' : 'pointer',
              border: t.inputBorder,
              background: 'transparent',
              color: t.inkMuted,
            }}
          >
            Omitir →
          </button>
        ) : null}
        <SubmitBtn
          label={submitting ? 'Procesando…' : 'Subir y continuar →'}
          disabled={!pendingFiles.length || submitting}
          onClick={onSubmitFiles}
        />
      </div>
    </InputShell>
  );
}

function UploadSummaryStep({ lead, editBanner, onContinue }) {
  const { t } = useDiscoveryUi();
  return (
    <InputShell topSlot={editBanner}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 18, marginBottom: 18 }}>
        {ASSET_FILE_STEP_KEYS.map((key) => {
          const st = STEPS.find((s) => s.key === key);
          const val = lead[key];
          const label = st?.fileGroupLabel || st?.section || key;
          if (!st || !isFilePayload(val)) {
            return (
              <div key={key} style={{ borderRadius: 14, border: t.inputBorder, padding: 12, background: t.inputBg }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: t.ink, marginBottom: 4 }}>{label}</div>
                <div style={{ fontSize: 12, color: t.hintColor }}>Sin datos</div>
              </div>
            );
          }
          if (val.skipped || !val.items.length) {
            return (
              <div key={key} style={{ borderRadius: 14, border: t.inputBorder, padding: 12, background: t.inputBg }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: t.ink, marginBottom: 4 }}>{label}</div>
                <div style={{ fontSize: 12, color: t.hintColor }}>{val.skipped ? 'Omitido en este paso' : 'Sin archivos'}</div>
              </div>
            );
          }
          return (
            <div key={key} style={{ borderRadius: 14, border: t.inputBorder, padding: 12, background: t.inputBg }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: t.ink, marginBottom: 10 }}>{label}</div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(88px, 1fr))', gap: 10 }}>
                {val.items.map((it, i) => (
                  <div key={`${it.name}-${i}`}>
                    <AttachmentThumb item={it} />
                    <div style={{ fontSize: 10, color: t.hintColor, marginTop: 4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={it.name}>
                      {it.name}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
      <SubmitBtn label="Continuar →" disabled={false} onClick={onContinue} />
    </InputShell>
  );
}

function InputArea({
  step,
  inputValue,
  setInputValue,
  selectedOpts,
  onToggle,
  onSubmit,
  onSingleSelect,
  feedbackRating,
  setFeedbackRating,
  feedbackComment,
  setFeedbackComment,
  editBanner,
}) {
  const { t } = useDiscoveryUi();
  const canText = inputValue.trim() || step.optional;
  const canMulti = selectedOpts.length > 0;

  // Single choice → un clic usa el valor directo (evita stale state con setTimeout + setSelectedOpts).
  if (step.type === 'single') {
    return (
      <InputShell topSlot={editBanner}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          {step.options.map((opt) => (
            <Pill key={opt} label={opt} active={selectedOpts.includes(opt)} onClick={() => onSingleSelect(opt)} />
          ))}
        </div>
      </InputShell>
    );
  }

  // Multi choice → pills + confirm button
  if (step.type === 'multi') return (
    <InputShell topSlot={editBanner}>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 12 }}>
        {step.options.map(opt => (
          <Pill key={opt} label={opt} active={selectedOpts.includes(opt)} onClick={() => onToggle(opt, step.maxSelect)} />
        ))}
      </div>
      <SubmitBtn label={`Continuar →${step.maxSelect ? ` (${selectedOpts.length}/${step.maxSelect})` : ''}`} disabled={!canMulti} onClick={onSubmit} />
    </InputShell>
  );

  // Feedback
  if (step.type === 'feedback') {
    const EMOJIS = [['😞','Muy malo'],['😐','Regular'],['🙂','Bien'],['😊','Muy bien'],['🤩','¡Excelente!']];
    return (
      <InputShell topSlot={editBanner}>
        <div style={{ display: 'flex', gap: 10, justifyContent: 'center', marginBottom: 14 }}>
          {EMOJIS.map(([em, label], i) => (
            <button
              key={i}
              type="button"
              title={label}
              onClick={() => setFeedbackRating(i + 1)}
              style={{
                fontSize: 26,
                background: feedbackRating === i + 1 ? t.feedbackSelectedBg : 'transparent',
                border: `2px solid ${feedbackRating === i + 1 ? P : t.feedbackBorder}`,
                borderRadius: 14,
                padding: '8px 10px',
                cursor: 'pointer',
                transition: 'all 0.15s',
              }}
            >
              {em}
            </button>
          ))}
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <input
            value={feedbackComment}
            onChange={(e) => setFeedbackComment(e.target.value)}
            placeholder="¿Algo que quieras comentar? (opcional)"
            className="placeholder:text-[#6B7280] dark:placeholder:text-[#6B7280]"
            style={inputStyle(t)}
          />
          <SubmitBtn label="Enviar →" disabled={!feedbackRating} onClick={onSubmit} />
        </div>
      </InputShell>
    );
  }

  // Textarea
  if (step.type === 'textarea') return (
    <InputShell hint={step.hint} topSlot={editBanner}>
      <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end' }}>
        <textarea
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          placeholder={step.placeholder || 'Escribe tu respuesta...'}
          rows={3}
          className="placeholder:text-[#6B7280] dark:placeholder:text-[#6B7280]"
          style={{ ...inputStyle(t), resize: 'none', fontFamily: 'inherit' }}
        />
        <SubmitBtn label={step.optional && !inputValue.trim() ? 'Saltar →' : 'Enviar →'} disabled={!canText} onClick={onSubmit} />
      </div>
    </InputShell>
  );

  // Text / email / tel
  return (
    <InputShell hint={step.hint} topSlot={editBanner}>
      <div style={{ display: 'flex', gap: 8 }}>
        <input
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              if (canText) onSubmit();
            }
          }}
          type={step.type}
          placeholder={step.placeholder || 'Escribe tu respuesta...'}
          className="placeholder:text-[#6B7280] dark:placeholder:text-[#6B7280]"
          style={inputStyle(t)}
          autoFocus
        />
        <SubmitBtn label="Enviar →" disabled={!canText} onClick={onSubmit} />
      </div>
    </InputShell>
  );
}

function InputShell({ children, hint, topSlot }) {
  const { t } = useDiscoveryUi();
  return (
    <div
      style={{
        flexShrink: 0,
        background: t.inputShellBg,
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
        borderTop: t.inputShellBorder,
        borderRadius: '24px 24px 0 0',
        padding: '16px 20px max(22px, env(safe-area-inset-bottom))',
        boxShadow: t.inputShellShadow,
      }}
    >
      <div style={{ maxWidth: 680, margin: '0 auto' }}>
        {topSlot}
        {children}
        {hint && <div style={{ marginTop: 6, fontSize: 12, color: t.hintColor }}>{hint}</div>}
      </div>
    </div>
  );
}

function Pill({ label, active, onClick }) {
  const { t, isDark } = useDiscoveryUi();
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        background: active ? `linear-gradient(135deg, ${P} 0%, ${P_DARK} 100%)` : t.pillInactiveBg,
        color: active ? '#fff' : t.pillInactiveColor,
        border: active ? '1px solid transparent' : t.pillInactiveBorder,
        borderRadius: 999,
        padding: '10px 16px',
        fontSize: 13,
        cursor: 'pointer',
        transition: 'all 0.18s ease',
        fontWeight: active ? 600 : 500,
        boxShadow: active ? `0 4px 16px ${P}44` : isDark ? '0 2px 8px rgba(0,0,0,0.25)' : '0 2px 8px rgba(15,11,26,0.04)',
      }}
    >
      {label}
    </button>
  );
}

function SubmitBtn({ label, disabled, onClick }) {
  const { t } = useDiscoveryUi();
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      style={{
        background: disabled ? t.submitDisabledBg : `linear-gradient(135deg, ${P} 0%, ${P_DARK} 100%)`,
        color: disabled ? t.submitDisabledColor : '#fff',
        border: 'none',
        borderRadius: 999,
        padding: '12px 22px',
        fontSize: 14,
        fontWeight: 700,
        cursor: disabled ? 'not-allowed' : 'pointer',
        flexShrink: 0,
        transition: 'all 0.18s ease',
        boxShadow: disabled ? 'none' : `0 4px 18px ${P}44`,
      }}
    >
      {label}
    </button>
  );
}

function inputStyle(t) {
  return {
    flex: 1,
    border: t.inputBorder,
    borderRadius: 14,
    padding: '12px 16px',
    fontSize: 15,
    outline: 'none',
    fontFamily: 'inherit',
    color: t.inputColor,
    background: t.inputBg,
    boxShadow: t.inputShadow,
  };
}

function DiscoveryAuthOrbs() {
  return (
    <div className="pointer-events-none absolute inset-0 z-0 overflow-hidden" aria-hidden>
      <div className="absolute -top-40 -right-40 h-[480px] w-[480px] rounded-full bg-[#9C77F5]/30 blur-[120px]" />
      <div className="absolute top-1/2 -left-32 h-[400px] w-[400px] rounded-full bg-[#9C77F5]/20 blur-[100px]" />
      <div className="absolute -bottom-32 right-1/3 h-[350px] w-[350px] rounded-full bg-[#9C77F5]/15 blur-[80px]" />
    </div>
  );
}

/** Tema fijo solo en bienvenida / final (en el chat va dentro de DiscoveryProgress). */
function DiscoveryThemeFloating() {
  return (
    <div className="fixed right-[max(0.75rem,env(safe-area-inset-right))] top-[max(0.75rem,env(safe-area-inset-top))] z-30">
      <DiscoveryThemeToggleButton />
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────
export default function DiscoveryPage() {
  const [started, setStarted] = useState(false);
  const [messages, setMessages] = useState([]);
  const [stepIdx, setStepIdx] = useState(-1);
  const [inputValue, setInputValue] = useState('');
  const [selectedOpts, setSelectedOpts] = useState([]);
  const [isTyping, setIsTyping] = useState(false);
  const [isDone, setIsDone] = useState(false);
  const [lead, setLead] = useState({});
  const [feedbackRating, setFeedbackRating] = useState(null);
  const [feedbackComment, setFeedbackComment] = useState('');
  const [editingStepKey, setEditingStepKey] = useState(null);
  const [clientSessionId, setClientSessionId] = useState(null);
  const [draftAvailable, setDraftAvailable] = useState(false);
  const [pendingFiles, setPendingFiles] = useState([]);
  const [filesSubmitting, setFilesSubmitting] = useState(false);
  const [filesError, setFilesError] = useState('');
  const scrollRef = useRef(null);
  const leadRef = useRef(lead);
  const pendingFilesRef = useRef([]);
  leadRef.current = lead;
  pendingFilesRef.current = pendingFiles;

  useEffect(() => {
    setPendingFiles([]);
    setFilesError('');
    setFilesSubmitting(false);
  }, [stepIdx]);

  useEffect(() => {
    try {
      const s = sessionStorage.getItem(DISCOVERY_SESSION_KEY);
      if (s) setClientSessionId(s);
    } catch (_) {}
  }, []);

  useEffect(() => {
    if (started) return;
    let cancel = false;
    (async () => {
      try {
        const id = typeof window !== 'undefined' ? sessionStorage.getItem(DISCOVERY_SESSION_KEY) : null;
        if (!id) {
          if (!cancel) setDraftAvailable(false);
          return;
        }
        const r = await fetch(`${DISCOVERY_API}/sessions/${id}`);
        if (!r.ok) {
          if (!cancel) setDraftAvailable(false);
          return;
        }
        const j = await r.json();
        if (!j.success || !j.data || cancel) return;
        if (j.data.completedAt) {
          try {
            sessionStorage.removeItem(DISCOVERY_SESSION_KEY);
          } catch (_) {}
          if (!cancel) {
            setDraftAvailable(false);
            setClientSessionId(null);
          }
          return;
        }
        const ans = j.data.answers || {};
        const idx = Number(j.data.currentStepIndex);
        const hasProgress = Object.keys(ans).length > 0 || (Number.isFinite(idx) && idx >= 0);
        if (!cancel) setDraftAvailable(!!hasProgress);
      } catch {
        if (!cancel) setDraftAvailable(false);
      }
    })();
    return () => {
      cancel = true;
    };
  }, [started]);

  useEffect(() => {
    if (!clientSessionId || !started) return;
    const tmr = setTimeout(() => {
      putDiscoverySession(clientSessionId, {
        answers: discoveryAnswersForPersistence(leadRef.current),
        currentStepIndex: stepIdx,
        completed: isDone,
      }).catch(() => {});
    }, 450);
    return () => clearTimeout(tmr);
  }, [clientSessionId, started, stepIdx, isDone, lead]);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    requestAnimationFrame(() => {
      el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' });
    });
  }, [messages, isTyping, stepIdx]);

  const addMsg = (role, content, stepKey) =>
    setMessages((prev) => [
      ...prev,
      {
        id: `${Date.now()}-${prev.length}`,
        role,
        content,
        ...(stepKey ? { stepKey } : {}),
      },
    ]);

  const goToStep = useCallback((idx, currentLead) => {
    if (idx >= STEPS.length) {
      setIsDone(true);
      return;
    }
    setIsTyping(true);
    setTimeout(() => {
      setIsTyping(false);
      setStepIdx(idx);
      setInputValue('');
      setSelectedOpts([]);
      setFeedbackRating(null);
      setFeedbackComment('');
      const s = STEPS[idx];
      addMsg('assistant', interpolate(s.text, currentLead));
    }, 700);
  }, []);

  const beginNewSession = useCallback(() => {
    const id =
      typeof crypto !== 'undefined' && crypto.randomUUID
        ? crypto.randomUUID()
        : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    try {
      sessionStorage.setItem(DISCOVERY_SESSION_KEY, id);
    } catch (_) {}
    setClientSessionId(id);
    setLead({});
    setMessages([]);
    setStepIdx(-1);
    setEditingStepKey(null);
    setPendingFiles([]);
    setFilesError('');
    setIsDone(false);
    setStarted(true);
    goToStep(0, {});
  }, [goToStep]);

  const handleResume = useCallback(async () => {
    const id = typeof window !== 'undefined' ? sessionStorage.getItem(DISCOVERY_SESSION_KEY) : null;
    if (!id) return;
    const r = await fetch(`${DISCOVERY_API}/sessions/${id}`);
    if (!r.ok) return;
    const j = await r.json();
    if (!j.success || !j.data) return;
    const data = j.data;
    const answers = data.answers || {};
    let idx = Number(data.currentStepIndex);
    if (!Number.isFinite(idx)) idx = 0;
    idx = Math.min(Math.max(idx, 0), STEPS.length - 1);
    setClientSessionId(id);
    setLead(answers);
    setStepIdx(idx);
    setMessages(rebuildMessagesForStep(idx, answers));
    setEditingStepKey(null);
    setStarted(true);
    setIsDone(false);
    setIsTyping(false);
    setSelectedOpts([]);
    setInputValue('');
    setFeedbackRating(null);
    setFeedbackComment('');
    setPendingFiles([]);
    setFilesError('');
  }, []);

  const handleDiscardDraft = useCallback(() => {
    try {
      sessionStorage.removeItem(DISCOVERY_SESSION_KEY);
    } catch (_) {}
    setClientSessionId(null);
    setDraftAvailable(false);
  }, []);

  const cancelEdit = useCallback(() => {
    setEditingStepKey(null);
    setSelectedOpts([]);
    setInputValue('');
    setFeedbackRating(null);
    setFeedbackComment('');
    setPendingFiles([]);
    setFilesError('');
    setFilesSubmitting(false);
  }, []);

  const handleBack = useCallback(() => {
    if (isTyping || isDone) return;
    if (editingStepKey) {
      cancelEdit();
      return;
    }
    if (stepIdx <= 0) {
      setStarted(false);
      setStepIdx(-1);
      setEditingStepKey(null);
      setMessages([]);
      setLead({});
      setSelectedOpts([]);
      setInputValue('');
      setFeedbackRating(null);
      setFeedbackComment('');
      setPendingFiles([]);
      setFilesError('');
      if (clientSessionId) {
        void putDiscoverySession(clientSessionId, {
          answers: {},
          currentStepIndex: -1,
          completed: false,
        }).catch(() => {});
      }
      return;
    }
    const newIdx = stepIdx - 1;
    const newLead = { ...leadRef.current };
    for (let j = newIdx; j < STEPS.length; j += 1) {
      delete newLead[STEPS[j].key];
    }
    setLead(newLead);
    setStepIdx(newIdx);
    setMessages(rebuildMessagesForStep(newIdx, newLead));
    setSelectedOpts([]);
    setInputValue('');
    setFeedbackRating(null);
    setFeedbackComment('');
  }, [stepIdx, isTyping, isDone, clientSessionId, editingStepKey, cancelEdit]);

  /** Solo edita esa respuesta: reabre el control del paso sin borrar respuestas posteriores. */
  const handleEditAnswer = useCallback(
    (stepKey) => {
      if (isTyping || isDone) return;
      const targetIdx = STEPS.findIndex((s) => s.key === stepKey);
      if (targetIdx < 0 || targetIdx > stepIdx) return;
      const step = STEPS[targetIdx];
      const raw = leadRef.current[stepKey];
      setEditingStepKey(stepKey);
      setFeedbackRating(null);
      setFeedbackComment('');
      setInputValue('');
      setFilesError('');
      if (step.type === 'files' || step.type === 'upload_summary') {
        setSelectedOpts([]);
        setPendingFiles([]);
        return;
      }
      if (step.type === 'multi') {
        setSelectedOpts(raw ? String(raw).split(',').map((s) => s.trim()).filter(Boolean) : []);
      } else if (step.type === 'single') {
        setSelectedOpts(raw ? [String(raw)] : []);
      } else if (step.type === 'feedback') {
        setSelectedOpts([]);
        const str = raw ? String(raw) : '';
        const labels = ['Muy malo', 'Regular', 'Bien', 'Muy bien', '¡Excelente!'];
        let rating = null;
        for (let i = labels.length - 1; i >= 0; i -= 1) {
          if (str.startsWith(labels[i])) {
            rating = i + 1;
            break;
          }
        }
        if (rating) setFeedbackRating(rating);
        const sep = ' — "';
        const ix = str.indexOf(sep);
        if (ix >= 0) {
          const rest = str.slice(ix + sep.length);
          const end = rest.lastIndexOf('"');
          if (end >= 0) setFeedbackComment(rest.slice(0, end));
        }
      } else {
        setSelectedOpts([]);
        setInputValue(raw ? String(raw) : '');
      }
    },
    [isTyping, isDone, stepIdx]
  );

  const handleSingleSelect = useCallback(
    (opt) => {
      const editKey = editingStepKey;
      if (editKey) {
        const step = STEPS.find((s) => s.key === editKey);
        if (!step || step.type !== 'single') return;
        const newLead = { ...leadRef.current, [step.key]: opt };
        setLead(newLead);
        setMessages((prev) =>
          prev.map((m) => (m.stepKey === editKey && m.role === 'user' ? { ...m, content: opt } : m))
        );
        setEditingStepKey(null);
        setSelectedOpts([]);
        setInputValue('');
        return;
      }
      const idx = stepIdx;
      const step = STEPS[idx];
      if (!step || step.type !== 'single') return;
      const newLead = { ...leadRef.current, [step.key]: opt };
      addMsg('user', opt, step.key);
      setLead(newLead);
      goToStep(idx + 1, newLead);
    },
    [stepIdx, goToStep, editingStepKey]
  );

  const submitFilesStep = useCallback(
    async ({ skip }) => {
      const editKey = editingStepKey;
      const step = editKey ? STEPS.find((s) => s.key === editKey) : STEPS[stepIdx];
      if (!step || step.type !== 'files') return;
      let payload;
      if (skip) {
        if (!step.optional) return;
        payload = { skipped: true, items: [] };
      } else {
        const files = pendingFilesRef.current;
        if (!files.length) return;
        setFilesSubmitting(true);
        setFilesError('');
        try {
          payload = { skipped: false, items: await buildFileItemsFromFiles(files, step) };
        } catch (e) {
          setFilesError(e?.message || 'No se pudieron procesar los archivos');
          setFilesSubmitting(false);
          return;
        }
        setFilesSubmitting(false);
      }
      const bubble = formatFileAnswerForBubble(payload);
      if (editKey) {
        const newLead = { ...leadRef.current, [step.key]: payload };
        setLead(newLead);
        setMessages((prev) =>
          prev.map((m) => (m.stepKey === editKey && m.role === 'user' ? { ...m, content: bubble } : m))
        );
        setEditingStepKey(null);
        setPendingFiles([]);
        return;
      }
      addMsg('user', bubble, step.key);
      const newLead = { ...leadRef.current, [step.key]: payload };
      setLead(newLead);
      setPendingFiles([]);
      goToStep(stepIdx + 1, newLead);
    },
    [editingStepKey, stepIdx, goToStep]
  );

  const confirmUploadSummary = useCallback(() => {
    const editKey = editingStepKey;
    const step = editKey ? STEPS.find((s) => s.key === editKey) : STEPS[stepIdx];
    if (!step || step.type !== 'upload_summary') return;
    const payload = { confirmed: true };
    const bubble = 'Listo, revisado ✓';
    if (editKey) {
      const newLead = { ...leadRef.current, [step.key]: payload };
      setLead(newLead);
      setMessages((prev) =>
        prev.map((m) => (m.stepKey === editKey && m.role === 'user' ? { ...m, content: bubble } : m))
      );
      setEditingStepKey(null);
      return;
    }
    addMsg('user', bubble, step.key);
    const newLead = { ...leadRef.current, [step.key]: payload };
    setLead(newLead);
    goToStep(stepIdx + 1, newLead);
  }, [editingStepKey, stepIdx, goToStep]);

  const handleSubmit = () => {
    const editKey = editingStepKey;
    const step = editKey ? STEPS.find((s) => s.key === editKey) : STEPS[stepIdx];
    if (!step) return;
    let value;
    if (step.type === 'multi') {
      if (!selectedOpts.length) return;
      value = selectedOpts.join(', ');
    } else if (step.type === 'feedback') {
      if (!feedbackRating) return;
      const labels = ['Muy malo', 'Regular', 'Bien', 'Muy bien', '¡Excelente!'];
      value = `${labels[feedbackRating - 1]}${feedbackComment ? ` — "${feedbackComment}"` : ''}`;
    } else {
      if (!inputValue.trim() && !step.optional) return;
      value = inputValue.trim() || '(sin respuesta)';
    }
    if (editKey) {
      const newLead = { ...leadRef.current, [step.key]: value };
      setLead(newLead);
      setMessages((prev) =>
        prev.map((m) => (m.stepKey === editKey && m.role === 'user' ? { ...m, content: value } : m))
      );
      setEditingStepKey(null);
      setSelectedOpts([]);
      setInputValue('');
      setFeedbackRating(null);
      setFeedbackComment('');
      return;
    }
    addMsg('user', value, step.key);
    const newLead = { ...leadRef.current, [step.key]: value };
    setLead(newLead);
    goToStep(stepIdx + 1, newLead);
  };

  const toggleOpt = (opt, max) => {
    setSelectedOpts(prev => {
      if (prev.includes(opt)) return prev.filter(o => o !== opt);
      if (max && prev.length >= max) return max === 1 ? [opt] : [...prev.slice(1), opt];
      return [...prev, opt];
    });
  };

  const currentStep = stepIdx >= 0 && stepIdx < STEPS.length ? STEPS[stepIdx] : null;
  const activeInputStep = editingStepKey
    ? STEPS.find((s) => s.key === editingStepKey) ?? null
    : currentStep;

  const theme = useSyncExternalStore(subscribeToTheme, getThemeSnapshot, () => 'light');
  const isDark = theme === 'dark';
  const t = useMemo(() => discoveryTokens(isDark), [isDark]);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', isDark);
    localStorage.setItem(THEME_STORAGE_KEY, isDark ? 'dark' : 'light');
  }, [isDark]);

  const toggleTheme = useCallback(() => {
    if (typeof window === 'undefined') return;
    const cur = localStorage.getItem(THEME_STORAGE_KEY) === 'dark';
    const next = cur ? 'light' : 'dark';
    localStorage.setItem(THEME_STORAGE_KEY, next);
    window.dispatchEvent(new Event(THEME_EVENT));
  }, []);

  const uiValue = useMemo(
    () => ({ t, isDark, toggleTheme }),
    [t, isDark, toggleTheme]
  );

  const editBannerEl = useMemo(
    () =>
      editingStepKey ? (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 12,
            marginBottom: 12,
            paddingBottom: 12,
            borderBottom: isDark ? '1px solid #2A2F3F' : '1px solid rgba(156,119,245,0.14)',
          }}
        >
          <span style={{ fontSize: 13, color: t.inkMuted }}>
            Editando una respuesta anterior; lo demás no se borra.
          </span>
          <button
            type="button"
            onClick={cancelEdit}
            style={{
              flexShrink: 0,
              fontSize: 13,
              fontWeight: 600,
              color: isDark ? '#E5E7EB' : P_DARK,
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              textDecoration: 'underline',
            }}
          >
            Cancelar
          </button>
        </div>
      ) : null,
    [editingStepKey, isDark, t, cancelEdit]
  );

  return (
    <DiscoveryUiContext.Provider value={uiValue}>
      <div
        className="relative font-sans antialiased"
        style={{
          height: '100vh',
          maxHeight: '100dvh',
          background: t.pageBg,
          fontFamily: 'var(--font-dilo-sans), ui-sans-serif, system-ui, sans-serif',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        }}
      >
        {t.showOrbs ? <DiscoveryAuthOrbs /> : null}
        {(!started || isDone) && <DiscoveryThemeFloating />}
        <div className="relative z-10 flex min-h-0 flex-1 flex-col overflow-hidden">
          <style>{`@keyframes mdBounce { 0%,80%,100%{transform:scale(0.55);opacity:0.4} 40%{transform:scale(1);opacity:1} }`}</style>

          {!started ? (
            <div style={{ flex: 1, minHeight: 0, overflow: 'auto', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <WelcomeScreen
                onStart={beginNewSession}
                draftAvailable={draftAvailable}
                onResume={handleResume}
                onDiscardDraft={handleDiscardDraft}
              />
            </div>
          ) : isDone ? (
            <div style={{ flex: 1, minHeight: 0, overflow: 'auto' }}>
              <DoneScreen lead={lead} />
            </div>
          ) : (
            <>
              <DiscoveryProgress
                stepIdx={stepIdx}
                totalSteps={STEPS.length}
                showBack={!isTyping && stepIdx >= 0}
                onBack={handleBack}
              />
              <div
                ref={scrollRef}
                className="scrollbar-hide"
                style={{
                  flex: 1,
                  minHeight: 0,
                  overflowY: 'auto',
                  WebkitOverflowScrolling: 'touch',
                }}
              >
                <div style={{ maxWidth: 680, margin: '0 auto', width: '100%', padding: '24px 20px 32px' }}>
                  {messages.map((msg) => (
                    <Bubble
                      key={msg.id}
                      msg={msg}
                      onEditAnswer={handleEditAnswer}
                      allowEdit={!isTyping && !isDone && !editingStepKey}
                    />
                  ))}
                  {isTyping && <TypingIndicator />}
                  <div style={{ height: 8 }} aria-hidden />
                </div>
              </div>
              {!isTyping && activeInputStep && activeInputStep.type === 'files' ? (
                <FileUploadStep
                  step={activeInputStep}
                  editBanner={editBannerEl}
                  pendingFiles={pendingFiles}
                  setPendingFiles={setPendingFiles}
                  onSubmitFiles={() => void submitFilesStep({ skip: false })}
                  onSkip={() => void submitFilesStep({ skip: true })}
                  submitting={filesSubmitting}
                  error={filesError}
                />
              ) : !isTyping && activeInputStep && activeInputStep.type === 'upload_summary' ? (
                <UploadSummaryStep lead={lead} editBanner={editBannerEl} onContinue={confirmUploadSummary} />
              ) : !isTyping && activeInputStep ? (
                <InputArea
                  step={activeInputStep}
                  inputValue={inputValue}
                  setInputValue={setInputValue}
                  selectedOpts={selectedOpts}
                  onToggle={toggleOpt}
                  onSubmit={handleSubmit}
                  onSingleSelect={handleSingleSelect}
                  feedbackRating={feedbackRating}
                  setFeedbackRating={setFeedbackRating}
                  feedbackComment={feedbackComment}
                  setFeedbackComment={setFeedbackComment}
                  editBanner={editBannerEl}
                />
              ) : null}
            </>
          )}
        </div>
      </div>
    </DiscoveryUiContext.Provider>
  );
}
