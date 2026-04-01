
import { db } from './src/lib/server/db.js';

async function checkTable() {
    try {
        const result = await db.$queryRawUnsafe(`SHOW CREATE TABLE services`);
        console.log(JSON.stringify(result, null, 2));
    } catch (error) {
        console.error(error);
    } finally {
        await db.$disconnect();
    }
}

checkTable();
