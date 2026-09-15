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


def berharga_toko(s: dict) -> bool:
    """Penjualan toko yang sah dihargai harga toko: terverifikasi atau disetujui bos."""
    return s["jenis"] == "toko" and (s["status_verifikasi"] == TERVERIFIKASI or bool(s.get("disetujui_bos")))


def tanpa_bukti(s: dict) -> bool:
    return s["jenis"] == "toko" and not berharga_toko(s)


# ---------------------------------------------------------------- 3.3 setoran
def hitung_setoran(trip: dict, sales: list[dict]) -> dict:
    catatan = sum(s["galon_isi"] for s in sales)
    seharusnya = sum(s["galon_isi"] * s["harga_berlaku"] for s in sales if s["bayar"] == "tunai")
    bon = sum(s["galon_isi"] * s["harga_berlaku"] for s in sales if s["bayar"] == "bon")
    hasil = {"galon_catatan": catatan, "uang_seharusnya": seharusnya, "uang_bon": bon,
             "galon_di_motor": trip["dibawa"] - catatan, "galon_stok": None, "selisih_galon": None, "selisih_uang": None}
    if trip.get("isi_pulang") is not None:
        stok = trip["dibawa"] - trip["isi_pulang"]
        hasil.update(galon_stok=stok, selisih_galon=stok - catatan)
    if trip.get("uang_disetor") is not None:
        hasil["selisih_uang"] = trip["uang_disetor"] - seharusnya
    return hasil


# ---------------------------------------------------------------- statistik harian
def statistik_harian(sales: list[dict]) -> dict[tuple[str, str], dict]:
    """Per (kurir_id, tanggal): total galon, galon toko (semua status), galon berharga toko, galon rumah."""
    h: dict[tuple[str, str], dict] = defaultdict(lambda: {"total": 0, "toko": 0, "verif": 0, "rumah": 0})
    for s in sales:
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
        if berharga_toko(s):
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

    # R2 toko tanpa bukti, dan R4 QR dipindai jauh
    kelompok_r2: dict[tuple, dict] = defaultdict(lambda: {"galon": 0, "rupiah": 0})
    for s in sales:
        if not dalam(s["tanggal"]) or not tanpa_bukti(s):
            continue
        lolos = s["harga_berlaku"] == s["harga_toko"]  # sakelar harga rumah mati saat penjualan
        g = kelompok_r2[(s["kurir_id"], s["tanggal"], lolos)]
        g["galon"] += s["galon_isi"]
        g["rupiah"] += s["galon_isi"] * (s["harga_rumah"] - s["harga_toko"])
        if s["status_verifikasi"] == LOKASI_JAUH:
            nama = pelanggan.get(s["customer_id"], {}).get("nama", "toko")
            tanda.append(_tanda(s["kurir_id"], s["tanggal"], "R4", f"R4:{s['_id']}",
                                f"QR {nama} dipindai {teks_jarak(s.get('jarak_m') or 0)} dari lokasi toko ({s['galon_isi']} galon, sudah dihitung di R2).",
                                None, TAGIHAN, sale_id=s["_id"], customer_id=s["customer_id"], trip_id=s.get("trip_id")))
    for (kurir, t, lolos), g in kelompok_r2.items():
        if lolos:
            tanda.append(_tanda(kurir, t, "R2", "R2:lolos",
                                f"{g['galon']} galon toko tanpa bukti tetap dibayar harga toko karena sakelar \"harga rumah\" mati.",
                                g["rupiah"], BOCOR))
        else:
            tanda.append(_tanda(kurir, t, "R2", "R2",
                                f"{g['galon']} galon toko tanpa bukti → dihitung harga rumah.", g["rupiah"], TAGIHAN))

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

    # R5 lompatan lokasi dalam satu rit
    per_rit: dict[str, list[dict]] = defaultdict(list)
    for s in sales:
        if dalam(s["tanggal"]) and s.get("lat") is not None and s.get("lng") is not None and s.get("trip_id"):
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

    # R6 kurang setor, R7 selisih galon
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

    # R8 konfirmasi pemilik toko berbeda
    for k in confirmations:
        if k.get("jawaban") != "berbeda" or not k.get("tanggal_jawab") or not dalam(k["tanggal_jawab"]):
            continue
        cid, mulai, selesai = k["customer_id"], k["periode_mulai"], k["periode_selesai"]
        di_periode = [s for s in sales if s["customer_id"] == cid and s["jenis"] == "toko" and mulai <= s["tanggal"] <= selesai]
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
