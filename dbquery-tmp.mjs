import mysql from "mysql2/promise";
const conn = await mysql.createConnection(process.env.DATABASE_URL);
const [rows] = await conn.query(
  "SELECT id, status, stage, progressPct, errorCode, LEFT(errorMessage,150) AS err, sourceFileName, LEFT(sourceKey,90) AS srcKey, createdAt, updatedAt FROM convert_jobs ORDER BY id DESC LIMIT 10"
);
console.table(rows);
await conn.end();
