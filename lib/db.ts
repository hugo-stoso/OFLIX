import { mkdirSync } from "node:fs";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";
import { WORK_ACTIVITIES, type OpportunityKind } from "@/lib/domain";

export type Location = { id: string; state: string; municipality: string; district: string };
export type Profile = { id: string; name: string; type: "PERSON" | "ORGANIZATION" | "INSTITUTIONAL_ANALYST"; summary: string; capabilities: string; canSupplyPublic: boolean; isDemo: boolean; location: Location };
export type FormalEmploymentType = "CLT" | "INTERNSHIP";
export type Opportunity = { id: string; title: string; description: string; category: string; kind: OpportunityKind; owner: { id: string; name: string }; ownerType: Profile["type"]; location: Location; availability?: string; schedule?: string; eventDate?: string; employmentType?: FormalEmploymentType; requiredActivities?: string[] };
export type ServiceCallStatus = "OPEN" | "ACCEPTED";
export type ServiceCall = { id: string; title: string; activity: string; description: string; serviceDay: string; timeWindow: string; status: ServiceCallStatus; requester: { id: string; name: string; type: Profile["type"] }; location: Location; acceptedBy?: { id: string; name: string }; createdAt: string; acceptedAt?: string };

type Row = Record<string, unknown>;
type DatabaseLike = { exec: (sql: string) => void; prepare: (sql: string) => { all: (...params: unknown[]) => Row[]; get: (...params: unknown[]) => Row | undefined; run: (...params: unknown[]) => unknown } };
const globalForDb = globalThis as unknown as { oflixDb?: DatabaseLike; oflixInitialized?: boolean };

function runtimeDatabasePath() {
  if (process.env.VERCEL) {
    const deploymentId = (process.env.VERCEL_DEPLOYMENT_ID ?? "runtime").replace(/[^a-zA-Z0-9_-]/g, "-");
    const temporaryRoot = process.env.TMPDIR ?? process.env.TEMP ?? "/tmp";
    return path.join(temporaryRoot, `oflix-${deploymentId}.db`);
  }
  return path.join(process.cwd(), "prisma", "dev.db");
}

function seedDemoData(db: DatabaseLike) {
  const profileCount = Number(db.prepare("SELECT COUNT(*) total FROM profiles").get()?.total ?? 0);
  if (profileCount > 0) return;

  const insert = (sql: string, ...params: string[]) => db.prepare(sql).run(...params);
  const locations = [
    ["loc-aracaju-centro", "SE", "Aracaju", "Centro"],
    ["loc-aracaju-bugio", "SE", "Aracaju", "Bugio"],
    ["loc-aracaju-sao-jose", "SE", "Aracaju", "São José"],
    ["loc-lagarto-centro", "SE", "Lagarto", "Centro"],
    ["loc-lagarto-cidade-nova", "SE", "Lagarto", "Cidade Nova"],
    ["loc-socorro-taicoca", "SE", "Nossa Senhora do Socorro", "Taiçoca"],
  ];
  for (const row of locations) insert("INSERT INTO locations (id, state, municipality, district) VALUES (?, ?, ?, ?)", ...row);

  const profiles = [
    ["profile-ana", "Hugo Silva", "PERSON", "Pessoa em busca de oportunidades e conexões locais.", "Candidato formal · Voluntário", "loc-aracaju-centro", "0"],
    ["profile-coletivo", "Coletivo Horizonte (demonstração)", "ORGANIZATION", "Organização fictícia para demonstrar publicação de oportunidades.", "Empresa · Ações comunitárias", "loc-aracaju-sao-jose", "1"],
    ["profile-instituto", "Instituto Ponte Aberta (demonstração)", "ORGANIZATION", "Organização fictícia com atuação em desenvolvimento territorial.", "Organização sem fins lucrativos · Voluntariado", "loc-lagarto-cidade-nova", "0"],
    ["profile-rafael", "Amanda Figueiredo (demonstração)", "PERSON", "Profissional autônoma que atende demandas residenciais.", "Manutenção residencial · Serviços autônomos", "loc-lagarto-centro", "0"],
    ["profile-analista", "Observatório Território Aberto (demonstração)", "INSTITUTIONAL_ANALYST", "Persona fictícia para leitura agregada do território.", "Inteligência territorial · Análise agregada", "loc-aracaju-centro", "0"],
  ];
  for (const row of profiles) insert("INSERT INTO profiles (id, name, type, summary, capabilities, location_id, can_supply_public) VALUES (?, ?, ?, ?, ?, ?, ?)", ...row);

  insert("INSERT INTO formal_opportunities (id, title, description, category, organization_id, location_id, employment_type) VALUES (?, ?, ?, ?, ?, ?, ?)", "formal-operations", "Assistente de operações locais", "A pessoa apoiará a organização de rotas, conferência de estoque, contato com parceiros e registro de indicadores simples da operação. A rotina combina trabalho em equipe, acompanhamento de prazos e presença no território.", "Operações", "profile-coletivo", "loc-aracaju-centro", "CLT");
  insert("INSERT INTO formal_opportunities (id, title, description, category, organization_id, location_id, employment_type) VALUES (?, ?, ?, ?, ?, ?, ?)", "formal-attendance", "Técnico de atendimento", "Atendimento presencial e remoto para uma rede de serviços em expansão, com acolhimento de solicitações, organização de agenda e encaminhamento para as áreas responsáveis. Buscamos comunicação clara e escuta ativa.", "Atendimento", "profile-coletivo", "loc-socorro-taicoca", "CLT");
  insert("INSERT INTO formal_opportunities (id, title, description, category, organization_id, location_id, employment_type) VALUES (?, ?, ?, ?, ?, ?, ?)", "formal-logistics", "Auxiliar de logística comunitária", "Apoio ao recebimento de materiais, separação de pedidos, inventário e planejamento de entregas para iniciativas locais. A oportunidade é indicada para quem gosta de organização, rotina operacional e contato com diferentes bairros.", "Logística", "profile-coletivo", "loc-lagarto-centro", "CLT");
  insert("INSERT INTO formal_opportunities (id, title, description, category, organization_id, location_id, employment_type) VALUES (?, ?, ?, ?, ?, ?, ?)", "formal-communications-intern", "Estágio em comunicação territorial", "Apoio à produção de textos, calendário editorial, registros de ações e organização de informações para redes sociais. O estágio oferece acompanhamento de uma pessoa responsável e espaço para desenvolver portfólio.", "Comunicação", "profile-coletivo", "loc-aracaju-sao-jose", "INTERNSHIP");
  insert("INSERT INTO formal_opportunities (id, title, description, category, organization_id, location_id, employment_type) VALUES (?, ?, ?, ?, ?, ?, ?)", "formal-education-intern", "Estágio em projetos educativos", "Apoio ao planejamento de oficinas, preparação de materiais e acompanhamento de atividades com crianças e adolescentes. É uma oportunidade para quem estuda pedagogia, licenciaturas ou áreas relacionadas e quer aprender com uma equipe comunitária.", "Educação", "profile-instituto", "loc-lagarto-cidade-nova", "INTERNSHIP");
  insert("INSERT INTO service_offers (id, title, description, category, provider_id, location_id, availability, required_activities) VALUES (?, ?, ?, ?, ?, ?, ?, ?)", "service-maintenance", "Manutenção residencial", "Atendimento para pequenos reparos elétricos, hidráulicos, instalação de suportes e ajustes de rotina em residências. O serviço começa com uma conversa sobre a demanda, avaliação do local e combinação transparente de prazo e materiais.", "Manutenção", "profile-rafael", "loc-lagarto-centro", "Agenda combinada pelo território", "Manutenção|Eletricista");
  insert("INSERT INTO service_offers (id, title, description, category, provider_id, location_id, availability, required_activities) VALUES (?, ?, ?, ?, ?, ?, ?, ?)", "service-design", "Design e conteúdo local", "Criação de identidade visual simples, peças digitais, cardápios e textos para pequenos negócios e iniciativas locais. O trabalho inclui briefing, primeira proposta e rodada combinada de ajustes.", "Comunicação", "profile-coletivo", "loc-aracaju-sao-jose", "Atendimento remoto ou em Aracaju", "Design|Comunicação");
  insert("INSERT INTO service_offers (id, title, description, category, provider_id, location_id, availability, required_activities) VALUES (?, ?, ?, ?, ?, ?, ?, ?)", "service-electrical", "Instalações elétricas residenciais", "Serviço de manutenção preventiva, troca de tomadas e interruptores, instalação de luminárias e identificação de pequenos problemas elétricos. O atendimento é combinado conforme o bairro e a complexidade da demanda.", "Eletricista", "profile-rafael", "loc-aracaju-centro", "Segunda a sexta, com horário combinado", "Eletricista|Manutenção");
  insert("INSERT INTO service_offers (id, title, description, category, provider_id, location_id, availability, required_activities) VALUES (?, ?, ?, ?, ?, ?, ?, ?)", "service-food", "Alimentação para eventos locais", "Planejamento e produção de lanches, coffee breaks e refeições para encontros de pequeno e médio porte. A proposta considera quantidade de pessoas, restrições informadas e logística de entrega.", "Alimentação", "profile-rafael", "loc-socorro-taicoca", "Reservas com antecedência", "Alimentação|Eventos");
  insert("INSERT INTO service_offers (id, title, description, category, provider_id, location_id, availability, required_activities) VALUES (?, ?, ?, ?, ?, ?, ?, ?)", "service-tutoring", "Aulas de reforço escolar", "Acompanhamento individual ou em pequenos grupos para organização de estudos, leitura e matemática. O plano é ajustado à idade, ao objetivo da família e à rotina disponível.", "Educação", "profile-coletivo", "loc-aracaju-bugio", "Tardes e início da noite", "Educação|Cuidados");
  insert("INSERT INTO volunteer_opportunities (id, title, description, category, organizer_id, location_id, schedule, event_date) VALUES (?, ?, ?, ?, ?, ?, ?, ?)", "volunteer-reading", "Mutirão de leitura comunitária", "Encontros de leitura para crianças e adolescentes em um espaço comunitário do bairro, com preparação de atividades, acolhimento das famílias e registro das histórias compartilhadas. Não é necessário ter experiência prévia: a equipe orienta as pessoas voluntárias.", "Educação", "profile-instituto", "loc-aracaju-bugio", "Sábados, pela manhã", "2026-10-03T09:00:00-03:00");
  insert("INSERT INTO volunteer_opportunities (id, title, description, category, organizer_id, location_id, schedule, event_date) VALUES (?, ?, ?, ?, ?, ?, ?, ?)", "volunteer-health", "Apoio à feira de saúde", "Recepção, organização de fluxo e apoio à comunicação em uma ação comunitária de orientação e prevenção. A pessoa voluntária recebe um roteiro de atividades e atua sempre junto da equipe responsável pela feira.", "Saúde", "profile-instituto", "loc-lagarto-cidade-nova", "Uma manhã, com escala prévia", "2026-10-10T08:00:00-03:00");
  insert("INSERT INTO volunteer_opportunities (id, title, description, category, organizer_id, location_id, schedule, event_date) VALUES (?, ?, ?, ?, ?, ?, ?, ?)", "volunteer-park", "Cuidado coletivo da praça", "Mobilização para limpeza leve, plantio de mudas e pintura de sinalização em uma praça do bairro. A iniciativa oferece materiais, divisão de tarefas e uma conversa final sobre manutenção do espaço comum.", "Meio ambiente", "profile-instituto", "loc-aracaju-sao-jose", "Domingo, das 8h às 11h", "2026-10-18T08:00:00-03:00");
  insert("INSERT INTO volunteer_opportunities (id, title, description, category, organizer_id, location_id, schedule, event_date) VALUES (?, ?, ?, ?, ?, ?, ?, ?)", "volunteer-digital", "Oficina de inclusão digital", "Apoio a pessoas idosas durante uma oficina prática sobre celular, serviços públicos digitais e segurança básica. É possível atuar no acolhimento, na orientação individual ou na organização do espaço.", "Inclusão digital", "profile-instituto", "loc-lagarto-centro", "Quartas-feiras, no fim da tarde", "2026-10-21T17:30:00-03:00");
  insert("INSERT INTO interactions (id, actor_profile_id, target_type, target_id, action) VALUES (?, ?, ?, ?, ?)", "interaction-demo-1", "profile-ana", "FORMAL", "formal-operations", "APPLY");
  insert("INSERT INTO interactions (id, actor_profile_id, target_type, target_id, action) VALUES (?, ?, ?, ?, ?)", "interaction-demo-2", "profile-ana", "VOLUNTEER", "volunteer-reading", "VOLUNTEER_INTEREST");
  insert("INSERT INTO interactions (id, actor_profile_id, target_type, target_id, action) VALUES (?, ?, ?, ?, ?)", "interaction-demo-3", "profile-rafael", "SERVICE", "service-design", "CONTACT_REQUEST");
  insert("INSERT INTO interactions (id, actor_profile_id, target_type, target_id, action) VALUES (?, ?, ?, ?, ?)", "interaction-demo-4", "profile-ana", "SERVICE", "service-maintenance", "CONTACT_REQUEST");
}

function database() {
  if (!globalForDb.oflixDb) {
    const dbPath = runtimeDatabasePath();
    mkdirSync(path.dirname(dbPath), { recursive: true });
    globalForDb.oflixDb = new DatabaseSync(dbPath) as DatabaseLike;
  }
  const db = globalForDb.oflixDb;
  if (!globalForDb.oflixInitialized) {
    db.exec(`
      PRAGMA foreign_keys = ON;
      CREATE TABLE IF NOT EXISTS locations (id TEXT PRIMARY KEY, state TEXT NOT NULL, municipality TEXT NOT NULL, district TEXT NOT NULL, UNIQUE(state, municipality, district));
      CREATE TABLE IF NOT EXISTS profiles (id TEXT PRIMARY KEY, name TEXT NOT NULL, type TEXT NOT NULL, summary TEXT NOT NULL, capabilities TEXT NOT NULL, is_demo INTEGER NOT NULL DEFAULT 1, location_id TEXT NOT NULL REFERENCES locations(id), can_supply_public INTEGER NOT NULL DEFAULT 0);
      CREATE TABLE IF NOT EXISTS formal_opportunities (id TEXT PRIMARY KEY, title TEXT NOT NULL, description TEXT NOT NULL, category TEXT NOT NULL, organization_id TEXT NOT NULL REFERENCES profiles(id), location_id TEXT NOT NULL REFERENCES locations(id), status TEXT NOT NULL DEFAULT 'OPEN', employment_type TEXT NOT NULL DEFAULT 'CLT');
      CREATE TABLE IF NOT EXISTS service_offers (id TEXT PRIMARY KEY, title TEXT NOT NULL, description TEXT NOT NULL, category TEXT NOT NULL, provider_id TEXT NOT NULL REFERENCES profiles(id), location_id TEXT NOT NULL REFERENCES locations(id), availability TEXT NOT NULL, required_activities TEXT NOT NULL DEFAULT '');
      CREATE TABLE IF NOT EXISTS volunteer_opportunities (id TEXT PRIMARY KEY, title TEXT NOT NULL, description TEXT NOT NULL, category TEXT NOT NULL, organizer_id TEXT NOT NULL REFERENCES profiles(id), location_id TEXT NOT NULL REFERENCES locations(id), schedule TEXT NOT NULL, event_date TEXT);
      CREATE TABLE IF NOT EXISTS interactions (id TEXT PRIMARY KEY, actor_profile_id TEXT NOT NULL REFERENCES profiles(id), target_type TEXT NOT NULL, target_id TEXT NOT NULL, action TEXT NOT NULL, created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP, UNIQUE(actor_profile_id, target_type, target_id));
      CREATE TABLE IF NOT EXISTS service_calls (id TEXT PRIMARY KEY, requester_profile_id TEXT NOT NULL REFERENCES profiles(id), title TEXT NOT NULL, activity TEXT NOT NULL, description TEXT NOT NULL, location_id TEXT NOT NULL REFERENCES locations(id), service_day TEXT NOT NULL, time_window TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'OPEN', accepted_by_profile_id TEXT REFERENCES profiles(id), created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP, accepted_at TEXT);
      CREATE INDEX IF NOT EXISTS idx_profiles_type ON profiles(type);
      CREATE INDEX IF NOT EXISTS idx_interactions_target ON interactions(target_type, target_id);
      CREATE INDEX IF NOT EXISTS idx_service_calls_open ON service_calls(status, service_day, activity);
    `);
    try { db.exec("ALTER TABLE formal_opportunities ADD COLUMN employment_type TEXT NOT NULL DEFAULT 'CLT'"); } catch { /* coluna já existe */ }
    try { db.exec("ALTER TABLE service_offers ADD COLUMN required_activities TEXT NOT NULL DEFAULT ''"); } catch { /* coluna já existe */ }
    try { db.exec("ALTER TABLE volunteer_opportunities ADD COLUMN event_date TEXT"); } catch { /* coluna já existe */ }
    try { db.exec("ALTER TABLE profiles ADD COLUMN can_supply_public INTEGER NOT NULL DEFAULT 0"); } catch { /* coluna já existe */ }
    db.prepare("UPDATE profiles SET can_supply_public = 1 WHERE id = 'profile-coletivo'").run();
    globalForDb.oflixInitialized = true;
    seedDemoData(db);
  }
  return db;
}

export function ensureDatabase() { return database(); }
function locationFrom(row: Row): Location { return { id: String(row.location_id), state: String(row.state), municipality: String(row.municipality), district: String(row.district) }; }
function profileFrom(row: Row): Profile { return { id: String(row.id), name: String(row.name), type: String(row.type) as Profile["type"], summary: String(row.summary), capabilities: String(row.capabilities), canSupplyPublic: Boolean(row.can_supply_public), isDemo: Boolean(row.is_demo), location: locationFrom(row) }; }
const profileSelect = `SELECT p.id, p.name, p.type, p.summary, p.capabilities, p.can_supply_public, p.is_demo, l.id AS location_id, l.state, l.municipality, l.district FROM profiles p JOIN locations l ON l.id = p.location_id`;

export function listProfiles() { return database().prepare(`${profileSelect} ORDER BY p.type, p.name`).all().map(profileFrom); }

function opportunityFrom(row: Row, kind: OpportunityKind): Opportunity {
  const requiredActivities = String(row.required_activities ?? "").split("|").map((activity) => activity.trim()).filter(Boolean);
  return { id: String(row.id), title: String(row.title), description: String(row.description), category: String(row.category), kind, owner: { id: String(row.owner_id), name: String(row.owner_name) }, ownerType: String(row.owner_type) as Profile["type"], location: locationFrom(row), ...(row.availability ? { availability: String(row.availability) } : {}), ...(row.schedule ? { schedule: String(row.schedule) } : {}), ...(row.event_date ? { eventDate: String(row.event_date) } : {}), ...(row.employment_type ? { employmentType: String(row.employment_type) as FormalEmploymentType } : {}), ...(requiredActivities.length ? { requiredActivities } : {}) };
}
const joinedLocation = `JOIN locations l ON l.id = o.location_id`;
export function listOpportunities() {
  const db = database();
  const formal = db.prepare(`SELECT o.*, p.id owner_id, p.name owner_name, p.type owner_type, l.id location_id, l.state, l.municipality, l.district FROM formal_opportunities o JOIN profiles p ON p.id = o.organization_id ${joinedLocation} ORDER BY o.rowid`).all().map((row) => opportunityFrom(row, "formal"));
  const service = db.prepare(`SELECT o.*, p.id owner_id, p.name owner_name, p.type owner_type, l.id location_id, l.state, l.municipality, l.district FROM service_offers o JOIN profiles p ON p.id = o.provider_id ${joinedLocation} ORDER BY o.rowid`).all().map((row) => opportunityFrom(row, "service"));
  const volunteer = db.prepare(`SELECT o.*, p.id owner_id, p.name owner_name, p.type owner_type, l.id location_id, l.state, l.municipality, l.district FROM volunteer_opportunities o JOIN profiles p ON p.id = o.organizer_id ${joinedLocation} ORDER BY o.rowid`).all().map((row) => opportunityFrom(row, "volunteer"));
  return { formal, service, volunteer };
}

export function findOpportunity(id: string, kind: OpportunityKind) {
  const table = kind === "formal" ? "formal_opportunities" : kind === "service" ? "service_offers" : "volunteer_opportunities";
  const ownerField = kind === "formal" ? "organization_id" : kind === "service" ? "provider_id" : "organizer_id";
  const row = database().prepare(`SELECT o.*, p.id owner_id, p.name owner_name, p.type owner_type, l.id location_id, l.state, l.municipality, l.district FROM ${table} o JOIN profiles p ON p.id = o.${ownerField} ${joinedLocation} WHERE o.id = ?`).get(id);
  return row ? opportunityFrom(row, kind) : null;
}

export type TalentInterest = { id: string; profileId: string; name: string; summary: string; capabilities: string; opportunityId: string; opportunityTitle: string; category: string; ownerId: string; action: string; createdAt: string };

export function listTalentInterests(): TalentInterest[] {
  return database().prepare(`
    WITH opportunities AS (
      SELECT id AS opportunity_id, 'FORMAL' AS target_type, title, category, organization_id AS owner_id FROM formal_opportunities
      UNION ALL SELECT id, 'SERVICE', title, category, provider_id FROM service_offers
      UNION ALL SELECT id, 'VOLUNTEER', title, category, organizer_id FROM volunteer_opportunities
    )
    SELECT i.id, p.id profile_id, p.name, p.summary, p.capabilities, o.opportunity_id, o.title, o.category, o.owner_id, i.action, i.created_at
    FROM interactions i
    JOIN profiles p ON p.id = i.actor_profile_id
    JOIN opportunities o ON o.opportunity_id = i.target_id AND o.target_type = i.target_type
    ORDER BY i.created_at DESC
  `).all().map((row) => ({ id: String(row.id), profileId: String(row.profile_id), name: String(row.name), summary: String(row.summary), capabilities: String(row.capabilities), opportunityId: String(row.opportunity_id), opportunityTitle: String(row.title), category: String(row.category), ownerId: String(row.owner_id), action: String(row.action), createdAt: String(row.created_at) }));
}

export function canAccessTalentBank(profileId: string) {
  const profile = database().prepare("SELECT type FROM profiles WHERE id = ?").get(profileId);
  return profile?.type === "ORGANIZATION";
}

function serviceCallFrom(row: Row): ServiceCall {
  return {
    id: String(row.id), title: String(row.title), activity: String(row.activity), description: String(row.description), serviceDay: String(row.service_day), timeWindow: String(row.time_window), status: String(row.status) as ServiceCallStatus,
    requester: { id: String(row.requester_id), name: String(row.requester_name), type: String(row.requester_type) as Profile["type"] }, location: locationFrom(row),
    ...(row.accepted_by_id && row.accepted_by_name ? { acceptedBy: { id: String(row.accepted_by_id), name: String(row.accepted_by_name) } } : {}), createdAt: String(row.created_at), ...(row.accepted_at ? { acceptedAt: String(row.accepted_at) } : {}),
  };
}

const serviceCallSelect = `SELECT c.*, requester.id requester_id, requester.name requester_name, requester.type requester_type, accepted.id accepted_by_id, accepted.name accepted_by_name, l.id location_id, l.state, l.municipality, l.district FROM service_calls c JOIN profiles requester ON requester.id = c.requester_profile_id LEFT JOIN profiles accepted ON accepted.id = c.accepted_by_profile_id JOIN locations l ON l.id = c.location_id`;

export function listServiceCalls(profileId: string, activities: string[], today: string) {
  const db = database();
  const profile = db.prepare("SELECT type FROM profiles WHERE id = ?").get(profileId);
  if (!profile) return [] as ServiceCall[];
  if (profile.type === "ORGANIZATION") return db.prepare(`${serviceCallSelect} WHERE c.requester_profile_id = ? ORDER BY c.created_at DESC`).all(profileId).map(serviceCallFrom);
  if (profile.type !== "PERSON") return [] as ServiceCall[];
  if (!activities.length) return db.prepare(`${serviceCallSelect} WHERE c.requester_profile_id = ? ORDER BY c.created_at DESC`).all(profileId).map(serviceCallFrom);
  const placeholders = activities.map(() => "?").join(", ");
  return db.prepare(`${serviceCallSelect} WHERE c.requester_profile_id = ? OR (c.status = 'OPEN' AND c.requester_profile_id <> ? AND c.service_day >= ? AND c.activity IN (${placeholders})) ORDER BY c.created_at DESC`).all(profileId, profileId, today, ...activities).map(serviceCallFrom);
}

export function createServiceCall(input: { requesterProfileId: string; activity: string; title: string; description: string; serviceDay: string; timeWindow: string }) {
  const db = database();
  if (!WORK_ACTIVITIES.some((activity) => activity === input.activity)) return { error: "activity_invalid" as const };
  const requester = db.prepare("SELECT id, type, location_id FROM profiles WHERE id = ?").get(input.requesterProfileId);
  if (!requester || (requester.type !== "PERSON" && requester.type !== "ORGANIZATION")) return { error: "requester_invalid" as const };
  const id = `service-call-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  db.prepare("INSERT INTO service_calls (id, requester_profile_id, title, activity, description, location_id, service_day, time_window) VALUES (?, ?, ?, ?, ?, ?, ?, ?)").run(id, input.requesterProfileId, input.title, input.activity, input.description, requester.location_id, input.serviceDay, input.timeWindow);
  const row = db.prepare(`${serviceCallSelect} WHERE c.id = ?`).get(id);
  return { call: row ? serviceCallFrom(row) : null };
}

export function acceptServiceCall(input: { callId: string; workerProfileId: string }) {
  const db = database();
  const worker = db.prepare("SELECT type FROM profiles WHERE id = ?").get(input.workerProfileId);
  if (worker?.type !== "PERSON") return { accepted: false as const, reason: "worker_required" as const };
  db.prepare("UPDATE service_calls SET status = 'ACCEPTED', accepted_by_profile_id = ?, accepted_at = CURRENT_TIMESTAMP WHERE id = ? AND status = 'OPEN' AND requester_profile_id <> ?").run(input.workerProfileId, input.callId, input.workerProfileId);
  const changed = Number(db.prepare("SELECT changes() total").get()?.total ?? 0);
  const row = db.prepare(`${serviceCallSelect} WHERE c.id = ?`).get(input.callId);
  if (!row) return { accepted: false as const, reason: "not_found" as const };
  return changed ? { accepted: true as const, call: serviceCallFrom(row) } : { accepted: false as const, reason: String(row.status) === "ACCEPTED" ? "already_taken" as const : "unavailable" as const, call: serviceCallFrom(row) };
}

export function createInteraction(input: { actorProfileId: string; targetType: string; targetId: string; action: string }) {
  try {
    const targetTable = input.targetType === "FORMAL" ? "formal_opportunities" : input.targetType === "SERVICE" ? "service_offers" : "volunteer_opportunities";
    const ownerField = input.targetType === "FORMAL" ? "organization_id" : input.targetType === "SERVICE" ? "provider_id" : "organizer_id";
    const owner = database().prepare(`SELECT ${ownerField} owner_id FROM ${targetTable} WHERE id = ?`).get(input.targetId);
    if (owner?.owner_id === input.actorProfileId) return { duplicate: false, selfOwned: true };
    database().prepare("INSERT INTO interactions (id, actor_profile_id, target_type, target_id, action) VALUES (?, ?, ?, ?, ?)").run(`interaction-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`, input.actorProfileId, input.targetType, input.targetId, input.action);
    return { duplicate: false, selfOwned: false };
  } catch (error) {
    if (String(error).includes("UNIQUE constraint failed")) return { duplicate: true, selfOwned: false };
    throw error;
  }
}

export function territoryData() {
  const db = database();
  const count = (table: string) => Number(db.prepare(`SELECT COUNT(*) total FROM ${table}`).get()?.total ?? 0);
  const formal = count("formal_opportunities"); const service = count("service_offers"); const volunteer = count("volunteer_opportunities"); const interactions = count("interactions");
  const territorial = db.prepare(`SELECT l.municipality, l.district, COUNT(i.id) total FROM locations l JOIN (SELECT id target_id, location_id FROM formal_opportunities UNION ALL SELECT id target_id, location_id FROM service_offers UNION ALL SELECT id target_id, location_id FROM volunteer_opportunities) o ON o.location_id = l.id LEFT JOIN interactions i ON i.target_id = o.target_id GROUP BY l.municipality, l.district ORDER BY total DESC, l.municipality ASC`).all().map((row) => ({ municipality: String(row.municipality), district: String(row.district), total: Number(row.total) }));
  const categories = db.prepare(`SELECT 'formal' front, category, COUNT(*) total FROM formal_opportunities GROUP BY category UNION ALL SELECT 'service' front, category, COUNT(*) total FROM service_offers GROUP BY category UNION ALL SELECT 'volunteer' front, category, COUNT(*) total FROM volunteer_opportunities GROUP BY category ORDER BY front, category`).all().map((row) => ({ front: String(row.front), category: String(row.category), total: Number(row.total) }));
  const employmentByRegion = db.prepare(`SELECT l.municipality, l.district, o.employment_type, COUNT(*) total FROM formal_opportunities o JOIN locations l ON l.id = o.location_id GROUP BY l.municipality, l.district, o.employment_type ORDER BY l.municipality, l.district, o.employment_type`).all().map((row) => ({ municipality: String(row.municipality), district: String(row.district), employmentType: String(row.employment_type) as FormalEmploymentType, total: Number(row.total) }));
  return { fronts: [{ key: "formal", label: "Trabalho formal", total: formal }, { key: "service", label: "Serviços autônomos", total: service }, { key: "volunteer", label: "Voluntariado", total: volunteer }], totalOpportunities: formal + service + volunteer, interactions, territorial, categories, employmentByRegion };
}

function emptyInterestTerritoryData(activities: string[]) {
  return {
    scope: "interests" as const,
    activities,
    matchedOpportunityCount: 0,
    fronts: [{ key: "formal", label: "Trabalho formal", total: 0 }, { key: "service", label: "Serviços autônomos", total: 0 }, { key: "volunteer", label: "Voluntariado", total: 0 }],
    totalOpportunities: 0,
    interactions: 0,
    territorial: [] as { municipality: string; district: string; total: number }[],
    categories: [] as { front: string; category: string; total: number }[],
    employmentByRegion: [] as { municipality: string; district: string; employmentType: FormalEmploymentType; total: number }[],
  };
}

export function interestTerritoryData(activities: string[]) {
  const normalized = Array.from(new Set(activities.map((activity) => activity.trim()).filter(Boolean)));
  if (!normalized.length) return emptyInterestTerritoryData(normalized);

  const placeholders = normalized.map(() => "?").join(", ");
  const db = database();
  const formal = db.prepare(`SELECT o.id, o.category, o.employment_type, l.municipality, l.district FROM formal_opportunities o JOIN locations l ON l.id = o.location_id WHERE o.category IN (${placeholders})`).all(...normalized);
  const serviceActivityClause = normalized.map(() => "(o.category = ? OR instr('|' || o.required_activities || '|', '|' || ? || '|') > 0)").join(" OR ");
  const serviceActivityParams = normalized.flatMap((activity) => [activity, activity]);
  const service = db.prepare(`SELECT o.id, o.category, l.municipality, l.district FROM service_offers o JOIN locations l ON l.id = o.location_id WHERE ${serviceActivityClause}`).all(...serviceActivityParams);
  type InterestMatch = Row & { front: string; targetType: string; id: string; category: string; municipality: string; district: string; employment_type?: string };
  const matches: InterestMatch[] = [...formal.map((row) => ({ ...row, front: "formal", targetType: "FORMAL" }) as InterestMatch), ...service.map((row) => ({ ...row, front: "service", targetType: "SERVICE" }) as InterestMatch)];
  const territorialMap = new Map<string, { municipality: string; district: string; total: number }>();
  const categoryMap = new Map<string, { front: string; category: string; total: number }>();
  const employmentMap = new Map<string, { municipality: string; district: string; employmentType: FormalEmploymentType; total: number }>();
  for (const match of matches) {
    const municipality = String(match.municipality);
    const district = String(match.district);
    const territoryKey = `${municipality}-${district}`;
    const territory = territorialMap.get(territoryKey) ?? { municipality, district, total: 0 };
    territory.total += 1;
    territorialMap.set(territoryKey, territory);
    const category = String(match.category);
    const categoryKey = `${match.front}-${category}`;
    const categoryValue = categoryMap.get(categoryKey) ?? { front: String(match.front), category, total: 0 };
    categoryValue.total += 1;
    categoryMap.set(categoryKey, categoryValue);
    if (match.front === "formal") {
      const employmentType = String(match.employment_type) as FormalEmploymentType;
      const employmentKey = `${territoryKey}-${employmentType}`;
      const employment = employmentMap.get(employmentKey) ?? { municipality, district, employmentType, total: 0 };
      employment.total += 1;
      employmentMap.set(employmentKey, employment);
    }
  }

  const formalIds = formal.map((row) => String(row.id));
  const serviceIds = service.map((row) => String(row.id));
  const interactionConditions: string[] = [];
  const interactionParams: string[] = [];
  if (formalIds.length) { interactionConditions.push(`(target_type = 'FORMAL' AND target_id IN (${formalIds.map(() => "?").join(", ")}))`); interactionParams.push(...formalIds); }
  if (serviceIds.length) { interactionConditions.push(`(target_type = 'SERVICE' AND target_id IN (${serviceIds.map(() => "?").join(", ")}))`); interactionParams.push(...serviceIds); }
  const interactions = interactionConditions.length ? Number(db.prepare(`SELECT COUNT(*) total FROM interactions WHERE ${interactionConditions.join(" OR ")}`).get(...interactionParams)?.total ?? 0) : 0;
  const fronts = [{ key: "formal", label: "Trabalho formal", total: formal.length }, { key: "service", label: "Serviços autônomos", total: service.length }, { key: "volunteer", label: "Voluntariado", total: 0 }];
  return { scope: "interests" as const, activities: normalized, matchedOpportunityCount: matches.length, fronts, totalOpportunities: matches.length, interactions, territorial: Array.from(territorialMap.values()).sort((a, b) => b.total - a.total || a.municipality.localeCompare(b.municipality)), categories: Array.from(categoryMap.values()).sort((a, b) => a.front.localeCompare(b.front) || a.category.localeCompare(b.category)), employmentByRegion: Array.from(employmentMap.values()).sort((a, b) => a.municipality.localeCompare(b.municipality) || a.district.localeCompare(b.district) || a.employmentType.localeCompare(b.employmentType)) };
}

export function territoryDataForProfile(profileId: string, activities: string[]) {
  const profile = database().prepare("SELECT type FROM profiles WHERE id = ?").get(profileId);
  if (!profile) return null;
  if (profile.type === "INSTITUTIONAL_ANALYST") return { scope: "general" as const, ...territoryData() };
  return interestTerritoryData(activities);
}

export function resetDatabase() { database().exec("DELETE FROM service_calls; DELETE FROM interactions; DELETE FROM formal_opportunities; DELETE FROM service_offers; DELETE FROM volunteer_opportunities; DELETE FROM profiles; DELETE FROM locations;"); }
export function seedRow(sql: string, ...params: string[]) { database().prepare(sql).run(...params); }
