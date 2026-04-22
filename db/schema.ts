import {
    pgTable, uuid, text, integer, boolean,
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
    clerkId:        text('clerk_id').notNull().unique(),
    email:          text('email').notNull(),
    name:           text('name'),
    phone:          text('phone'),
    role:           text('role').notNull().default('owner'), // 'owner' | 'member'
    createdAt:      timestamp('created_at').notNull().defaultNow(),
  })

  // ─── Flows ───────────────────────────────────────────────
  export const flows = pgTable('flows', {
    id:              uuid('id').primaryKey().defaultRandom(),
    organizationId:  uuid('organization_id').notNull().references(() => organizations.id, { onDelete: 'cascade' }),
    name:            text('name').notNull(),
    description:     text('description'),
    promptOrigin:    text('prompt_origin'),
    status:          text('status').notNull().default('draft'), // draft | published | archived
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
