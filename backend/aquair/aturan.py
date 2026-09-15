"""Mesin aturan AQUAIR (spesifikasi bagian 3 dan 4).

Semua fungsi di sini murni: menerima dict dari database dan mengembalikan hasil hitungan,
tanpa akses database. Dengan begitu contoh hitungan spesifikasi 4.4 bisa dites langsung.

Konvensi data (lihat spesifikasi bagian 9):
- uang = int Rupiah; tanggal = 'YYYY-MM-DD' menurut WIB; waktu = datetime UTC.
- sale: jenis ('toko'/'rumah'), galon_isi, galon_kosong, bayar, status_verifikasi,
  disetujui_bos, harga_berlaku, harga_toko, harga_rumah (salinan harga saat penjualan),
  kurir_id, customer_id, trip_id, tanggal, lat, lng, jarak_m, urutan_at.
"""
from __future__ import annotations

import math
from collections import defaultdict
from datetime import date, timedelta
from statistics import median

TERVERIFIKASI = "terverifikasi"
LOKASI_JAUH = "lokasi_jauh"
LOKASI_LEMAH = "lokasi_lemah"
TANPA_QR = "tanpa_qr"
RUMAH = "rumah"

TAGIHAN = "tagihan_kembali"
BOCOR = "perkiraan_bocor"

UTAMA = "utama"  # produk isi ulang galon; harganya di pengaturan depot, dan hanya produk ini yang dipakai R1, R3, R8

AKURASI_MAKS_M = 100
R1_MIN_GALON = 10
R1_AMBANG = 0.25
R1_JENDELA_HARI = 14
R1_MIN_TERVERIFIKASI = 0.80
R5_JARAK_M = 300
R5_KECEPATAN_KMJ = 60
RISIKO_BOCOR_TINGGI = 15000


# ---------------------------------------------------------------- dasar
def rp(n: int | float) -> str:
    return "Rp" + f"{int(round(n)):,}".replace(",", ".")


def jarak_m(lat1, lng1, lat2, lng2) -> float:
    """Jarak haversine dalam meter."""
    r = 6371000.0
    p1, p2 = math.radians(lat1), math.radians(lat2)
    dp, dl = math.radians(lat2 - lat1), math.radians(lng2 - lng1)
    a = math.sin(dp / 2) ** 2 + math.cos(p1) * math.cos(p2) * math.sin(dl / 2) ** 2
    return 2 * r * math.asin(math.sqrt(a))


def teks_jarak(m: float) -> str:
    if m >= 1000:
        return f"{m / 1000:.1f}".replace(".", ",") + " km"
    return f"{round(m)} m"


def daftar_tanggal(dari: str, sampai: str) -> list[str]:
    a, b = date.fromisoformat(dari), date.fromisoformat(sampai)
    return [(a + timedelta(days=i)).isoformat() for i in range((b - a).days + 1)]


def geser_tanggal(t: str, hari: int) -> str:
    return (date.fromisoformat(t) + timedelta(days=hari)).isoformat()


def selisih_hari(dari: str, sampai: str) -> int:
    return (date.fromisoformat(sampai) - date.fromisoformat(dari)).days


# ---------------------------------------------------------------- 3.2 status dan harga
def status_verifikasi(*, qr_sah: bool, tanpa_qr: bool, jarak: float | None, akurasi: float | None, radius_m: int) -> str:
    """Status penjualan toko. Server yang menentukan, bukan HP."""
    if tanpa_qr or not qr_sah:
        return TANPA_QR
    if jarak is None or akurasi is None or akurasi > AKURASI_MAKS_M:
        return LOKASI_LEMAH
    if jarak > radius_m:
        return LOKASI_JAUH
    return TERVERIFIKASI


def harga_berlaku(jenis: str, status: str, depot: dict) -> int:
    if jenis == "rumah":
        return depot["harga_rumah"]
    if status == TERVERIFIKASI or not depot.get("kebijakan_tanpa_bukti", True):
        return depot["harga_toko"]
    return depot["harga_rumah"]


def harga_produk(jenis: str, status: str, depot: dict, produk: dict | None = None) -> tuple[int, int, int]:
    """(harga_berlaku, harga_toko, harga_rumah) satu baris penjualan. produk None = isi ulang galon utama.

    Harga toko hanya berlaku bila produk punya harga toko yang lebih murah dan penjualan tokonya terbukti
    (atau sakelar "toko tanpa bukti dihitung harga rumah" dimatikan). Produk tanpa harga toko selalu harga rumah.
    """
    if produk is None:
        return harga_berlaku(jenis, status, depot), depot["harga_toko"], depot["harga_rumah"]
    rumah = produk["harga_rumah"]
    toko = produk.get("harga_toko")
    toko = rumah if toko is None or toko >= rumah else toko
    if jenis == "rumah" or toko == rumah:
        return rumah, toko, rumah
    return (toko if status == TERVERIFIKASI or not depot.get("kebijakan_tanpa_bukti", True) else rumah), toko, rumah


def produk_utama(s: dict) -> bool:
    """Baris isi ulang galon utama. Penjualan lama tanpa produk_id termasuk di sini."""
    return (s.get("produk_id") or UTAMA) == UTAMA


def berharga_toko(s: dict) -> bool:
    """Penjualan toko yang sah dihargai harga toko: terverifikasi atau disetujui bos."""
    return s["jenis"] == "toko" and (s["status_verifikasi"] == TERVERIFIKASI or bool(s.get("disetujui_bos")))


def tanpa_bukti(s: dict) -> bool:
    return s["jenis"] == "toko" and not berharga_toko(s)


# ---------------------------------------------------------------- 3.3 setoran
def hitung_setoran(trip: dict, sales: list[dict]) -> dict:
    """Galon dan galon kosong dihitung untuk isi ulang galon utama; uang dari semua produk."""
    utama = [s for s in sales if produk_utama(s)]
    catatan = sum(s["galon_isi"] for s in utama)
    kosong = sum(s["galon_kosong"] for s in utama)
    seharusnya = sum(s["galon_isi"] * s["harga_berlaku"] for s in sales if s["bayar"] == "tunai")
    bon = sum(s["galon_isi"] * s["harga_berlaku"] for s in sales if s["bayar"] == "bon")
    hasil = {"galon_catatan": catatan, "uang_seharusnya": seharusnya, "uang_bon": bon,
             "galon_di_motor": trip["dibawa"] - catatan, "galon_stok": None, "selisih_galon": None, "selisih_uang": None,
             "kosong_catatan": kosong, "selisih_kosong": None, "produk_lain": pencocokan_produk_lain(trip, sales)}
    if trip.get("isi_pulang") is not None:
        stok = trip["dibawa"] - trip["isi_pulang"]
        hasil.update(galon_stok=stok, selisih_galon=stok - catatan)
    if trip.get("kosong_pulang") is not None:
        hasil["selisih_kosong"] = trip["kosong_pulang"] - kosong
    if trip.get("uang_disetor") is not None:
        hasil["selisih_uang"] = trip["uang_disetor"] - seharusnya
    return hasil


def pencocokan_produk_lain(trip: dict, sales: list[dict]) -> list[dict]:
    """Per produk selain isi ulang galon: muatan berangkat, catatan penjualan, dan yang dibawa pulang."""
    muatan = {m["produk_id"]: m for m in trip.get("muatan_lain") or []}
    jual: dict[str, dict] = {}
    for s in sales:
        if produk_utama(s):
            continue
        j = jual.setdefault(s["produk_id"], {"nama": s.get("nama_produk"), "satuan": s.get("satuan"), "isi": 0, "kosong": 0})
        j["isi"] += s["galon_isi"]
        j["kosong"] += s["galon_kosong"]
    hasil = []
    for pid in list(muatan) + [p for p in jual if p not in muatan]:
        m, j = muatan.get(pid, {}), jual.get(pid, {"isi": 0, "kosong": 0})
        dibawa, isi_pulang, kosong_pulang = m.get("dibawa"), m.get("isi_pulang"), m.get("kosong_pulang")
        b = {"produk_id": pid, "nama": m.get("nama") or j.get("nama") or "Produk", "satuan": m.get("satuan") or j.get("satuan") or "pcs",
             "harga_rumah": m.get("harga_rumah"), "pakai_kosong": bool(m.get("pakai_kosong")), "dibawa": dibawa,
             "terjual_catatan": j["isi"], "di_motor": None if dibawa is None else dibawa - j["isi"], "isi_pulang": isi_pulang,
             "stok_terjual": None, "selisih": None, "kosong_catatan": j["kosong"], "kosong_pulang": kosong_pulang, "selisih_kosong": None}
        if dibawa is not None and isi_pulang is not None:
            b["stok_terjual"] = dibawa - isi_pulang
            b["selisih"] = b["stok_terjual"] - j["isi"]
        if kosong_pulang is not None:
            b["selisih_kosong"] = kosong_pulang - j["kosong"]
        hasil.append(b)
    return hasil


# ---------------------------------------------------------------- statistik harian
def statistik_harian(sales: list[dict]) -> dict[tuple[str, str], dict]:
    """Per (kurir_id, tanggal): total galon, galon toko (semua status), galon berharga toko, galon rumah."""
    h: dict[tuple[str, str], dict] = defaultdict(lambda: {"total": 0, "toko": 0, "verif": 0, "rumah": 0})
    for s in sales:
        if not produk_utama(s):
            continue
        d = h[(s["kurir_id"], s["tanggal"])]
        d["total"] += s["galon_isi"]
        if s["jenis"] == "toko":
            d["toko"] += s["galon_isi"]
            if berharga_toko(s):
                d["verif"] += s["galon_isi"]
        else:
            d["rumah"] += s["galon_isi"]
    return h


def garis_dasar(tanggal: str, harian: dict, bawaan_persen: int) -> float:
    """Median porsi toko dari hari-kurir semua kurir dalam 14 hari sebelumnya yang ≥ 80% galon tokonya terverifikasi."""
    awal = geser_tanggal(tanggal, -R1_JENDELA_HARI)
    porsi = [d["toko"] / d["total"] for (_, t), d in harian.items()
             if awal <= t < tanggal and d["total"] > 0 and d["toko"] > 0 and d["verif"] / d["toko"] >= R1_MIN_TERVERIFIKASI]
    return median(porsi) if porsi else bawaan_persen / 100


# ---------------------------------------------------------------- 4 Radar
def _tanda(kurir_id, tanggal, kode, kunci, penjelasan, rupiah, masuk, **ref) -> dict:
    return {"kurir_id": kurir_id, "tanggal": tanggal, "kode": kode, "kunci": kunci, "penjelasan": penjelasan,
            "perkiraan_rupiah": rupiah, "masuk_ke": masuk, "status": "baru", **ref}


def hitung_stok_toko(customers: list[dict], sales: list[dict], sampai: str) -> dict[str, dict[str, dict]]:
    """R3: stok toko per hari sejak didaftarkan. Hanya galon berharga toko yang dihitung.

    Hasil: {customer_id: {tanggal: {sebelum, diantar, stok, lebih, per_kurir}}}. Hanya hari dengan antaran dicatat.
    """
    antar: dict[str, dict[str, dict[str, int]]] = defaultdict(lambda: defaultdict(lambda: defaultdict(int)))
    for s in sales:
        if berharga_toko(s) and produk_utama(s):
            antar[s["customer_id"]][s["tanggal"]][s["kurir_id"]] += s["galon_isi"]
    hasil: dict[str, dict[str, dict]] = {}
    for c in customers:
        if c.get("jenis") != "toko" or not c.get("kapasitas") or c["_id"] not in antar:
            continue
        kap, laku = int(c["kapasitas"]), int(c.get("laku_per_hari") or 0)
        hari = antar[c["_id"]]
        mulai = min([c.get("tanggal_daftar") or min(hari)] + list(hari))
        stok_bawa, catatan = 0, {}
        for t in daftar_tanggal(mulai, sampai):
            sebelum = max(0, stok_bawa - laku)
            per_kurir = dict(hari.get(t, {}))
            diantar = sum(per_kurir.values())
            stok = sebelum + diantar
            if diantar:
                catatan[t] = {"sebelum": sebelum, "diantar": diantar, "stok": stok, "lebih": max(0, stok - kap), "per_kurir": per_kurir}
            stok_bawa = min(stok, kap)
        hasil[c["_id"]] = catatan
    return hasil


def hitung_radar(*, depot: dict, customers: list[dict], sales: list[dict], trips: list[dict],
                 confirmations: list[dict], dari: str, sampai: str) -> list[dict]:
    """Semua tanda Radar untuk hari-kurir dalam rentang [dari, sampai]. Status tindak lanjut diisi 'baru'.

    `sales` harus berisi seluruh penjualan depot sampai `sampai` (untuk garis dasar R1 dan stok R3).
    """
    pelanggan = {c["_id"]: c for c in customers}
    selisih_depot = depot["harga_rumah"] - depot["harga_toko"]
    harian = statistik_harian(sales)
    tanda: list[dict] = []
    dalam = lambda t: dari <= t <= sampai  # noqa: E731

    # R1 rasio toko tinggi
    for (kurir, t), d in harian.items():
        if not dalam(t) or d["total"] < R1_MIN_GALON:
            continue
        gd = garis_dasar(t, harian, depot.get("garis_dasar_toko", 50))
        porsi = d["toko"] / d["total"]
        if porsi - gd >= R1_AMBANG - 1e-9:
            rupiah = round(max(0.0, d["verif"] - gd * d["total"]) * selisih_depot)
            tanda.append(_tanda(kurir, t, "R1", "R1",
                                f"{d['toko']} dari {d['total']} galon dicatat sebagai toko ({round(porsi * 100)}%). Garis dasar depot: {round(gd * 100)}%.",
                                rupiah, BOCOR))

    # R2 toko tanpa bukti (per produk yang punya harga toko lebih murah), dan R4 QR dipindai jauh (sekali per kunjungan)
    kelompok_r2: dict[tuple, dict] = {}
    for s in sales:
        if not dalam(s["tanggal"]) or not tanpa_bukti(s):
            continue
        selisih = s["harga_rumah"] - s["harga_toko"]
        if s["status_verifikasi"] == LOKASI_JAUH and s.get("baris_ke", 0) == 0:
            nama = pelanggan.get(s["customer_id"], {}).get("nama", "toko")
            barang = f"{s['galon_isi']} {'galon' if produk_utama(s) else s.get('satuan') or 'barang'}"
            tanda.append(_tanda(s["kurir_id"], s["tanggal"], "R4", f"R4:{s['_id']}",
                                f"QR {nama} dipindai {teks_jarak(s.get('jarak_m') or 0)} dari lokasi toko ({barang}, "
                                f"{'sudah dihitung di R2' if selisih > 0 else 'produk tanpa harga toko'}).",
                                None, TAGIHAN, sale_id=s["_id"], customer_id=s["customer_id"], trip_id=s.get("trip_id")))
        if selisih <= 0:
            continue
        lolos = s["harga_berlaku"] == s["harga_toko"]  # sakelar harga rumah mati saat penjualan
        pid = s.get("produk_id") or UTAMA
        g = kelompok_r2.setdefault((s["kurir_id"], s["tanggal"], lolos, pid),
                                   {"galon": 0, "rupiah": 0, "nama": s.get("nama_produk"), "satuan": s.get("satuan")})
        g["galon"] += s["galon_isi"]
        g["rupiah"] += s["galon_isi"] * selisih
    for (kurir, t, lolos, pid), g in kelompok_r2.items():
        utama = pid == UTAMA
        barang = "galon toko" if utama else f"{g['satuan']} {g['nama']} ke toko"
        akhiran = "" if utama else f":{pid}"
        if lolos:
            tanda.append(_tanda(kurir, t, "R2", f"R2:lolos{akhiran}",
                                f"{g['galon']} {barang} tanpa bukti tetap dibayar harga toko karena sakelar \"harga rumah\" mati.",
                                g["rupiah"], BOCOR))
        else:
            tanda.append(_tanda(kurir, t, "R2", f"R2{akhiran}",
                                f"{g['galon']} {barang} tanpa bukti → dihitung harga rumah.", g["rupiah"], TAGIHAN))

    # R3 stok toko tidak wajar
    stok = hitung_stok_toko(customers, sales, sampai)
    for cid, per_hari in stok.items():
        nama, kap = pelanggan[cid]["nama"], pelanggan[cid]["kapasitas"]
        for t, info in per_hari.items():
            if not dalam(t) or info["lebih"] <= 0:
                continue
            total_rp = info["lebih"] * selisih_depot
            kurir_urut = sorted(info["per_kurir"].items(), key=lambda kv: -kv[1])
            sisa = total_rp
            for i, (kurir, g) in enumerate(kurir_urut):
                bagian = sisa if i == len(kurir_urut) - 1 else round(total_rp * g / info["diantar"])
                sisa -= bagian
                tanda.append(_tanda(kurir, t, "R3", f"R3:{cid}",
                                    f"{nama} menerima {g} galon, padahal perkiraan stoknya masih {info['sebelum']} dari kapasitas {kap}.",
                                    bagian, BOCOR, customer_id=cid))

    # R5 lompatan lokasi dalam satu rit. Lokasi simulasi (depot demo) tidak ikut, supaya tidak ada R5 palsu (spesifikasi 10.3).
    per_rit: dict[str, list[dict]] = defaultdict(list)
    for s in sales:
        if (dalam(s["tanggal"]) and s.get("lat") is not None and s.get("lng") is not None and s.get("trip_id")
                and not s.get("disimulasikan") and s.get("baris_ke", 0) == 0):
            per_rit[s["trip_id"]].append(s)
    for daftar in per_rit.values():
        daftar.sort(key=lambda s: s["urutan_at"])
        for a, b in zip(daftar, daftar[1:]):
            jarak = jarak_m(a["lat"], a["lng"], b["lat"], b["lng"])
            detik = (b["urutan_at"] - a["urutan_at"]).total_seconds()
            kmj = math.inf if detik <= 0 else jarak / detik * 3.6
            if jarak > R5_JARAK_M and kmj > R5_KECEPATAN_KMJ:
                laju = "seketika" if math.isinf(kmj) else f"{round(detik / 60)} menit ({round(kmj)} km/jam)"
                tanda.append(_tanda(b["kurir_id"], b["tanggal"], "R5", f"R5:{b['_id']}",
                                    f"Dua pencatatan berurutan berjarak {teks_jarak(jarak)} dalam {laju}.",
                                    None, None, sale_id=b["_id"], trip_id=b.get("trip_id")))

    # R6 kurang setor, R7 selisih stok, R9 galon kosong kurang
    penjualan_rit: dict[str, list[dict]] = defaultdict(list)
    for s in sales:
        if s.get("trip_id"):
            penjualan_rit[s["trip_id"]].append(s)
    for trip in trips:
        if trip["status"] == "aktif" or not dalam(trip["tanggal"]):
            continue
        st = hitung_setoran(trip, penjualan_rit[trip["_id"]])
        if st["selisih_uang"] is not None and st["selisih_uang"] < 0:
            tanda.append(_tanda(trip["kurir_id"], trip["tanggal"], "R6", f"R6:{trip['_id']}",
                                f"Setoran {rp(trip['uang_disetor'])}, seharusnya {rp(st['uang_seharusnya'])}.",
                                -st["selisih_uang"], BOCOR, trip_id=trip["_id"]))
        if st["selisih_galon"]:
            rupiah = st["selisih_galon"] * depot["harga_rumah"] if st["selisih_galon"] > 0 else 0
            tanda.append(_tanda(trip["kurir_id"], trip["tanggal"], "R7", f"R7:{trip['_id']}",
                                f"Stok berkurang {st['galon_stok']} galon, catatan {st['galon_catatan']} galon.",
                                rupiah, BOCOR, trip_id=trip["_id"]))
        if st["selisih_kosong"] is not None and st["selisih_kosong"] < 0:
            tanda.append(_tanda(trip["kurir_id"], trip["tanggal"], "R9", f"R9:{trip['_id']}",
                                f"Galon kosong dibawa pulang {trip['kosong_pulang']}, catatan {st['kosong_catatan']} galon.",
                                -st["selisih_kosong"] * int(depot.get("nilai_galon_kosong") or 0), BOCOR, trip_id=trip["_id"]))
        for p in st["produk_lain"]:
            if p["selisih"]:
                tanda.append(_tanda(trip["kurir_id"], trip["tanggal"], "R7", f"R7:{trip['_id']}:{p['produk_id']}",
                                    f"{p['nama']}: stok berkurang {p['stok_terjual']} {p['satuan']}, catatan {p['terjual_catatan']} {p['satuan']}.",
                                    p["selisih"] * (p["harga_rumah"] or 0) if p["selisih"] > 0 else 0, BOCOR, trip_id=trip["_id"]))
            if p["pakai_kosong"] and p["selisih_kosong"] is not None and p["selisih_kosong"] < 0:
                tanda.append(_tanda(trip["kurir_id"], trip["tanggal"], "R9", f"R9:{trip['_id']}:{p['produk_id']}",
                                    f"{p['nama']}: kosong dibawa pulang {p['kosong_pulang']}, catatan {p['kosong_catatan']} {p['satuan']}.",
                                    0, BOCOR, trip_id=trip["_id"]))

    # R8 konfirmasi pemilik toko berbeda
    for k in confirmations:
        if k.get("jawaban") != "berbeda" or not k.get("tanggal_jawab") or not dalam(k["tanggal_jawab"]):
            continue
        cid, mulai, selesai = k["customer_id"], k["periode_mulai"], k["periode_selesai"]
        di_periode = [s for s in sales if s["customer_id"] == cid and s["jenis"] == "toko" and produk_utama(s)
                      and mulai <= s["tanggal"] <= selesai]
        per_kurir: dict[str, int] = defaultdict(int)
        for s in di_periode:
            per_kurir[s["kurir_id"]] += s["galon_isi"]
        if not per_kurir:
            continue
        kurir = max(per_kurir.items(), key=lambda kv: kv[1])[0]
        beda = k["galon_tercatat"] - k["galon_menurut_toko"]
        rupiah = 0
        if beda > 0:
            berharga = sum(s["galon_isi"] for s in di_periode if berharga_toko(s))
            r3_minggu = sum(info["lebih"] * selisih_depot for t, info in stok.get(cid, {}).items() if mulai <= t <= selesai)
            rupiah = max(0, min(beda, berharga) * selisih_depot - r3_minggu)
        nama = pelanggan.get(cid, {}).get("nama", "Toko")
        tanda.append(_tanda(kurir, k["tanggal_jawab"], "R8", f"R8:{k['_id']}",
                            f"{nama} menjawab {k['galon_menurut_toko']} galon untuk periode {mulai} s.d. {selesai}, catatan {k['galon_tercatat']} galon.",
                            rupiah, BOCOR, customer_id=cid))
    return tanda


# ---------------------------------------------------------------- 4.3 risiko dan ringkasan
def aktif(tanda: list[dict]) -> list[dict]:
    """Tanda yang ikut dihitung: selain yang sudah dicek aman."""
    return [f for f in tanda if f["status"] != "sudah_dicek_aman"]


def dua_angka(tanda: list[dict]) -> dict:
    t = aktif(tanda)
    return {"tagihan_kembali": sum(f["perkiraan_rupiah"] or 0 for f in t if f["masuk_ke"] == TAGIHAN),
            "perkiraan_bocor": sum(f["perkiraan_rupiah"] or 0 for f in t if f["masuk_ke"] == BOCOR)}


def tingkat_risiko(tanda: list[dict]) -> str:
    t = aktif(tanda)
    if not t:
        return "rendah"
    kode = {f["kode"] for f in t}
    if kode & {"R1", "R3", "R4", "R6", "R8"} or dua_angka(t)["perkiraan_bocor"] >= RISIKO_BOCOR_TINGGI:
        return "tinggi"
    return "sedang"


def gabung_status(baru: list[dict], lama: list[dict]) -> list[dict]:
    """Status tindak lanjut dari bos tidak boleh hilang saat Radar dihitung ulang."""
    status = {(f["kurir_id"], f["tanggal"], f["kunci"]): f["status"] for f in lama}
    for f in baru:
        f["status"] = status.get((f["kurir_id"], f["tanggal"], f["kunci"]), f["status"])
    return baru
