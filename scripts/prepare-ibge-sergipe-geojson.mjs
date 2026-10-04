import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const sourceDirectory = process.argv[2];
const outputFile = process.argv[3] ?? path.resolve("public/geo/sergipe-municipalities-2024.geojson");
const tolerance = Number(process.argv[4] ?? "0.001");

if (!sourceDirectory) {
  throw new Error("Uso: node scripts/prepare-ibge-sergipe-geojson.mjs <diretorio-do-shapefile> [saida] [tolerancia]");
}

const shp = await readFile(path.join(sourceDirectory, "SE_Municipios_2024.shp"));
const dbf = await readFile(path.join(sourceDirectory, "SE_Municipios_2024.dbf"));

function parseDbf(buffer) {
  const headerLength = buffer.readUInt16LE(8);
  const recordLength = buffer.readUInt16LE(10);
  const recordCount = buffer.readUInt32LE(4);
  const fields = [];
  for (let offset = 32; offset < headerLength - 1; offset += 32) {
    const name = buffer.subarray(offset, offset + 11).toString("ascii").replace(/\0/g, "").trim();
    if (name) fields.push({ name, length: buffer[offset + 16] });
  }
  return Array.from({ length: recordCount }, (_, index) => {
    const recordOffset = headerLength + index * recordLength;
    let fieldOffset = recordOffset + 1;
    const record = {};
    for (const field of fields) {
      record[field.name] = buffer.subarray(fieldOffset, fieldOffset + field.length).toString("latin1").trim();
      fieldOffset += field.length;
    }
    return record;
  });
}

function simplifyRing(points, epsilon) {
  if (points.length <= 4) return points;
  const open = points.slice(0, -1);
  const squaredEpsilon = epsilon ** 2;

  function distanceSquared(point, start, end) {
    const x = start[0];
    const y = start[1];
    const dx = end[0] - x;
    const dy = end[1] - y;
    if (dx !== 0 || dy !== 0) {
      const t = ((point[0] - x) * dx + (point[1] - y) * dy) / (dx * dx + dy * dy);
      if (t > 1) {
        return (point[0] - end[0]) ** 2 + (point[1] - end[1]) ** 2;
      }
      if (t > 0) {
        return (point[0] - (x + dx * t)) ** 2 + (point[1] - (y + dy * t)) ** 2;
      }
    }
    return (point[0] - x) ** 2 + (point[1] - y) ** 2;
  }

  function simplify(start, end, result) {
    let maxDistance = squaredEpsilon;
    let index = -1;
    for (let i = start + 1; i < end; i += 1) {
      const distance = distanceSquared(open[i], open[start], open[end]);
      if (distance > maxDistance) {
        index = i;
        maxDistance = distance;
      }
    }
    if (index !== -1) {
      simplify(start, index, result);
      result.push(open[index]);
      simplify(index, end, result);
    }
  }

  const result = [open[0]];
  simplify(0, open.length - 1, result);
  result.push(open[open.length - 1]);
  result.push(result[0]);
  return result;
}

function parsePolygonRecords(buffer, attributes) {
  const features = [];
  let offset = 100;
  let attributeIndex = 0;
  while (offset + 8 <= buffer.length) {
    const contentLength = buffer.readInt32BE(offset + 4) * 2;
    const contentStart = offset + 8;
    const shapeType = buffer.readInt32LE(contentStart);
    if (shapeType !== 5) throw new Error(`Tipo de geometria não suportado: ${shapeType}`);
    const partCount = buffer.readInt32LE(contentStart + 36);
    const pointCount = buffer.readInt32LE(contentStart + 40);
    const partsStart = contentStart + 44;
    const pointsStart = partsStart + partCount * 4;
    const partIndexes = Array.from({ length: partCount }, (_, index) => buffer.readInt32LE(partsStart + index * 4));
    const rings = [];
    for (let part = 0; part < partCount; part += 1) {
      const start = partIndexes[part];
      const end = part + 1 < partCount ? partIndexes[part + 1] : pointCount;
      const points = [];
      for (let point = start; point < end; point += 1) {
        const pointOffset = pointsStart + point * 16;
        points.push([Number(buffer.readDoubleLE(pointOffset).toFixed(6)), Number(buffer.readDoubleLE(pointOffset + 8).toFixed(6))]);
      }
      rings.push(simplifyRing(points, tolerance));
    }
    const attribute = attributes[attributeIndex];
    if (!attribute) throw new Error(`Registro DBF ausente para o município ${attributeIndex}`);
    features.push({
      type: "Feature",
      properties: { ibgeCode: attribute.CD_MUN, municipality: attribute.NM_MUN, state: attribute.SIGLA_UF ?? "SE" },
      geometry: { type: "MultiPolygon", coordinates: rings.map((ring) => [[...ring]]) },
    });
    attributeIndex += 1;
    offset = contentStart + contentLength;
  }
  return features;
}

const attributes = parseDbf(dbf);
const features = parsePolygonRecords(shp, attributes);
if (features.length !== attributes.length) throw new Error(`Geometrias (${features.length}) e atributos (${attributes.length}) divergentes`);
if (features.some((feature) => feature.properties.state !== "SE")) throw new Error("A malha contém uma UF diferente de SE");
const output = {
  type: "FeatureCollection",
  properties: { source: "IBGE Malha Municipal Digital", year: 2024, state: "SE", simplification: `RDP tolerance ${tolerance} degrees; source CRS SIRGAS 2000 geographic` },
  features,
};
await mkdir(path.dirname(outputFile), { recursive: true });
await writeFile(outputFile, `${JSON.stringify(output)}\n`, "utf8");
console.log(JSON.stringify({ outputFile, features: features.length, bytes: Buffer.byteLength(JSON.stringify(output)), tolerance }));
