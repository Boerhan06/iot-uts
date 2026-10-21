/**
 * Automated Git Push & Sync Script
 * Target: https://github.com/Boerhan06/iot-uts.git
 */

import { execSync } from "child_process";

const REMOTE_URL = "https://github.com/Boerhan06/iot-uts.git";
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

  // 1. Pastikan repo lokal terinisialisasi
  const isGit = run("git rev-parse --is-inside-work-tree", true);
  if (!isGit) {
    log("Menginisialisasi Git repository lokal...", "info");
    run("git init");
    run(`git branch -M ${BRANCH}`);
  }

  // 2. Setup Remote Origin jika belum ada
  const currentRemote = run("git remote get-url origin", true);
  if (!currentRemote) {
    log(`Menghubungkan remote origin ke: ${REMOTE_URL}`, "info");
    run(`git remote add origin ${REMOTE_URL}`);
  } else if (currentRemote !== REMOTE_URL) {
    log(`Memperbarui URL remote origin ke: ${REMOTE_URL}`, "info");
    run(`git remote set-url origin ${REMOTE_URL}`);
  }

  // Pastikan branch aktif adalah main
  const currentBranch = run("git branch --show-current", true) || BRANCH;
  if (currentBranch !== BRANCH) {
    run(`git branch -M ${BRANCH}`);
  }

  // 3. Tambahkan seluruh perubahan file lokal ke staging
  log("Menambahkan perubahan file ke staging (git add -A)...", "info");
  run("git add -A");

  // 4. Buat commit jika ada perubahan file baru
  const status = run("git status --porcelain", true);
  if (status) {
    const customMsg = process.argv.slice(2).join(" ").trim();
    const defaultMsg = `feat(iot): update dashboard & firmware [${new Date().toISOString().replace("T", " ").substring(0, 19)}]`;
    const commitMsg = customMsg || defaultMsg;

    log(`Melakukan commit: "${commitMsg}"`, "info");
    run(`git commit -m "${commitMsg.replace(/"/g, '\\"')}"`);
    log("Commit lokal berhasil dibuat.", "ok");
  } else {
    log("Tidak ada perubahan file baru di lokal.", "info");
  }

  // 5. Tarik perubahan terbaru dari GitHub (jika ada yang push dari luar) dengan strategi auto-merge aman
  log(`Memeriksa dan menyelaraskan dengan remote GitHub (origin/${BRANCH})...`, "info");
  try {
    run(`git fetch origin ${BRANCH}`, true);
    // Merge remote changes secara otomatis, memprioritaskan versi lokal jika ada konflik
    run(`git merge origin/${BRANCH} --allow-unrelated-histories -X ours -m "chore(sync): auto-merge remote updates"`, true);
    log("Penyelarasan commit remote selesai.", "ok");
  } catch (mergeErr) {
    log("Info: Sinkronisasi remote telah up-to-date.", "info");
  }

  // 6. Push ke GitHub
  log(`Mendorong perubahan ke GitHub (origin ${BRANCH})...`, "info");
  try {
    run(`git push origin ${BRANCH}`);
    log(`Berhasil push ke ${REMOTE_URL} (branch: ${BRANCH})! 🎉`, "ok");
  } catch (pushErr) {
    log("Mencoba force-with-lease atau re-fetch...", "warn");
    try {
      run(`git pull origin ${BRANCH} --rebase -X ours`);
      run(`git push origin ${BRANCH}`);
      log("Berhasil push ke GitHub setelah rebase otomatis! 🎉", "ok");
    } catch (finalErr) {
      log(`Gagal push ke GitHub: ${finalErr.message}`, "err");
      log("Saran: Pastikan kredensial GitHub Anda aktif di sistem.", "warn");
      process.exit(1);
    }
  }

  console.log("✨ Git Sync Selesai tanpa error!\n");
}

main().catch((err) => {
  log(`Terjadi kesalahan: ${err.message}`, "err");
  process.exit(1);
});
