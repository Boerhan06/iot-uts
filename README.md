# Industrial Spindle Monitor #06 (UTS IoT - Topik 6)

**Sistem Monitoring Kondisi Mesin dengan Proteksi Operasi & Interlock Keselamatan**

Proyek ini dirancang untuk memenuhi **6 Persyaratan Teknis** dan **5 Skenario Pengujian** pada Panduan Tugas Mini Project UTS Internet of Things (ITO).

---

## 1. Arsitektur Sistem & Tech Stack

```
[Fenomena Fisik] (Getaran Spindle Mesin & Pemanasan Bantalan)
       │
[Sensor Virtual Wokwi] (MPU6050 via I2C + DHT22 Suhu + Push Button Start/Stop)
       │
[Mikrokontroler] (ESP32 DevKit V1 - Non-blocking loop millis(), State Machine 4 Status)
       │
[Jaringan] (Wi-Fi virtual Wokwi-GUEST)
       │
[Protokol] (Firebase REST API berbasis HTTPS: PUT, GET, POST)
       │
[Cloud Database] (Firebase Realtime Database - Node /machine_monitor)
       │
[Web Dashboard] (Single-Page HTML + Vanilla ES6 JS + Tailwind CSS CDN)
       │
[Aktuator Representasi] (LED Hijau Motor Relai + Buzzer Sirene Alarm)
```

### Keunggulan Tech Stack Dashboard:

- **Framework Modern:** React 18 + TypeScript + Vite + Tailwind CSS + Framer Motion ("Farmer UI").
- **Desain Industrial Premium (Peymen Inspired):** Card-based dashboard dengan sidebar terstruktur, visualisasi kartu virtual spindle, kurva spline telemetri real-time, dan radial health gauge.
- **Dua Mode Operasi Dashboard:**
  1. **Mode Terhubung Firebase:** Terhubung ke Firebase Realtime Database via modular SDK.
  2. **Mode Simulator Bawaan:** Memiliki mock simulator internal untuk preview dan latihan sebelum demo tanpa perlu internet.

---

## 2. Struktur Node Firebase Realtime Database

Pastikan Firebase Realtime Database Anda memiliki struktur node berikut:

```json
{
  "machine_monitor": {
    "telemetry": {
      "temperature": 42.5,
      "vibration_g": 0.85,
      "state": "IDLE",
      "motor_led": false,
      "buzzer": false,
      "fault_duration_sec": 0.0,
      "timestamp": 1761118800
    },
    "controls": {
      "mode": "AUTO",
      "command": "NONE",
      "temp_warn_limit": 70.0,
      "temp_trip_limit": 85.0,
      "temp_hysteresis": 3.0,
      "vib_warn_limit": 2.5,
      "vib_trip_limit": 4.0,
      "fault_time_limit_sec": 5,
      "fault_sensor_corrupt": false,
      "fault_firebase_offline": false
    },
    "event_logs": {
      "-O9xabc123": {
        "timestamp": "14:02:10",
        "type": "STATE",
        "message": "IDLE -> NORMAL (Motor dinyalakan berhasil)"
      }
    }
  }
}
```

### Firebase Security Rules:

Untuk pengujian Wokwi, gunakan rules:

```json
{
  "rules": {
    ".read": true,
    ".write": true
  }
}
```

---

## 3. Cara Menjalankan

### A. Menjalankan Dashboard (React + TypeScript + Framer Motion)

1. Jalankan development server di terminal:
   ```bash
   npm run dev
   ```
2. Buka browser di [http://localhost:5173/](http://localhost:5173/).
3. Klik ikon gear **⚙️ (Settings)** di header kanan:
   - Masukkan **Database URL** Firebase Anda (misal `https://<project-id>-default-rtdb.firebaseio.com`).
   - Atau klik **🧪 Mode Mock** untuk menguji coba kontrol dan interlock langsung di browser tanpa koneksi internet.

### B. Menjalankan Simulasi di Wokwi

1. Buka [https://wokwi.com](https://wokwi.com) dan buat project baru **ESP32**.
2. Salin isi file:
   - `wokwi/sketch.ino` ke tab code `sketch.ino`.
   - `wokwi/diagram.json` ke tab `diagram.json`.
   - `wokwi/libraries.txt` ke tab `libraries.txt`.
3. Buka `sketch.ino` di Wokwi dan sesuaikan variabel:
   ```cpp
   String FIREBASE_HOST = "https://<your-project-id>-default-rtdb.firebaseio.com";
   ```
4. Klik tombol **Play (Start Simulation)** di Wokwi.

---

## 4. Panduan Video Demo (5 Skenario Pengujian)

| Skenario                                                        | Aksi Pengujian                                                                                                                                           | Hasil yang Harus Ditunjukkan di Video & Log                                                                                                                                             |
| --------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **1. Operasi Normal**                                           | Klik tombol `START MOTOR` di Dashboard atau tombol fisik di Wokwi.                                                                                       | State Machine berpindah dari `IDLE` ke `NORMAL`. LED Motor menyala hijau, buzzer mati.                                                                                                  |
| **2. Nilai di Sekitar Ambang (Hysteresis)**                     | Geser slider suhu DHT22 di Wokwi melewati batas warning (misal 72°C). Kemudian turunkan ke 69°C (belum di bawah hysteresis 67°C), lalu turunkan ke 65°C. | Pada 72°C masuk `WARNING`. Pada 69°C **tidak langsung normal** (mencegah _chattering_). Hanya kembali ke `NORMAL` setelah suhu turun di bawah 67°C.                                     |
| **3. Perintah Manual Bertentangan dengan Proteksi (Interlock)** | Saat status mesin sedang `TRIP` atau suhu masih panas (> 67°C), klik tombol `START MOTOR` manual di Dashboard.                                           | Perintah **ditolak oleh ESP32**. Banner penolakan muncul di Dashboard, dan tercatat di Event Log: `INTERLOCK_REJECT: Perintah START ditolak!`.                                          |
| **4. Data Sensor Tidak Valid**                                  | Klik tombol **Fault Injection #1 (Sensor Rusak)** di Dashboard atau simulasi nilai NaN.                                                                  | ESP32 mendeteksi anomali, sistem langsung masuk **Safe State (`TRIP`)**, motor otomatis dimatikan, dan buzzer aktif.                                                                    |
| **5. Komunikasi Jaringan Gagal**                                | Klik tombol **Fault Injection #2 (Jaringan Putus)** di Dashboard.                                                                                        | Indikator koneksi menampilkan status `FIREBASE_FAIL / TIMEOUT`. Namun **kontrol lokal ESP32 tetap responsif**, tombol fisik tetap bekerja, dan loop utama tidak macet (_non-blocking_). |
