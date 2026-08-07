import { eq } from 'drizzle-orm';
import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import { users, platinadorSubscriptions } from './drizzle/schema.js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

async function run() {
  try {
    const sql = neon(process.env.DATABASE_URL!);
    const db = drizzle(sql);

    const email = 'luanmnogueira@gmail.com';
    const userResult = await db.select().from(users).where(eq(users.email, email)).limit(1);

    if (userResult.length === 0) {
      console.log('User not found.');
      process.exit(1);
    }
    
    const userId = userResult[0].id;
    console.log('Found user ID:', userId);

    const existingSub = await db.select().from(platinadorSubscriptions).where(eq(platinadorSubscriptions.userId, userId)).limit(1);

    const now = new Date();
    const expiresAt = new Date();
    expiresAt.setMonth(expiresAt.getMonth() + 1);

    if (existingSub.length > 0) {
      await db.update(platinadorSubscriptions).set({
        status: 'ativa',
        startsAt: now,
        expiresAt: expiresAt
      }).where(eq(platinadorSubscriptions.id, existingSub[0].id));
      console.log('Subscription updated successfully.');
    } else {
      await db.insert(platinadorSubscriptions).values({
        userId,
        status: 'ativa',
        planName: 'Clube Platinador VIP',
        price: '35.00',
        startsAt: now,
        expiresAt: expiresAt,
        paymentId: 'MANUAL_ACTIVATION'
      });
      console.log('Subscription created successfully.');
    }
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

run();
