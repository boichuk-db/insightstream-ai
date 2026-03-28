import "reflect-metadata";
import { AppDataSource } from "./data-source";

async function testConnection() {
  try {
    console.log("⏳ Підключення до бази даних (PostgreSQL)...");

    await AppDataSource.initialize();
    console.log(
      "✅ Успіх! База даних підключена, таблиці (User, Feedback, AuditLog) синхронізовані!",
    );

    const userRepository = AppDataSource.getRepository("User");

    const existing = await userRepository.findOne({
      where: { email: "test@example.com" },
    });
    if (existing) {
      await userRepository.remove(existing);
    }

    const newUser = userRepository.create({
      email: "test@example.com",
      passwordHash: "fake_hash_123",
    });

    await userRepository.save(newUser);
    console.log(
      `✅ Тестового користувача успішно збережено в БД з ID: ${newUser.id}`,
    );
  } catch (error) {
    console.error("❌ Помилка підключення до БД:", error);
  } finally {
    if (AppDataSource.isInitialized) {
      await AppDataSource.destroy();
      console.log("🔌 Відключено від бази.");
    }
  }
}

testConnection();
