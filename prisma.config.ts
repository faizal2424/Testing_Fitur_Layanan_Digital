import "dotenv/config";
import { defineConfig } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  datasource: {
    // Inilah yang dicari oleh Prisma CLI saat jalankan 'db pull'
    url: process.env.DATABASE_URL,
  },
});
