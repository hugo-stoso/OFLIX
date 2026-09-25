import { mkdirSync } from "node:fs";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";
import type { OpportunityKind } from "@/lib/domain";

export type Location = { id: string; state: string; municipality: string; district: string };
export type Profile = { id: string; name: string; type: "PERSON" | "ORGANIZATION" | "INSTITUTIONAL_ANALYST"; summary: string; capabilities: string; isDemo: boolean; location: Location };
export type Opportunity = { id: string; title: string; description: string; category: string; kind: OpportunityKind; owner: { id: string; name: string }; location: Location; availability?: string; schedule?: string };

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
    ["profile-ana", "Ana Ribeiro", "PERSON", "Pessoa em busca de oportunidades e conexões locais.", "Candidata formal · Voluntária", "loc-aracaju-centro"],
    ["profile-coletivo", "Coletivo Horizonte (demonstração)", "ORGANIZATION", "Organização fictícia para demonstrar publicação de oportunidades.", "Empresa · Ações comunitárias", "loc-aracaju-sao-jose"],
    ["profile-instituto", "Instituto Ponte Aberta (demonstração)", "ORGANIZATION", "Organização fictícia com atuação em desenvolvimento territorial.", "Organização sem fins lucrativos · Voluntariado", "loc-lagarto-cidade-nova"],
    ["profile-rafael", "Rafael Santos (demonstração)", "PERSON", "Profissional autônomo que atende demandas residenciais.", "Manutenção residencial · Serviços autônomos", "loc-lagarto-centro"],
    ["profile-analista", "Observatório Território Aberto (demonstração)", "INSTITUTIONAL_ANALYST", "Persona fictícia para leitura agregada do território.", "Inteligência territorial · Análise agregada", "loc-aracaju-centro"],
  ];
  for (const row of profiles) insert("INSERT INTO profiles (id, name, type, summary, capabilities, location_id) VALUES (?, ?, ?, ?, ?, ?)", ...row);

  insert("INSERT INTO formal_opportunities (id, title, description, category, organization_id, location_id) VALUES (?, ?, ?, ?, ?, ?)", "formal-operations", "Assistente de operações locais", "Apoio à organização de rotas, estoque e relacionamento com parceiros do território.", "Operações", "profile-coletivo", "loc-aracaju-centro");
  insert("INSERT INTO formal_opportunities (id, title, description, category, organization_id, location_id) VALUES (?, ?, ?, ?, ?, ?)", "formal-attendance", "Técnico de atendimento", "Atendimento presencial e remoto para uma rede de serviços em expansão.", "Atendimento", "profile-coletivo", "loc-socorro-taicoca");
  insert("INSERT INTO service_offers (id, title, description, category, provider_id, location_id, availability) VALUES (?, ?, ?, ?, ?, ?, ?)", "service-maintenance", "Manutenção residencial", "Pequenos reparos elétricos, hidráulicos e ajustes de rotina em residências.", "Manutenção", "profile-rafael", "loc-lagarto-centro", "Agenda combinada pelo território");
  insert("INSERT INTO service_offers (id, title, description, category, provider_id, location_id, availability) VALUES (?, ?, ?, ?, ?, ?, ?)", "service-design", "Design e conteúdo local", "Identidade visual simples e peças digitais para pequenos negócios e iniciativas locais.", "Comunicação", "profile-coletivo", "loc-aracaju-sao-jose", "Atendimento remoto ou em Aracaju");
  insert("INSERT INTO volunteer_opportunities (id, title, description, category, organizer_id, location_id, schedule) VALUES (?, ?, ?, ?, ?, ?, ?)", "volunteer-reading", "Mutirão de leitura comunitária", "Encontros de leitura para crianças e adolescentes em um espaço comunitário do bairro.", "Educação", "profile-instituto", "loc-aracaju-bugio", "Sábados, pela manhã");
  insert("INSERT INTO volunteer_opportunities (id, title, description, category, organizer_id, location_id, schedule) VALUES (?, ?, ?, ?, ?, ?, ?)", "volunteer-health", "Apoio à feira de saúde", "Recepção e organização de fluxo em uma ação comunitária de orientação e prevenção.", "Saúde", "profile-instituto", "loc-lagarto-cidade-nova", "Uma manhã, com escala prévia");
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
      CREATE TABLE IF NOT EXISTS profiles (id TEXT PRIMARY KEY, name TEXT NOT NULL, type TEXT NOT NULL, summary TEXT NOT NULL, capabilities TEXT NOT NULL, is_demo INTEGER NOT NULL DEFAULT 1, location_id TEXT NOT NULL REFERENCES locations(id));
      CREATE TABLE IF NOT EXISTS formal_opportunities (id TEXT PRIMARY KEY, title TEXT NOT NULL, description TEXT NOT NULL, category TEXT NOT NULL, organization_id TEXT NOT NULL REFERENCES profiles(id), location_id TEXT NOT NULL REFERENCES locations(id), status TEXT NOT NULL DEFAULT 'OPEN');
      CREATE TABLE IF NOT EXISTS service_offers (id TEXT PRIMARY KEY, title TEXT NOT NULL, description TEXT NOT NULL, category TEXT NOT NULL, provider_id TEXT NOT NULL REFERENCES profiles(id), location_id TEXT NOT NULL REFERENCES locations(id), availability TEXT NOT NULL);
      CREATE TABLE IF NOT EXISTS volunteer_opportunities (id TEXT PRIMARY KEY, title TEXT NOT NULL, description TEXT NOT NULL, category TEXT NOT NULL, organizer_id TEXT NOT NULL REFERENCES profiles(id), location_id TEXT NOT NULL REFERENCES locations(id), schedule TEXT NOT NULL);
      CREATE TABLE IF NOT EXISTS interactions (id TEXT PRIMARY KEY, actor_profile_id TEXT NOT NULL REFERENCES profiles(id), target_type TEXT NOT NULL, target_id TEXT NOT NULL, action TEXT NOT NULL, created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP, UNIQUE(actor_profile_id, target_type, target_id));
      CREATE INDEX IF NOT EXISTS idx_profiles_type ON profiles(type);
      CREATE INDEX IF NOT EXISTS idx_interactions_target ON interactions(target_type, target_id);
    `);
    globalForDb.oflixInitialized = true;
    seedDemoData(db);
  }
  return db;
}

export function ensureDatabase() { return database(); }
function locationFrom(row: Row): Location { return { id: String(row.location_id), state: String(row.state), municipality: String(row.municipality), district: String(row.district) }; }
function profileFrom(row: Row): Profile { return { id: String(row.id), name: String(row.name), type: String(row.type) as Profile["type"], summary: String(row.summary), capabilities: String(row.capabilities), isDemo: Boolean(row.is_demo), location: locationFrom(row) }; }
const profileSelect = `SELECT p.id, p.name, p.type, p.summary, p.capabilities, p.is_demo, l.id AS location_id, l.state, l.municipality, l.district FROM profiles p JOIN locations l ON l.id = p.location_id`;

export function listProfiles() { return database().prepare(`${profileSelect} ORDER BY p.type, p.name`).all().map(profileFrom); }

function opportunityFrom(row: Row, kind: OpportunityKind): Opportunity {
  return { id: String(row.id), title: String(row.title), description: String(row.description), category: String(row.category), kind, owner: { id: String(row.owner_id), name: String(row.owner_name) }, location: locationFrom(row), ...(row.availability ? { availability: String(row.availability) } : {}), ...(row.schedule ? { schedule: String(row.schedule) } : {}) };
}
const joinedLocation = `JOIN locations l ON l.id = o.location_id`;
export function listOpportunities() {
  const db = database();
  const formal = db.prepare(`SELECT o.*, p.id owner_id, p.name owner_name, l.id location_id, l.state, l.municipality, l.district FROM formal_opportunities o JOIN profiles p ON p.id = o.organization_id ${joinedLocation} ORDER BY o.rowid`).all().map((row) => opportunityFrom(row, "formal"));
  const service = db.prepare(`SELECT o.*, p.id owner_id, p.name owner_name, l.id location_id, l.state, l.municipality, l.district FROM service_offers o JOIN profiles p ON p.id = o.provider_id ${joinedLocation} ORDER BY o.rowid`).all().map((row) => opportunityFrom(row, "service"));
  const volunteer = db.prepare(`SELECT o.*, p.id owner_id, p.name owner_name, l.id location_id, l.state, l.municipality, l.district FROM volunteer_opportunities o JOIN profiles p ON p.id = o.organizer_id ${joinedLocation} ORDER BY o.rowid`).all().map((row) => opportunityFrom(row, "volunteer"));
  return { formal, service, volunteer };
}

export function findOpportunity(id: string, kind: OpportunityKind) {
  const table = kind === "formal" ? "formal_opportunities" : kind === "service" ? "service_offers" : "volunteer_opportunities";
  const ownerField = kind === "formal" ? "organization_id" : kind === "service" ? "provider_id" : "organizer_id";
  const row = database().prepare(`SELECT o.*, p.id owner_id, p.name owner_name, l.id location_id, l.state, l.municipality, l.district FROM ${table} o JOIN profiles p ON p.id = o.${ownerField} ${joinedLocation} WHERE o.id = ?`).get(id);
  return row ? opportunityFrom(row, kind) : null;
}

export function createInteraction(input: { actorProfileId: string; targetType: string; targetId: string; action: string }) {
  try {
    database().prepare("INSERT INTO interactions (id, actor_profile_id, target_type, target_id, action) VALUES (?, ?, ?, ?, ?)").run(`interaction-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`, input.actorProfileId, input.targetType, input.targetId, input.action);
    return { duplicate: false };
  } catch (error) {
    if (String(error).includes("UNIQUE constraint failed")) return { duplicate: true };
    throw error;
  }
}

export function territoryData() {
  const db = database();
  const count = (table: string) => Number(db.prepare(`SELECT COUNT(*) total FROM ${table}`).get()?.total ?? 0);
  const formal = count("formal_opportunities"); const service = count("service_offers"); const volunteer = count("volunteer_opportunities"); const interactions = count("interactions");
  const territorial = db.prepare(`SELECT l.municipality, l.district, COUNT(i.id) total FROM locations l JOIN (SELECT id target_id, location_id FROM formal_opportunities UNION ALL SELECT id target_id, location_id FROM service_offers UNION ALL SELECT id target_id, location_id FROM volunteer_opportunities) o ON o.location_id = l.id LEFT JOIN interactions i ON i.target_id = o.target_id GROUP BY l.municipality, l.district ORDER BY total DESC, l.municipality ASC`).all().map((row) => ({ municipality: String(row.municipality), district: String(row.district), total: Number(row.total) }));
  const categories = db.prepare(`SELECT 'formal' front, category, COUNT(*) total FROM formal_opportunities GROUP BY category UNION ALL SELECT 'service' front, category, COUNT(*) total FROM service_offers GROUP BY category UNION ALL SELECT 'volunteer' front, category, COUNT(*) total FROM volunteer_opportunities GROUP BY category ORDER BY front, category`).all().map((row) => ({ front: String(row.front), category: String(row.category), total: Number(row.total) }));
  return { fronts: [{ key: "formal", label: "Trabalho formal", total: formal }, { key: "service", label: "Serviços autônomos", total: service }, { key: "volunteer", label: "Voluntariado", total: volunteer }], totalOpportunities: formal + service + volunteer, interactions, territorial, categories };
}

export function resetDatabase() { database().exec("DELETE FROM interactions; DELETE FROM formal_opportunities; DELETE FROM service_offers; DELETE FROM volunteer_opportunities; DELETE FROM profiles; DELETE FROM locations;"); }
export function seedRow(sql: string, ...params: string[]) { database().prepare(sql).run(...params); }
