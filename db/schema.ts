import { sql } from 'drizzle-orm'
import {
    pgTable, uuid, text, integer, boolean, real,
    timestamp, jsonb, index, uniqueIndex,
  } from 'drizzle-orm/pg-core'

  // ─── Plans ───────────────────────────────────────────────
  /**
   * Catálogo de planes de Dilo. Filas estáticas — modificar mediante
   * el seed script (db/seed-plans.ts) o directamente en la BD.
   *
   * Límites: -1 significa ilimitado.
   * priceUsdMonthly: precio en centavos (ej. 2900 = $29.00 USD).
   */
  export const plans = pgTable('plans', {
    id:                  text('id').primaryKey(),           // 'free' | 'pro' | 'agency'
    label:               text('label').notNull(),
    flowsLimit:          integer('flows_limit').notNull(),  // -1 = ilimitado
    sessionsMonthLimit:  integer('sessions_month_limit').notNull(),
    membersLimit:        integer('members_limit').notNull(),
    priceUsdMonthly:     integer('price_usd_monthly').notNull().default(0), // centavos
    isActive:            boolean('is_active').notNull().default(true),
    createdAt:           timestamp('created_at').notNull().defaultNow(),
  })

  // ─── Organizations ───────────────────────────────────────
  /**
   * Una organización = un workspace de Dilo.
   * El campo `plan` es FK a plans.id y controla los límites activos.
   * Los campos de Stripe son nullable hasta que el cliente pague.
   */
  export const organizations = pgTable('organizations', {
    id:                    uuid('id').primaryKey().defaultRandom(),
    name:                  text('name').notNull(),
    slug:                  text('slug').notNull().unique(),
    /** Logo del workspace (URL en CDN, p. ej. Uploadthing). Flows públicos y emails si el flow no define `settings.logo_url`. */
    logoUrl:               text('logo_url'),
    /** Sitio web público del negocio (HTTPS), p. ej. para futuros footers o emails. */
    websiteUrl:            text('website_url'),
    /**
     * Cuerpo del cold email (Outreach), Markdown. Placeholders: `{{recipient}}`, `{{recipient_full}}`.
     * Párrafos separados con línea en blanco; `**negrita**`. Vacío → plantilla por defecto en código.
     */
    outreachColdEmailBodyMarkdown: text('outreach_cold_email_body_markdown'),
    /** Texto del botón CTA (HTML); null → "Ver enlace →". */
    outreachColdEmailCtaLabel: text('outreach_cold_email_cta_label'),
    /**
     * Instrucciones internas para valorar soporte/features (informe mensual).
     * Ej.: tarifa acordada, paquete de horas, qué cuenta como ahorro para el cliente.
     */
    supportContractPrompt: text('support_contract_prompt'),
    /** Tarifa USD/hora explícita; si null, el informe solo muestra horas salvo que el prompt indique otra cosa. */
    supportHourlyRateUsd: real('support_hourly_rate_usd'),

    /** Perfil en cotizaciones PDF / editor. */
    legalName:          text('legal_name'),
    taxId:              text('tax_id'),
    billingEmail:       text('billing_email'),
    billingPhone:       text('billing_phone'),
    billingAddress:     text('billing_address'),
    billingCity:        text('billing_city'),
    quotePrefix:        text('quote_prefix').default('COT'),

    // ── Plan & billing ──────────────────────────────────────
    plan:                  text('plan').notNull().default('free'), // FK se agrega después del seed — ver paso 2 de setup
    planStartedAt:         timestamp('plan_started_at'),
    trialEndsAt:           timestamp('trial_ends_at'),
    stripeCustomerId:      text('stripe_customer_id').unique(),
    stripeSubscriptionId:  text('stripe_subscription_id').unique(),

    /** Datos de negocio capturados en onboarding: businessType, useCase, teamSize, etc. */
    onboardingData:        jsonb('onboarding_data').default({}),
    createdAt:             timestamp('created_at').notNull().defaultNow(),
  })

  // ─── Users ───────────────────────────────────────────────
  export const users = pgTable('users', {
    id:             uuid('id').primaryKey().defaultRandom(),
    organizationId: uuid('organization_id').notNull().references(() => organizations.id, { onDelete: 'cascade' }),
    clerkId:        text('clerk_id').notNull(),
    email:          text('email').notNull(),
    name:           text('name'),
    phone:          text('phone'),
    role:           text('role').notNull().default('owner'), // owner | admin | member
    /** Preferencias de email: digest (off|daily|weekly), alertas por lead caliente / score. */
    emailNotificationSettings: jsonb('email_notification_settings').notNull().default({
      digest: 'weekly',
      alertHot: false,
      alertMinScore: null,
      alertMaxPerDay: 3,
    }),
    lastDigestSentAt: timestamp('last_digest_sent_at'),
    /** Estado interno p. ej. { hotDay, hotCount } para tope de alertas instantáneas. */
    notificationStats: jsonb('notification_stats').notNull().default({}),
    createdAt:      timestamp('created_at').notNull().defaultNow(),
  }, (t) => [
    uniqueIndex('users_org_clerk_uidx').on(t.organizationId, t.clerkId),
  ])

  /** Invitaciones al workspace (sin Clerk Organizations). */
  export const organizationInvitations = pgTable('organization_invitations', {
    id:             uuid('id').primaryKey().defaultRandom(),
    organizationId: uuid('organization_id').notNull().references(() => organizations.id, { onDelete: 'cascade' }),
    email:          text('email').notNull(),
    role:           text('role').notNull(), // admin | member
    token:          text('token').notNull().unique(),
    invitedByUserId: uuid('invited_by_user_id').references(() => users.id, { onDelete: 'set null' }),
    expiresAt:      timestamp('expires_at').notNull(),
    acceptedAt:     timestamp('accepted_at'),
    revokedAt:      timestamp('revoked_at'),
    createdAt:      timestamp('created_at').notNull().defaultNow(),
  }, (t) => [
    index('org_invites_org_email_idx').on(t.organizationId, t.email),
    index('org_invites_pending_idx').on(t.organizationId, t.acceptedAt, t.revokedAt),
  ])

  // ─── Flows ───────────────────────────────────────────────
  export const flows = pgTable('flows', {
    id:              uuid('id').primaryKey().defaultRandom(),
    organizationId:  uuid('organization_id').notNull().references(() => organizations.id, { onDelete: 'cascade' }),
    name:            text('name').notNull(),
    description:     text('description'),
    promptOrigin:    text('prompt_origin'),
    status:          text('status').notNull().default('draft'), // draft | published | archived
    /**
     * Cold outreach (Markdown) solo para este flow. Null → hereda plantilla del workspace.
     * Placeholders: `{{recipient}}`, `{{recipient_full}}`; párrafos con línea en blanco; `**negrita**`.
     */
    outreachColdEmailBodyMarkdown: text('outreach_cold_email_body_markdown'),
    /** Texto del botón CTA en el cold mail; null → hereda workspace o default en código. */
    outreachColdEmailCtaLabel: text('outreach_cold_email_cta_label'),
    settings:        jsonb('settings').default({}),
    scoringCriteria: jsonb('scoring_criteria').default({}),
    createdAt:       timestamp('created_at').notNull().defaultNow(),
    publishedAt:     timestamp('published_at'),
    updatedAt:       timestamp('updated_at').notNull().defaultNow(),
  }, (t) => [
    index('flows_org_idx').on(t.organizationId),
  ])

  // ─── Steps ───────────────────────────────────────────────
  export const steps = pgTable('steps', {
    id:           uuid('id').primaryKey().defaultRandom(),
    flowId:       uuid('flow_id').notNull().references(() => flows.id, { onDelete: 'cascade' }),
    order:        integer('order').notNull(),
    type:         text('type').notNull(), // text | long_text | select | multi_select | email | phone | number | rating | yes_no | file
    question:     text('question').notNull(),
    hint:         text('hint'),
    placeholder:  text('placeholder'),
    variableName: text('variable_name').notNull(),
    required:     boolean('required').notNull().default(true),
    conditions:   jsonb('conditions'),
    fileConfig:   jsonb('file_config'),
    /** Etiqueta corta solo para el editor (p. ej. rama «Compradores»). */
    branchLabel:  text('branch_label'),
    /** Hex #RRGGBB; solo panel. */
    branchColor:  text('branch_color'),
    createdAt:    timestamp('created_at').notNull().defaultNow(),
  }, (t) => [
    index('steps_flow_idx').on(t.flowId),
  ])

  // ─── Step Options ─────────────────────────────────────────
  export const stepOptions = pgTable('step_options', {
    id:      uuid('id').primaryKey().defaultRandom(),
    stepId:  uuid('step_id').notNull().references(() => steps.id, { onDelete: 'cascade' }),
    label:   text('label').notNull(),
    value:   text('value').notNull(),
    emoji:   text('emoji'),
    order:   integer('order').notNull(),
  })

  // ─── Sessions ─────────────────────────────────────────────
  export const sessions = pgTable('sessions', {
    id:          uuid('id').primaryKey().defaultRandom(),
    flowId:      uuid('flow_id').notNull().references(() => flows.id, { onDelete: 'cascade' }),
    token:       text('token').notNull().unique(),
    status:      text('status').notNull().default('in_progress'), // in_progress | completed | abandoned
    contact:     jsonb('contact').default({}),
    metadata:    jsonb('metadata').default({}),
    startedAt:   timestamp('started_at').notNull().defaultNow(),
    completedAt: timestamp('completed_at'),
    updatedAt:   timestamp('updated_at').notNull().defaultNow(),
  }, (t) => [
    index('sessions_flow_idx').on(t.flowId),
    index('sessions_token_idx').on(t.token),
  ])

  // ─── Answers ──────────────────────────────────────────────
  export const answers = pgTable('answers', {
    id:        uuid('id').primaryKey().defaultRandom(),
    sessionId: uuid('session_id').notNull().references(() => sessions.id, { onDelete: 'cascade' }),
    stepId:    uuid('step_id').notNull().references(() => steps.id, { onDelete: 'cascade' }),
    value:     text('value'),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
  }, (t) => [
    index('answers_session_idx').on(t.sessionId),
    uniqueIndex('answers_session_step_uidx').on(t.sessionId, t.stepId),
  ])

  // ─── Results ──────────────────────────────────────────────
  export const results = pgTable('results', {
    id:              uuid('id').primaryKey().defaultRandom(),
    sessionId:       uuid('session_id').notNull().unique().references(() => sessions.id, { onDelete: 'cascade' }),
    summary:         text('summary'),
    score:           integer('score'),
    classification:  text('classification'), // hot | warm | cold
    suggestedAction: text('suggested_action'),
    structuredData:  jsonb('structured_data').default({}),
    createdAt:       timestamp('created_at').notNull().defaultNow(),
  })

  // ─── Webhooks ─────────────────────────────────────────────
  export const webhooks = pgTable('webhooks', {
    id:        uuid('id').primaryKey().defaultRandom(),
    flowId:    uuid('flow_id').notNull().references(() => flows.id, { onDelete: 'cascade' }),
    url:       text('url').notNull(),
    secret:    text('secret'),
    active:    boolean('active').notNull().default(true),
    createdAt: timestamp('created_at').notNull().defaultNow(),
  })

  // ─── Webhook Deliveries ───────────────────────────────────
  export const webhookDeliveries = pgTable('webhook_deliveries', {
    id:         uuid('id').primaryKey().defaultRandom(),
    webhookId:  uuid('webhook_id').notNull().references(() => webhooks.id, { onDelete: 'cascade' }),
    sessionId:  uuid('session_id').notNull().references(() => sessions.id, { onDelete: 'cascade' }),
    status:     text('status').notNull().default('pending'), // pending | success | failed
    httpStatus: integer('http_status'),
    attempts:   integer('attempts').notNull().default(0),
    createdAt:  timestamp('created_at').notNull().defaultNow(),
  })

  // ─── Outreach (cold email CRM + tracking) ─────────────────
  /**
   * Leads propios por organización. `emailKey` = lower(trim(email)) para unicidad;
   * al archivar (soft delete) se reasigna para liberar el slot.
   * Status: pending | sent | opened | clicked | replied | meeting | closed | lost
   */
  export const outreachLeads = pgTable(
    'outreach_leads',
    {
      id:             uuid('id').primaryKey().defaultRandom(),
      organizationId: uuid('organization_id')
        .notNull()
        .references(() => organizations.id, { onDelete: 'cascade' }),
      name:           text('name').notNull(),
      email:          text('email').notNull(),
      emailKey:       text('email_key').notNull(),
      company:        text('company'),
      role:           text('role'),
      status:         text('status').notNull().default('pending'),
      notes:          text('notes'),
      lastActivityAt: timestamp('last_activity_at'),
      deletedAt:      timestamp('deleted_at'),
      createdAt:      timestamp('created_at').notNull().defaultNow(),
      updatedAt:      timestamp('updated_at').notNull().defaultNow(),
    },
    (t) => [
      index('outreach_leads_org_status_idx').on(t.organizationId, t.status),
      index('outreach_leads_org_activity_idx').on(t.organizationId, t.lastActivityAt),
      index('outreach_leads_org_deleted_idx').on(t.organizationId, t.deletedAt),
      uniqueIndex('outreach_leads_org_emailkey_uidx').on(t.organizationId, t.emailKey),
    ],
  )

  /** Un registro por envío; URLs públicas usan `trackingToken` (no el UUID). */
  export const outreachEmails = pgTable(
    'outreach_emails',
    {
      id:             uuid('id').primaryKey().defaultRandom(),
      leadId:         uuid('lead_id').notNull().references(() => outreachLeads.id, { onDelete: 'cascade' }),
      trackingToken:  text('tracking_token').notNull().unique(),
      subject:        text('subject').notNull(),
      sentAt:         timestamp('sent_at').notNull().defaultNow(),
      firstOpenedAt:  timestamp('first_opened_at'),
      openCount:      integer('open_count').notNull().default(0),
      firstClickedAt: timestamp('first_clicked_at'),
      clickCount:     integer('click_count').notNull().default(0),
      lastClickedUrl: text('last_clicked_url'),
      /** Destino HTTPS del CTA al registrar el envío (para reconstruir el link trackeado). */
      ctaDestinationUrl: text('cta_destination_url'),
      /** Flow cuyo override de plantilla cold se usó al enviar (opcional). */
      flowId:       uuid('flow_id').references(() => flows.id, { onDelete: 'set null' }),
      /** Id del mensaje en Resend (`data.id` al enviar); webhooks actualizan estado. */
      resendEmailId: text('resend_email_id'),
      /** Último estado conocido: queued | sent | delivered | bounced | complained | failed | delayed */
      resendDeliveryStatus: text('resend_delivery_status'),
      resendBounceType: text('resend_bounce_type'),
      resendBounceMessage: text('resend_bounce_message'),
      resendDeliveryUpdatedAt: timestamp('resend_delivery_updated_at'),
      createdAt:      timestamp('created_at').notNull().defaultNow(),
    },
    (t) => [
      index('outreach_emails_lead_idx').on(t.leadId),
      uniqueIndex('outreach_emails_resend_email_id_uidx')
        .on(t.resendEmailId)
        .where(sql`${t.resendEmailId} IS NOT NULL`),
    ],
  )

  /** Credenciales de integraciones por workspace (Resend, WhatsApp, etc.) — token/API key cifrado. */
  export const orgIntegrationCredentials = pgTable(
    'org_integration_credentials',
    {
      id:             uuid('id').primaryKey().defaultRandom(),
      organizationId: uuid('organization_id')
        .notNull()
        .references(() => organizations.id, { onDelete: 'cascade' }),
      /** Ej.: resend | whatsapp */
      provider:         text('provider').notNull(),
      encryptedPayload: text('encrypted_payload').notNull(),
      /** Lookup webhook Meta → org (solo whatsapp; sin cifrar). */
      phoneNumberId:  text('phone_number_id'),
      wabaId:         text('waba_id'),
      displayPhone:   text('display_phone'),
      status:         text('status').notNull().default('active'), // active | disconnected | error
      tokenExpiresAt: timestamp('token_expires_at'),
      lastError:      text('last_error'),
      createdAt:        timestamp('created_at').notNull().defaultNow(),
      updatedAt:        timestamp('updated_at').notNull().defaultNow(),
    },
    (t) => [
      index('org_integration_org_idx').on(t.organizationId),
      uniqueIndex('org_integration_org_provider_uidx').on(t.organizationId, t.provider),
      uniqueIndex('org_integration_whatsapp_phone_uidx')
        .on(t.phoneNumberId)
        .where(sql`${t.provider} = 'whatsapp' AND ${t.phoneNumberId} IS NOT NULL`),
    ],
  )

  /** Plantillas WhatsApp sincronizadas con Meta (por workspace). */
  export const whatsappTemplates = pgTable(
    'whatsapp_templates',
    {
      id:             uuid('id').primaryKey().defaultRandom(),
      organizationId: uuid('organization_id')
        .notNull()
        .references(() => organizations.id, { onDelete: 'cascade' }),
      name:           text('name').notNull(),
      language:       text('language').notNull().default('es'),
      category:       text('category').notNull(),
      status:         text('status').notNull().default('PENDING'),
      components:     jsonb('components').notNull().default([]),
      metaTemplateId: text('meta_template_id'),
      rejectionReason: text('rejection_reason'),
      createdAt:      timestamp('created_at').notNull().defaultNow(),
      updatedAt:      timestamp('updated_at').notNull().defaultNow(),
    },
    (t) => [
      index('wa_templates_org_idx').on(t.organizationId),
      uniqueIndex('wa_templates_org_name_lang_uidx').on(t.organizationId, t.name, t.language),
    ],
  )

  /**
   * Clientes (empresas) por workspace.
   * Se usan como entidad canónica para soporte e informes mensuales.
   */
  export const clients = pgTable(
    'clients',
    {
      id:             uuid('id').primaryKey().defaultRandom(),
      organizationId: uuid('organization_id')
        .notNull()
        .references(() => organizations.id, { onDelete: 'cascade' }),
      name:           text('name').notNull(),
      /** Slug canónico (único por org). */
      slug:           text('slug').notNull(),
      legalName:      text('legal_name'),
      /** ID en el sistema del partner (tenant). Único por org si está presente. */
      externalId:     text('external_id'),
      /** nit_co | ruc_pe | rfc_mx | rut_cl | cuit_ar | ruc_ec | rif_ve | rtn_hn | cedula_juridica_cr | generic */
      taxIdType:      text('tax_id_type'),
      taxId:          text('tax_id'),
      email:          text('email'),
      phone:          text('phone'),
      website:        text('website'),
      addressLine1:   text('address_line1'),
      addressLine2:   text('address_line2'),
      city:           text('city'),
      stateRegion:    text('state_region'),
      postalCode:     text('postal_code'),
      /** ISO 3166-1 alpha-2 (CO, MX, PE, …). */
      countryCode:    text('country_code'),
      notes:          text('notes'),
      status:         text('status').notNull().default('active'),
      /** Logo opcional en portal (si null, usa logo del workspace). */
      logoUrl:        text('logo_url'),
      /** essential | business | enterprise — visible en portal de cliente. */
      supportPlanTier: text('support_plan_tier').default('business'),
      /** Override de horario mostrado en portal (opcional). */
      supportHoursNote: text('support_hours_note'),
      embedAllowedDomains: jsonb('embed_allowed_domains').notNull().default([]),
      createdAt:      timestamp('created_at').notNull().defaultNow(),
      updatedAt:      timestamp('updated_at').notNull().defaultNow(),
    },
    (t) => [
      uniqueIndex('clients_org_slug_uidx').on(t.organizationId, t.slug),
      uniqueIndex('clients_org_external_id_uidx')
        .on(t.organizationId, t.externalId)
        .where(sql`${t.externalId} IS NOT NULL`),
      index('clients_org_name_idx').on(t.organizationId, t.name),
      index('clients_org_tax_id_idx').on(t.organizationId, t.taxId),
    ],
  )

  /** Invitaciones al portal de cliente (sin acceso al workspace Mordecai). */
  export const clientInvitations = pgTable('client_invitations', {
    id:              uuid('id').primaryKey().defaultRandom(),
    organizationId:  uuid('organization_id')
      .notNull()
      .references(() => organizations.id, { onDelete: 'cascade' }),
    clientId:        uuid('client_id')
      .notNull()
      .references(() => clients.id, { onDelete: 'cascade' }),
    email:           text('email').notNull(),
    /** viewer | coordinator | manager */
    role:            text('role').notNull(),
    token:           text('token').notNull().unique(),
    invitedByUserId: uuid('invited_by_user_id').references(() => users.id, { onDelete: 'set null' }),
    expiresAt:       timestamp('expires_at').notNull(),
    acceptedAt:      timestamp('accepted_at'),
    revokedAt:       timestamp('revoked_at'),
    createdAt:       timestamp('created_at').notNull().defaultNow(),
  }, (t) => [
    index('client_invites_client_email_idx').on(t.clientId, t.email),
    index('client_invites_pending_idx').on(t.clientId, t.acceptedAt, t.revokedAt),
  ])

  /** Usuarios del portal de cliente (Clerk id; no fila en `users` del workspace). */
  export const clientMembers = pgTable('client_members', {
    id:             uuid('id').primaryKey().defaultRandom(),
    organizationId: uuid('organization_id')
      .notNull()
      .references(() => organizations.id, { onDelete: 'cascade' }),
    clientId:       uuid('client_id')
      .notNull()
      .references(() => clients.id, { onDelete: 'cascade' }),
    /** Null hasta el primer inicio de sesión (alta directa por el partner). */
    clerkId:        text('clerk_id'),
    email:          text('email').notNull(),
    name:           text('name'),
    role:           text('role').notNull(),
    createdAt:      timestamp('created_at').notNull().defaultNow(),
  }, (t) => [
    uniqueIndex('client_members_client_clerk_uidx').on(t.clientId, t.clerkId),
    uniqueIndex('client_members_client_email_uidx').on(t.clientId, t.email),
    index('client_members_clerk_idx').on(t.clerkId),
  ])

  /** Códigos OTP para entrar al portal de cliente (sin Clerk). */
  export const clientPortalLoginCodes = pgTable('client_portal_login_codes', {
    id:          uuid('id').primaryKey().defaultRandom(),
    email:       text('email').notNull(),
    codeHash:    text('code_hash').notNull(),
    inviteToken: text('invite_token'),
    expiresAt:   timestamp('expires_at').notNull(),
    createdAt:   timestamp('created_at').notNull().defaultNow(),
  }, (t) => [
    index('client_portal_login_codes_email_idx').on(t.email, t.expiresAt),
  ])

  /** Artículos de base de conocimiento (deflexión antes de soporte). */
  export const knowledgeArticles = pgTable(
    'knowledge_articles',
    {
      id:             uuid('id').primaryKey().defaultRandom(),
      organizationId: uuid('organization_id')
        .notNull()
        .references(() => organizations.id, { onDelete: 'cascade' }),
      /** null = visible para toda la org; si hay valor, solo ese cliente (embed). */
      clientId:       uuid('client_id').references(() => clients.id, { onDelete: 'set null' }),
      title:          text('title').notNull(),
      body:           text('body').notNull(),
      status:         text('status').notNull().default('published'),
      createdAt:      timestamp('created_at').notNull().defaultNow(),
      updatedAt:      timestamp('updated_at').notNull().defaultNow(),
    },
    (t) => [
      index('knowledge_articles_org_idx').on(t.organizationId, t.status),
      index('knowledge_articles_org_client_idx').on(t.organizationId, t.clientId),
    ],
  )

  /**
   * Casos de soporte por workspace (bandeja Soporte).
   * Status: new | in_progress | waiting | resolved | closed
   */
  export const supportCases = pgTable(
    'support_cases',
    {
      id:               uuid('id').primaryKey().defaultRandom(),
      organizationId:   uuid('organization_id')
        .notNull()
        .references(() => organizations.id, { onDelete: 'cascade' }),
      caseNumber:       integer('case_number').notNull(),
      flowId:           uuid('flow_id').references(() => flows.id, { onDelete: 'set null' }),
      sessionId:        uuid('session_id').references(() => sessions.id, { onDelete: 'set null' }),
      status:           text('status').notNull().default('new'),
      priority:         text('priority').notNull().default('medium'),
      /** Urgencia reportada por el solicitante en el flow (no editable en bandeja). */
      reportedPriority: text('reported_priority').notNull().default('medium'),
      /** support | improvement | inquiry | other */
      type:             text('type').notNull().default('support'),
      subject:          text('subject').notNull(),
      description:      text('description'),
      requesterName:    text('requester_name'),
      requesterEmail:   text('requester_email'),
      requesterPhone:   text('requester_phone'),
      /** Cliente canónico (para agrupar informes/contratos). */
      clientId:         uuid('client_id').references(() => clients.id, { onDelete: 'set null' }),
      /** Empresa/cliente del solicitante (desde el flow: variable `cliente`, `empresa`, etc.). */
      clientCompany:    text('client_company'),
      assignedUserId:   uuid('assigned_user_id').references(() => users.id, { onDelete: 'set null' }),
      internalNotes:    text('internal_notes'),
      /** Notas visibles para el cliente en el portal. */
      clientNotes:      text('client_notes'),
      resolutionNotes:  text('resolution_notes'),
      /** Horas dedicadas por el equipo (base para informe de valor). */
      hoursSpent:       real('hours_spent'),
      /** Fecha comprometida de entrega. */
      dueAt:            timestamp('due_at'),
      /** null | pending | approved | cancelled | changes_requested */
      clientApprovalStatus: text('client_approval_status'),
      clientApprovalToken:  text('client_approval_token'),
      clientFeedback:       text('client_feedback'),
      submittedForApprovalAt: timestamp('submitted_for_approval_at'),
      clientRespondedAt:      timestamp('client_responded_at'),
      lastActivityAt:   timestamp('last_activity_at').notNull().defaultNow(),
      resolvedAt:       timestamp('resolved_at'),
      createdAt:        timestamp('created_at').notNull().defaultNow(),
      updatedAt:        timestamp('updated_at').notNull().defaultNow(),
    },
    (t) => [
      index('support_cases_org_status_idx').on(t.organizationId, t.status),
      index('support_cases_org_activity_idx').on(t.organizationId, t.lastActivityAt),
      index('support_cases_org_client_idx').on(t.organizationId, t.clientId),
      uniqueIndex('support_cases_org_number_uidx').on(t.organizationId, t.caseNumber),
      uniqueIndex('support_cases_session_uidx')
        .on(t.sessionId)
        .where(sql`${t.sessionId} IS NOT NULL`),
      uniqueIndex('support_cases_approval_token_uidx')
        .on(t.clientApprovalToken)
        .where(sql`${t.clientApprovalToken} IS NOT NULL`),
    ],
  )

  /**
   * Cotizaciones editables por workspace (generadas con IA desde sesiones o en blanco).
   */
  export const quotes = pgTable(
    'quotes',
    {
      id:             uuid('id').primaryKey().defaultRandom(),
      organizationId: uuid('organization_id')
        .notNull()
        .references(() => organizations.id, { onDelete: 'cascade' }),
      quoteNumber:    integer('quote_number').notNull(),
      status:         text('status').notNull().default('draft'),
      flowId:         uuid('flow_id').references(() => flows.id, { onDelete: 'set null' }),
      sessionId:      uuid('session_id').references(() => sessions.id, { onDelete: 'set null' }),
      clientName:     text('client_name'),
      clientTaxId:    text('client_tax_id'),
      clientPhone:    text('client_phone'),
      clientEmail:    text('client_email'),
      issueDate:      timestamp('issue_date').notNull().defaultNow(),
      dueDate:        timestamp('due_date'),
      lineItems:      jsonb('line_items').notNull().default([]),
      /** Instrucciones para IA al generar o regenerar esta cotización (interno, no va al PDF). */
      aiPrompt:       text('ai_prompt'),
      notes:          text('notes'),
      globalDiscountPercent: real('global_discount_percent').notNull().default(0),
      createdAt:      timestamp('created_at').notNull().defaultNow(),
      updatedAt:      timestamp('updated_at').notNull().defaultNow(),
    },
    (t) => [
      uniqueIndex('quotes_org_number_uidx').on(t.organizationId, t.quoteNumber),
      index('quotes_org_updated_idx').on(t.organizationId, t.updatedAt),
    ],
  )

  /** Auditoría de mensajes WhatsApp (inbound/outbound). */
  export const whatsappMessages = pgTable(
    'whatsapp_messages',
    {
      id:             uuid('id').primaryKey().defaultRandom(),
      organizationId: uuid('organization_id')
        .notNull()
        .references(() => organizations.id, { onDelete: 'cascade' }),
      sessionId:      uuid('session_id').references(() => sessions.id, { onDelete: 'set null' }),
      direction:      text('direction').notNull(),
      toNumber:       text('to_number'),
      fromNumber:     text('from_number'),
      templateId:     uuid('template_id').references(() => whatsappTemplates.id, { onDelete: 'set null' }),
      templateName:   text('template_name'),
      templateVars:   jsonb('template_vars'),
      status:         text('status').notNull().default('sent'),
      metaMessageId:  text('meta_message_id'),
      errorCode:      text('error_code'),
      errorMessage:   text('error_message'),
      rawPayload:     jsonb('raw_payload'),
      createdAt:      timestamp('created_at').notNull().defaultNow(),
    },
    (t) => [
      index('wa_messages_org_idx').on(t.organizationId),
      index('wa_messages_session_idx').on(t.sessionId),
      uniqueIndex('wa_messages_meta_id_uidx')
        .on(t.metaMessageId)
        .where(sql`${t.metaMessageId} IS NOT NULL`),
    ],
  )
