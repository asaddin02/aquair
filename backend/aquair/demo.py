"""Pembuat depot demo "Depot Tirta Sejahtera" per pengunjung (spesifikasi bagian 10).

Riwayat 30 hari yang berakhir hari ini dibuat dari penjualan contoh, lalu tanda Radar dihitung oleh
mesin aturan yang sama dengan depot sungguhan. Semua dokumen punya kedaluwarsa_at (TTL 24 jam).
"""
from __future__ import annotations

import hashlib
import math
import random
import secrets
from datetime import date, datetime, time, timedelta, timezone

from . import aturan as A
from .api_keuangan import NAMA_KATEGORI
from .inti import WIB, db, id_baru, sekarang, tanggal_wib
from .layanan import hitung_ulang
from .produk import muatan_awal

PUSAT = (-6.1754, 106.8272)  # titik pusat kelurahan fiktif
NAMA_TOKO = ["Toko Sumber Rejeki", "Toko Maju Jaya", "Warung Barokah", "Toko Sinar Harapan", "Toko Makmur", "Warung Pojok",
             "Toko Berkah Abadi", "Toko Tiga Saudara", "Warung Sederhana", "Toko Lancar", "Toko Rukun", "Warung Mekar",
             "Toko Mekar Sari", "Toko Harapan Baru", "Warung Sejahtera", "Toko Mulia", "Toko Sentosa", "Warung Kita",
             "Toko Amanah", "Toko Subur"]
NAMA_RUMAH = ["Bu Sari", "Pak Anton", "Bu Rina", "Pak Budi", "Bu Wati", "Pak Joko", "Bu Lina", "Pak Hendra", "Bu Yuni",
              "Pak Agus", "Bu Dewi", "Pak Slamet", "Bu Nur", "Pak Bambang", "Bu Tuti", "Pak Eko", "Bu Ratna", "Pak Hadi",
              "Bu Sri", "Pak Imam", "Bu Fitri", "Pak Rahmat", "Bu Indah", "Pak Yanto", "Bu Lestari", "Pak Darto", "Bu Ani",
              "Pak Wahyu", "Bu Endang", "Pak Gunawan"]
# Produk contoh selain isi ulang galon: (nama, kategori, satuan, harga rumah, harga toko, dijual kurir, dijual depot,
# pakai kosong, harga beli). Harga beli hanya untuk barang dagangan; isi wadah kecil diproduksi depot sendiri.
PRODUK_CONTOH = [("LPG 3 kg", "lpg", "tabung", 22000, 21000, True, False, True, 19500),
                 ("Air galon bermerek", "air_kemasan", "galon", 21000, None, True, False, True, 18000),
                 ("Isi wadah kecil", "wadah_kecil", "wadah", 2000, None, False, True, False, None)]
# Pengeluaran contoh: (kategori, keterangan, rupiah, hari ke-berapa dalam 30 hari, menit pencatatan).
PENGELUARAN_CONTOH = [("sewa", "Sewa tempat depot", 800_000, [2], 540),
                      ("listrik", "Tagihan listrik dan air", 485_000, [5], 600),
                      ("gaji", "Upah mingguan kurir", 500_000, [4, 11, 18, 25], 1020),
                      ("bahan", "Beli air baku satu tangki", 200_000, [1, 7, 13, 19, 24, 28], 480),
                      ("galon", "Beli galon kosong dan tutup", 600_000, [9], 555),
                      ("galon", "Tambah tutup dan tisu segel", 350_000, [21], 555),
                      ("perawatan", "Ganti filter sedimen", 350_000, [16], 630),
                      ("transport", "Isi bensin motor antar", 50_000, [0, 3, 6, 9, 12, 15, 18, 21, 24, 27], 450),
                      ("transport", "Isi bensin motor antar", 55_000, [29], 450)]
HARI_KURANG_SETOR_RUDI = {3, 8, 13, 17}
RUMAH_MACET = {12, 20, 40, 45}
RUMAH_BOLEH_BON = {0, 5, 9}


def titik(dx: float, dy: float) -> tuple[float, float]:
    lat = PUSAT[0] + dy / 111320
    return lat, PUSAT[1] + dx / (111320 * math.cos(math.radians(lat)))


def waktu(tanggal: str, menit: int) -> datetime:
    """Tanggal WIB + menit sejak tengah malam → datetime UTC."""
    return (datetime.combine(date.fromisoformat(tanggal), time(0), tzinfo=WIB) + timedelta(minutes=menit)).astimezone(timezone.utc)


class Pembuat:
    def __init__(self):
        self.rng = random.Random(secrets.randbits(32))
        self.kini = sekarang()
        self.hari_ini = tanggal_wib(self.kini)
        self.kedaluwarsa = self.kini + timedelta(hours=24)
        self.depot = {"_id": id_baru(), "nama": "Depot Tirta Sejahtera", "kota": "Kota contoh", "harga_toko": 3000,
                      "harga_rumah": 4000, "radius_m": 75, "garis_dasar_toko": 50, "kebijakan_tanpa_bukti": True,
                      "is_demo": True, "ringkasan_ai_sisa": 3, "created_at": self.kini, "kedaluwarsa_at": self.kedaluwarsa}
        self.tanda = {"depot_id": self.depot["_id"], "kedaluwarsa_at": self.kedaluwarsa}
        self.sales, self.trips, self.approvals, self.confirmations = [], [], [], []
        self.produk = [{"_id": id_baru(), "nama": n, "kategori": k, "satuan": sat, "harga_rumah": rumah, "harga_toko": toko,
                        "harga_beli": beli, "dijual_kurir": kurir, "dijual_depot": depot, "pakai_kosong": kosong, "aktif": True,
                        "created_at": self.kini, **self.tanda}
                       for n, k, sat, rumah, toko, kurir, depot, kosong, beli in PRODUK_CONTOH]
        self.lpg, self.bermerek, self.wadah = self.produk

    def t(self, i: int) -> str:
        return A.geser_tanggal(self.hari_ini, i - 29)

    # ------------------------------------------------------------ pengguna dan pelanggan
    def buat_pengguna(self):
        u = lambda nama, peran, **x: {"_id": id_baru(), "nama": nama, "peran": peran, "aktif": True, "gagal_masuk": 0,  # noqa: E731
                                        "created_at": self.kini, **self.tanda, **x}
        self.bos = u("Pemilik Depot", "bos")
        self.dimas = u("Dimas", "kurir", warna="dimas", no_hp_tampil="0812-xxxx-0101")
        self.rudi = u("Rudi", "kurir", warna="rudi", no_hp_tampil="0813-xxxx-0202")
        self.sigit = u("Sigit", "kurir", aktif=False, no_hp_tampil="0857-xxxx-0303")
        self.users = [self.bos, self.dimas, self.rudi, self.sigit]

    def buat_pelanggan(self):
        daftar = self.t(-1)
        self.toko, self.rumah = [], []
        for i, nama in enumerate(NAMA_TOKO):
            lat, lng = titik(self.rng.uniform(-1400, 1400), self.rng.uniform(-1400, 1400))
            kap, laku = self.rng.randint(8, 15), self.rng.randint(2, 4)
            if i == 0:
                kap, laku = 10, 2
            if i == 2:
                kap, laku = 12, 3
            self.toko.append({"_id": id_baru(), "jenis": "toko", "nama": nama, "no_wa": "", "lat": lat, "lng": lng, "kapasitas": kap,
                              "laku_per_hari": laku, "boleh_bon": False, "qr_token": secrets.token_urlsafe(24), "status": "aktif",
                              "saldo_galon": 0, "kosong_terakhir_at": None, "rute": "rudi" if i < 10 else "dimas",
                              "tanggal_daftar": daftar, "created_at": waktu(daftar, 480), **self.tanda})
        for i in range(60):
            lat, lng = titik(self.rng.uniform(-1500, 1500), self.rng.uniform(-1500, 1500))
            self.rumah.append({"_id": id_baru(), "jenis": "rumah", "nama": f"{NAMA_RUMAH[i % 30]} (No. {self.rng.randint(2, 88)})",
                               "no_wa": "", "lat": lat, "lng": lng, "kapasitas": None, "laku_per_hari": None,
                               "boleh_bon": i in RUMAH_BOLEH_BON, "qr_token": None, "status": "aktif", "saldo_galon": 0,
                               "kosong_terakhir_at": None, "rute": "rudi" if i < 30 else "dimas", "tanggal_daftar": daftar,
                               "created_at": waktu(daftar, 480), **self.tanda})
        self.id_macet = {self.rumah[i]["_id"] for i in RUMAH_MACET}

    # ------------------------------------------------------------ penjualan dan rit
    def jual(self, kurir, trip, tanggal, menit, c, galon, status, bayar="tunai", akurasi=15):
        depot = self.depot
        pertama = c["saldo_galon"] == 0 and c["kosong_terakhir_at"] is None
        if c["_id"] in self.id_macet or (pertama and c["jenis"] == "toko"):
            kosong = 0
        elif pertama:
            kosong = max(1, galon - 1) if galon >= 2 else galon
        else:
            kosong = galon
        lat = lng = jarak = None
        if status != A.TANPA_QR:
            dx, dy = self.rng.uniform(-10, 10), self.rng.uniform(-10, 10)
            if status == A.LOKASI_JAUH:
                dx += 1200
            dlat, dlng = dy / 111320, dx / (111320 * math.cos(math.radians(c["lat"])))
            lat, lng = c["lat"] + dlat, c["lng"] + dlng
            if c["jenis"] == "toko":
                jarak = round(A.jarak_m(lat, lng, c["lat"], c["lng"]))
        if status == A.LOKASI_LEMAH:
            akurasi = 140
        dibuat = waktu(tanggal, menit)
        c["saldo_galon"] = max(0, c["saldo_galon"] + galon - kosong)
        if kosong:
            c["kosong_terakhir_at"] = dibuat
        s = {"_id": id_baru(), "trip_id": trip["_id"], "kurir_id": kurir["_id"], "customer_id": c["_id"], "nama_pelanggan": c["nama"],
             "jenis": c["jenis"], "galon_isi": galon, "galon_kosong": kosong, "bayar": bayar, "lunas": bayar == "tunai",
             "harga_berlaku": A.harga_berlaku(c["jenis"], status, depot), "harga_toko": depot["harga_toko"],
             "harga_rumah": depot["harga_rumah"], "status_verifikasi": status, "lat": lat, "lng": lng,
             "akurasi_m": akurasi if lat is not None else None, "jarak_m": jarak, "qr_dipindai": status not in (A.TANPA_QR, A.RUMAH),
             "disimulasikan": True, "dicatat_offline": False, "client_id": None, "disetujui_bos": False,
             "created_at": dibuat, "urutan_at": dibuat, "tanggal": tanggal, **self.tanda}
        self.sales.append(s)
        return s

    def jual_produk(self, kurir, trip, tanggal, menit, c, p, jumlah, kosong):
        """Penjualan produk selain isi ulang galon ke rumah (tidak mengubah saldo galon pinjaman)."""
        harga, harga_toko, harga_rumah = A.harga_produk(c["jenis"], A.RUMAH, self.depot, p)
        dibuat = waktu(tanggal, menit)
        dx, dy = self.rng.uniform(-10, 10), self.rng.uniform(-10, 10)
        s = {"_id": id_baru(), "trip_id": trip["_id"], "kurir_id": kurir["_id"], "customer_id": c["_id"], "nama_pelanggan": c["nama"],
             "jenis": c["jenis"], "produk_id": p["_id"], "nama_produk": p["nama"], "satuan": p["satuan"], "galon_isi": jumlah,
             "galon_kosong": kosong if p["pakai_kosong"] else 0, "bayar": "tunai", "lunas": True, "harga_berlaku": harga,
             "harga_toko": harga_toko, "harga_rumah": harga_rumah, "harga_beli": p.get("harga_beli"), "status_verifikasi": A.RUMAH,
             "lat": c["lat"] + dy / 111320, "lng": c["lng"] + dx / (111320 * math.cos(math.radians(c["lat"]))), "akurasi_m": 15,
             "jarak_m": None, "qr_dipindai": False, "disimulasikan": True, "dicatat_offline": False, "client_id": None,
             "baris_ke": 0, "disetujui_bos": False, "created_at": dibuat, "urutan_at": dibuat, "tanggal": tanggal, **self.tanda}
        self.sales.append(s)
        return s

    def rit(self, kurir, i, rencana, *, disetor_fn=None, status="diterima", dibawa=40, isi_pulang=None, cek="06.40", lain=None,
            muatan_lain=None):
        """isi_pulang=None berarti galon pulang cocok dengan catatan (tanpa R7). lain = [(pelanggan, produk, jumlah, kosong)]."""
        tanggal = self.t(i)
        jam, menit = map(int, cek.split("."))
        dibawa = max(dibawa, sum(g for _, g, _, _ in rencana))
        trip = {"_id": id_baru(), "kurir_id": kurir["_id"], "dibawa": dibawa, "dibawa_kurir": dibawa, "muatan_dicek": True,
                "muatan_dicek_oleh": self.bos["_id"], "muatan_dicek_at": waktu(tanggal, jam * 60 + menit),
                "berangkat_at": waktu(tanggal, jam * 60 + menit - 10), "tanggal": tanggal, "status": status,
                "isi_pulang": None, "kosong_pulang": None, "uang_disetor": None, "selesai_at": None,
                "muatan_lain": [muatan_awal(p, n) for p, n in muatan_lain or []], **self.tanda}
        m = jam * 60 + menit + self.rng.randint(15, 25)
        penjualan = []
        self.rng.shuffle(rencana)
        for c, galon, st, bayar in rencana:
            penjualan.append(self.jual(kurir, trip, tanggal, m, c, galon, st, bayar))
            m += self.rng.randint(7, 16)
        for c, p, jumlah, kosong in lain or []:
            penjualan.append(self.jual_produk(kurir, trip, tanggal, m, c, p, jumlah, kosong))
            m += self.rng.randint(7, 16)
        if status != "aktif":
            for mm in trip["muatan_lain"]:
                milik = [s for s in penjualan if s.get("produk_id") == mm["produk_id"]]
                mm.update(isi_pulang=mm["dibawa"] - sum(s["galon_isi"] for s in milik),
                          kosong_pulang=sum(s["galon_kosong"] for s in milik) if mm["pakai_kosong"] else None)
            setoran = A.hitung_setoran(trip, penjualan)
            isi_pulang = dibawa - setoran["galon_catatan"] if isi_pulang is None else isi_pulang
            trip.update(isi_pulang=isi_pulang, kosong_pulang=setoran["kosong_catatan"],
                        uang_disetor=disetor_fn(penjualan, setoran) if disetor_fn else setoran["uang_seharusnya"],
                        selesai_at=waktu(tanggal, m + 20))
            trip.update(uang_seharusnya=setoran["uang_seharusnya"], selisih_uang=trip["uang_disetor"] - setoran["uang_seharusnya"],
                        selisih_galon=(dibawa - isi_pulang) - setoran["galon_catatan"])
        self.trips.append(trip)
        return trip, penjualan

    def pecah(self, total, kecil=1, besar=3):
        bagian = []
        while total > 0:
            g = min(total, self.rng.randint(kecil, besar))
            bagian.append(g)
            total -= g
        return bagian

    def bagi_toko_wajar(self, daftar_toko, galon):
        """Galon toko jujur dibagi tanpa melebihi laku per hari tiap toko, supaya tidak memicu R3."""
        hasil, urut = [], sorted(daftar_toko, key=lambda _: self.rng.random())
        sisa = galon
        while sisa > 0:
            for c in urut:
                if sisa <= 0:
                    break
                g = min(sisa, c["laku_per_hari"], self.rng.randint(1, 3))
                hasil.append((c, g))
                sisa -= g
        gabung = {}
        for c, g in hasil:
            gabung[c["_id"]] = (c, gabung.get(c["_id"], (c, 0))[1] + g)
        return [(c, g) for c, g in gabung.values()]

    def rumah_rute(self, kurir, i):
        awal = 0 if kurir is self.rudi else 30
        return [c for n, c in enumerate(self.rumah[awal:awal + 30], start=awal) if n not in RUMAH_MACET or i <= 12]

    def rencana_rumah(self, kurir, i, galon, bon=None):
        pool = self.rumah_rute(kurir, i)
        rencana = []
        if bon is not None:
            rencana.append((self.rumah[bon], 2, A.RUMAH, "bon"))
            galon -= 2
        for g in self.pecah(galon, 1, 2):
            rencana.append((self.rng.choice(pool), g, A.RUMAH, "tunai"))
        return rencana

    def hari_rudi(self, i):
        toko_rudi = self.toko[:10]
        bon = {23: 0, 25: 5, 27: 0, 28: 9}.get(i)
        if i < 20:
            toko = 36 + self.rng.randint(-1, 1)
            verif = 15 + self.rng.randint(-1, 1)
            jauh = 3 if i % 3 == 0 else 0
            rencana = [(self.toko[0], 5, A.TERVERIFIKASI, "tunai"), (self.toko[2], 6, A.TERVERIFIKASI, "tunai")]
            for g in self.pecah(verif - 11, 2, 2):
                rencana.append((self.rng.choice(toko_rudi[3:]), g, A.TERVERIFIKASI, "tunai"))
            if jauh:
                rencana.append((self.toko[1], jauh, A.LOKASI_JAUH, "tunai"))
            for g in self.pecah(toko - verif - jauh, 3, 4):
                rencana.append((self.rng.choice(toko_rudi[1:]), g, A.TANPA_QR, "tunai"))
            rencana += self.rencana_rumah(self.rudi, i, 40 - toko, bon)
            menurut_catatan = lambda ps, st: sum(s["galon_isi"] * (3000 if s["jenis"] == "toko" else 4000) for s in ps)  # noqa: E731
            self.rit(self.rudi, i, rencana, disetor_fn=menurut_catatan if i in HARI_KURANG_SETOR_RUDI else None, cek="07.05")
            return
        total = 40 + self.rng.randint(-2, 1)
        toko = round(total * 0.45) + self.rng.randint(-1, 1)
        rencana = []
        basah = 1 if i in (22, 26) else 0
        for c, g in self.bagi_toko_wajar(toko_rudi, toko - basah):
            rencana.append((c, g, A.TERVERIFIKASI, "tunai"))
        if basah:
            rencana.append((self.toko[4], 1, A.TANPA_QR, "tunai"))
        rencana += self.rencana_rumah(self.rudi, i, total - toko, bon)
        self.rit(self.rudi, i, rencana, cek="07.05")

    def hari_dimas(self, i, status="diterima"):
        toko_dimas = self.toko[10:]
        total = 39 if i == 11 else 40 + self.rng.randint(-1, 1)
        toko = round(total * 0.45) + self.rng.randint(-1, 1)
        lemah = 3 if i == 28 else 1 if i in (6, 15, 24) else 0
        rencana = [(c, g, A.TERVERIFIKASI, "tunai") for c, g in self.bagi_toko_wajar(toko_dimas, toko - lemah)]
        if lemah:
            rencana.append((self.toko[12], lemah, A.LOKASI_LEMAH, "tunai"))
        rencana += self.rencana_rumah(self.dimas, i, total - toko)
        lain = muatan = None
        if i == 29:
            pool = self.rumah_rute(self.dimas, i)
            lain = [(pool[3], self.lpg, 1, 1), (pool[8], self.lpg, 1, 1), (pool[14], self.bermerek, 1, 1)]
            muatan = [(self.lpg, 4), (self.bermerek, 2)]
        # Hari 11: satu galon pecah di jalan → stok berkurang 40, catatan 39 (R7, nanti ditandai aman).
        return self.rit(self.dimas, i, rencana, status=status, cek="06.30", isi_pulang=0 if i == 11 else None, lain=lain, muatan_lain=muatan)

    def hari_ini_rudi(self):
        toko = self.toko
        rencana = [(toko[3], 3, A.TERVERIFIKASI, "tunai"), (self.rumah[1], 2, A.RUMAH, "tunai"), (toko[4], 2, A.TERVERIFIKASI, "tunai"),
                   (self.rumah[2], 1, A.RUMAH, "tunai"), (toko[2], 2, A.TERVERIFIKASI, "tunai"), (self.rumah[3], 2, A.RUMAH, "tunai")]
        tanggal, m = self.hari_ini, 7 * 60 + 25
        trip = {"_id": id_baru(), "kurir_id": self.rudi["_id"], "dibawa": 40, "dibawa_kurir": 40, "muatan_dicek": True,
                "muatan_dicek_oleh": self.bos["_id"], "muatan_dicek_at": waktu(tanggal, 425), "berangkat_at": waktu(tanggal, 415),
                "tanggal": tanggal, "status": "aktif", "isi_pulang": None, "kosong_pulang": None, "uang_disetor": None,
                "selesai_at": None, "muatan_lain": [muatan_awal(self.lpg, 3), muatan_awal(self.bermerek, 2)], **self.tanda}
        for c, g, st, bayar in rencana:
            self.jual(self.rudi, trip, tanggal, m, c, g, st, bayar)
            m += self.rng.randint(9, 16)
        self.trips.append(trip)

    # ------------------------------------------------------------ persetujuan, konfirmasi, perawatan
    def persetujuan(self, rit_dimas_kemarin):
        kemarin = self.t(28)
        lemah = next(s for s in self.sales if s["trip_id"] == rit_dimas_kemarin["_id"] and s["status_verifikasi"] == A.LOKASI_LEMAH)
        rumah = next(s for s in self.sales if s["trip_id"] == rit_dimas_kemarin["_id"] and s["jenis"] == "rumah" and s["galon_isi"] >= 2)
        baru = {"_id": id_baru(), "jenis": "rumah", "nama": "Pak Joko (No. 41)", "no_wa": "", "lat": None, "lng": None, "kapasitas": None,
                "laku_per_hari": None, "boleh_bon": False, "qr_token": None, "status": "menunggu_persetujuan", "saldo_galon": 1,
                "kosong_terakhir_at": None, "rute": "rudi", "tanggal_daftar": kemarin, "created_at": waktu(kemarin, 612), **self.tanda}
        self.rumah.append(baru)
        a = lambda **x: {"_id": id_baru(), "status": "menunggu", "created_at": waktu(kemarin, 900), **self.tanda, **x}  # noqa: E731
        self.approvals += [
            a(jenis="pelanggan", kurir_id=self.rudi["_id"], customer_id=baru["_id"], sale_id=None, data={},
              alasan_kurir="Pembeli baru di rute timur."),
            a(jenis="harga", kurir_id=self.dimas["_id"], customer_id=lemah["customer_id"], sale_id=lemah["_id"], data={},
              alasan_kurir="Di dalam toko, sinyal GPS lemah."),
            a(jenis="koreksi", kurir_id=self.dimas["_id"], customer_id=rumah["customer_id"], sale_id=rumah["_id"],
              data={"galon_isi": rumah["galon_isi"], "galon_kosong": rumah["galon_isi"]}, alasan_kurir="Salah pencet jumlah galon kosong."),
        ]
        # Catatan yang salah pencet: galon kosong tertulis kurang 1, jadi saldo galon pelanggan ikut lebih 1.
        rumah["galon_kosong"] -= 1
        next(c for c in self.rumah if c["_id"] == rumah["customer_id"])["saldo_galon"] += 1

    def konfirmasi(self):
        d = date.fromisoformat(self.hari_ini)
        senin = d - timedelta(days=d.weekday() + 7)
        mulai, selesai = senin.isoformat(), (senin + timedelta(days=6)).isoformat()
        tercatat = lambda c: sum(s["galon_isi"] for s in self.sales if s["customer_id"] == c["_id"] and s["jenis"] == "toko" and mulai <= s["tanggal"] <= selesai)  # noqa: E731
        k = lambda c, **x: {"_id": id_baru(), "customer_id": c["_id"], "periode_mulai": mulai, "periode_selesai": selesai,  # noqa: E731
                            "galon_tercatat": tercatat(c), "token_hash": hashlib.sha256(secrets.token_bytes(24)).hexdigest(),
                            "berlaku_sampai": (senin + timedelta(days=14)).isoformat(), "dikirim_at": waktu(A.geser_tanggal(selesai, 1), 1140),
                            "jawaban": None, "galon_menurut_toko": None, "dijawab_at": None, "tanggal_jawab": None, **self.tanda, **x}
        kemarin = self.t(28)
        for c in (self.toko[3], self.toko[4]):
            n = tercatat(c)
            if n:
                self.confirmations.append(k(c, jawaban="benar", galon_menurut_toko=n, dijawab_at=waktu(kemarin, 1200), tanggal_jawab=kemarin))
        c = next((x for x in self.toko[:10] if tercatat(x) >= 4), None)
        if c:
            self.confirmations.append(k(c, jawaban="berbeda", galon_menurut_toko=tercatat(c) - 3, dijawab_at=waktu(kemarin, 1215), tanggal_jawab=kemarin))
        for c in self.toko[10:13]:
            if tercatat(c):
                self.confirmations.append(k(c))

    def perawatan(self):
        komponen = [("Filter sedimen", 90, -97), ("Filter karbon", 180, -176), ("Filter mangan", 300, -121),
                    ("Lampu UV", 365, -203), ("Membran RO", 540, -310)]
        self.maintenance = [{"_id": id_baru(), "komponen": n, "interval_hari": iv, "tanggal_terakhir": A.geser_tanggal(self.hari_ini, lalu), **self.tanda}
                            for n, iv, lalu in komponen]
        self.compliance = {"_id": id_baru(), "uji_lab_terakhir": A.geser_tanggal(self.hari_ini, -160), "uji_lab_interval_hari": 180,
                           "slhs_berlaku_sampai": A.geser_tanggal(self.hari_ini, 20), "nib": "9120000000000 (contoh)",
                           "periksa": [{"kode": "galon_bermerek", "teks": "Tidak memakai galon bermerek", "ok": True},
                                       {"kode": "tutup_bermerek", "teks": "Tidak memakai tutup bermerek", "ok": False},
                                       {"kode": "air_baku", "teks": "Sumber air baku berizin", "ok": True}], **self.tanda}

    def penjualan_depot(self):
        """Empat pembeli datang ke depot beberapa jam sebelum demo dibuat, tetap di tanggal hari ini (tidak pernah di masa depan)."""
        awal_hari = waktu(self.hari_ini, 1)
        self.depot_sales = [{"_id": id_baru(), "produk_id": self.wadah["_id"], "nama_produk": self.wadah["nama"], "satuan": self.wadah["satuan"],
                             "jumlah": n, "harga": self.wadah["harga_rumah"], "harga_beli": self.wadah.get("harga_beli"),
                             "total": n * self.wadah["harga_rumah"], "bayar": "tunai",
                             "batal": False, "dicatat_oleh": self.bos["_id"], "nama_pengguna": self.bos["nama"],
                             "created_at": max(awal_hari, self.kini - timedelta(minutes=lalu)), "tanggal": self.hari_ini, **self.tanda}
                            for n, lalu in ((2, 260), (1, 180), (3, 95), (1, 30))]

    def pengeluaran(self):
        """Buku kas contoh: pengeluaran rutin depot selama 30 hari (spesifikasi 6.3)."""
        self.expenses = []
        for kategori, keterangan, jumlah, hari, menit in PENGELUARAN_CONTOH:
            for i in hari:
                tanggal = self.t(i)
                self.expenses.append({"_id": id_baru(), "tanggal": tanggal, "kategori": kategori, "nama_kategori": NAMA_KATEGORI[kategori],
                                      "keterangan": keterangan, "jumlah": jumlah, "dicatat_oleh": self.bos["_id"],
                                      "nama_pengguna": self.bos["nama"], "created_at": min(waktu(tanggal, menit), self.kini), **self.tanda})

    async def simpan(self) -> dict:
        self.buat_pengguna()
        self.buat_pelanggan()
        rit_dimas_kemarin = None
        for i in range(29):
            self.hari_rudi(i)
            trip, _ = self.hari_dimas(i)
            if i == 28:
                rit_dimas_kemarin = trip
        self.hari_dimas(29, status="selesai")
        self.hari_ini_rudi()
        self.persetujuan(rit_dimas_kemarin)
        self.konfirmasi()
        self.perawatan()
        self.penjualan_depot()
        self.pengeluaran()
        d = db()
        await d.depots.insert_one(self.depot)
        await d.users.insert_many(self.users)
        await d.customers.insert_many([{**c, **self.tanda} for c in self.toko + self.rumah])
        await d.trips.insert_many([{**t, **self.tanda} for t in self.trips])
        await d.sales.insert_many(self.sales)
        await d.approvals.insert_many(self.approvals)
        if self.confirmations:
            await d.confirmations.insert_many(self.confirmations)
        await d.products.insert_many(self.produk)
        await d.depot_sales.insert_many(self.depot_sales)
        await d.expenses.insert_many(self.expenses)
        await d.maintenance.insert_many(self.maintenance)
        await d.compliance.insert_one(self.compliance)
        await hitung_ulang(self.depot, self.t(0))
        r7 = next((t for t in self.trips if t["kurir_id"] == self.dimas["_id"] and t["tanggal"] == self.t(11)), None)
        if r7:
            await d.flags.update_many({"depot_id": self.depot["_id"], "kunci": f"R7:{r7['_id']}"}, {"$set": {"status": "sudah_dicek_aman"}})
        return {"depot": self.depot, "bos": self.bos, "kurir": self.rudi}


async def buat_depot_demo() -> dict:
    return await Pembuat().simpan()
