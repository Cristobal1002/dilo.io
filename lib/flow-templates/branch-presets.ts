/**
 * Etiqueta + color por bloque lógico en plantillas.
 * Mismos hex que la paleta del editor (`STEP_BRANCH_COLOR_PRESETS`).
 */
export const TB = {
  contacto: { branch_label: 'Contacto', branch_color: '#64748B' },

  // Inmobiliaria
  inmIntent: { branch_label: 'Intención', branch_color: '#9C77F5' },
  inmComun: { branch_label: 'Tipo y zona', branch_color: '#94A3B8' },
  inmCompra: { branch_label: 'Compradores', branch_color: '#9C77F5' },
  inmArriendo: { branch_label: 'Arriendo', branch_color: '#10B981' },
  inmVenta: { branch_label: 'Venta', branch_color: '#3B82F6' },
  inmCierre: { branch_label: 'Cierre', branch_color: '#64748B' },

  // Agencia
  agProyecto: { branch_label: 'Proyecto y objetivos', branch_color: '#9C77F5' },
  agMarca: { branch_label: 'Marca y contenido', branch_color: '#10B981' },
  agTec: { branch_label: 'Web e integraciones', branch_color: '#06B6D4' },
  agCom: { branch_label: 'Presupuesto y plazo', branch_color: '#F59E0B' },
  agExp: { branch_label: 'Experiencia previa', branch_color: '#EC4899' },
  agFin: { branch_label: 'Cierre', branch_color: '#64748B' },

  // ERP
  erEmp: { branch_label: 'Empresa y operación', branch_color: '#3B82F6' },
  erSist: { branch_label: 'Sistemas y dolor', branch_color: '#9C77F5' },
  erFallo: { branch_label: 'ERP anterior (detalle)', branch_color: '#EC4899' },
  erMod: { branch_label: 'Módulos e integraciones', branch_color: '#10B981' },
  erOrg: { branch_label: 'Personas y cambio', branch_color: '#06B6D4' },
  erCom: { branch_label: 'Presupuesto y decisión', branch_color: '#F59E0B' },

  // Legal
  leCla: { branch_label: 'Clasificación', branch_color: '#9C77F5' },
  leHechos: { branch_label: 'Hechos y urgencia', branch_color: '#3B82F6' },
  leProc: { branch_label: 'Proceso y partes', branch_color: '#10B981' },
  leFin: { branch_label: 'Expectativas y cierre', branch_color: '#F59E0B' },

  // Onboarding cliente
  onFact: { branch_label: 'Facturación', branch_color: '#3B82F6' },
  onRoles: { branch_label: 'Roles y contactos', branch_color: '#10B981' },
  onCom: { branch_label: 'Comunicación', branch_color: '#06B6D4' },
  onAcc: { branch_label: 'Accesos y plazos', branch_color: '#9C77F5' },
  onPag: { branch_label: 'Pagos', branch_color: '#F59E0B' },

  // Organizaciones
  orPerf: { branch_label: 'Perfil de la org.', branch_color: '#3B82F6' },
  orOps: { branch_label: 'Operación diaria', branch_color: '#10B981' },
  orInv: { branch_label: 'Inversión y plazo', branch_color: '#F59E0B' },
} as const
