import 'reflect-metadata';
import * as path from 'path';
import * as dotenv from 'dotenv';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import { User, Team, TeamMember, TeamRole } from '@insightstream/database';
import { AppDataSource } from '../src/data-source';

/**
 * Seeds a known local login so `pnpm --filter api seed:test-user` gives you a
 * working account without going through the register flow. Idempotent: re-runs
 * just reset the password. Credentials come from apps/api/.env.seed (gitignored)
 * — copy .env.seed.example to get started.
 */

// AppDataSource already loads apps/api/.env on import; layer the seed creds on top.
dotenv.config({ path: path.resolve(__dirname, '../.env.seed') });

async function main() {
  const email = process.env.TEST_USER_EMAIL;
  const password = process.env.TEST_USER_PASSWORD;
  if (!email || !password) {
    throw new Error(
      'Missing TEST_USER_EMAIL / TEST_USER_PASSWORD. Copy apps/api/.env.seed.example ' +
        'to apps/api/.env.seed and fill them in.',
    );
  }

  await AppDataSource.initialize();
  try {
    const userRepo = AppDataSource.getRepository(User);
    const teamRepo = AppDataSource.getRepository(Team);
    const memberRepo = AppDataSource.getRepository(TeamMember);

    const passwordHash = await bcrypt.hash(password, 10);

    let user = await userRepo.findOne({ where: { email } });
    if (user) {
      user.passwordHash = passwordHash;
      await userRepo.save(user);
      console.log(`↻ Reset password for existing user ${email}`);
    } else {
      user = await userRepo.save(
        userRepo.create({ email, passwordHash, apiKey: crypto.randomUUID() }),
      );
      console.log(`+ Created user ${email}`);
    }

    // Mirror AuthService.register → ensurePersonalTeam: every user needs a team.
    const membership = await memberRepo.findOne({ where: { userId: user.id } });
    if (!membership) {
      const team = await teamRepo.save(
        teamRepo.create({
          name: `${email.split('@')[0]}'s Team`,
          ownerId: user.id,
        }),
      );
      await memberRepo.save(
        memberRepo.create({
          teamId: team.id,
          userId: user.id,
          role: TeamRole.OWNER,
        }),
      );
      console.log(`+ Created personal team "${team.name}"`);
    }

    console.log('\n✅ Test login ready:');
    console.log(`   email:    ${email}`);
    console.log(`   password: ${password}`);
  } finally {
    await AppDataSource.destroy();
  }
}

main().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
