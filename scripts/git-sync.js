/**
 * Automated Git Sync Script
 * Repository: https://github.com/elmoerasmo/Machine-Fault-UTS-IoT.git
 */

import { execSync } from "child_process";

const REMOTE_URL = "https://github.com/elmoerasmo/Machine-Fault-UTS-IoT.git";
const BRANCH = "main";

function run(command, allowFail = false) {
  try {
    return execSync(command, { stdio: "pipe", encoding: "utf-8" }).trim();
  } catch (err) {
    if (allowFail) return null;
    throw err;
  }
}

function log(msg, type = "info") {
  const icons = { info: "ℹ️", ok: "✅", warn: "⚠️", err: "❌" };
  console.log(`${icons[type] || "•"} ${msg}`);
}

async function main() {
  console.log("\n🚀 Memulai otomatisasi Git Push & Sync...");

  // 1. Inisialisasi Git jika belum ada
  const isGit = run("git rev-parse --is-inside-work-tree", true);
  if (!isGit) {
    log("Menginisialisasi Git repository lokal...", "info");
    run("git init");
    run(`git branch -M ${BRANCH}`);
  }

  // 2. Setup Remote Origin
  const currentRemote = run("git remote get-url origin", true);
  if (!currentRemote) {
    log(`Menghubungkan remote origin ke: ${REMOTE_URL}`, "info");
    run(`git remote add origin ${REMOTE_URL}`);
  } else if (currentRemote !== REMOTE_URL) {
    log(`Memperbarui URL remote origin ke: ${REMOTE_URL}`, "info");
    run(`git remote set-url origin ${REMOTE_URL}`);
  }

  // Pastikan branch saat ini adalah 'main'
  const currentBranch = run("git branch --show-current", true) || BRANCH;
  if (currentBranch !== BRANCH) {
    run(`git branch -M ${BRANCH}`);
  }

  // 3. Tarik perubahan terbaru dari GitHub (jika ada) untuk mencegah error non-fast-forward
  log(`Memeriksa perubahan terbaru dari GitHub (origin/${BRANCH})...`, "info");
  try {
    run(`git fetch origin ${BRANCH}`, true);
    // Coba rebase perubahan dari remote jika ada commit di remote
    run(`git pull --rebase origin ${BRANCH}`, true);
    log("Sinkronisasi commit remote berhasil.", "ok");
  } catch {
    log("Tidak ada perubahan baru di remote atau repo masih kosong.", "info");
  }

  // 4. Tambahkan seluruh perubahan file ke staging
  log("Menambahkan perubahan file ke staging (git add -A)...", "info");
  run("git add -A");

  // 5. Cek apakah ada perubahan yang perlu di-commit
  const status = run("git status --porcelain", true);
  if (!status) {
    log("Tidak ada perubahan baru untuk di-commit.", "warn");
  } else {
    // Ambil pesan commit dari argumen CLI jika ada (misal: npm run git -- "pesan commit")
    const customMsg = process.argv.slice(2).join(" ").trim();
    const defaultMsg = `feat(iot): sync spindle monitoring dashboard & firmware [${new Date().toISOString().replace("T", " ").substring(0, 19)}]`;
    const commitMsg = customMsg || defaultMsg;

    log(`Melakukan commit: "${commitMsg}"`, "info");
    run(`git commit -m "${commitMsg.replace(/"/g, '\\"')}"`);
    log("Commit berhasil dibuat.", "ok");
  }

  // 6. Push ke GitHub
  log(`Mendorong perubahan ke GitHub (origin ${BRANCH})...`, "info");
  try {
    run(`git push -u origin ${BRANCH}`);
    log(`Berhasil push ke ${REMOTE_URL} (branch: ${BRANCH})! 🎉`, "ok");
  } catch (pushErr) {
    log("Push awal gagal. Mencoba sinkronisasi konflik rebase...", "warn");
    try {
      run(`git pull --rebase origin ${BRANCH}`);
      run(`git push -u origin ${BRANCH}`);
      log("Berhasil push setelah rebase otomatis! 🎉", "ok");
    } catch (finalErr) {
      log(`Gagal push ke GitHub: ${finalErr.message}`, "err");
      log("Saran: Pastikan Anda memiliki akses push ke repositori tersebut atau token autentikasi GitHub aktif.", "warn");
      process.exit(1);
    }
  }

  console.log("✨ Selesai!\n");
}

main().catch((err) => {
  log(`Terjadi kesalahan: ${err.message}`, "err");
  process.exit(1);
});
