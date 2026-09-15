"""Layanan yang dipakai beberapa endpoint: hitung ulang Radar, dasbor, kelompok Radar."""
from __future__ import annotations

from collections import defaultdict

from . import aturan as A
from .inti import db, id_baru, penanda_demo, tanggal_wib

HARI_RINGKASAN = 30


async def hitung_ulang(depot: dict, dari: str | None = None):
    """Hitung ulang tanda Radar dari tanggal `dari` sampai hari ini. Status tindak lanjut bos dipertahankan."""
    d, depot_id, hari_ini = db(), depot["_id"], tanggal_wib()
    dari = min(dari or hari_ini, hari_ini)
    customers = await d.customers.find({"depot_id": depot_id}).to_list(None)
    sales = await d.sales.find({"depot_id": depot_id, "tanggal": {"$lte": hari_ini}}).to_list(None)
    trips = await d.trips.find({"depot_id": depot_id, "tanggal": {"$gte": dari}}).to_list(None)
    konf = await d.confirmations.find({"depot_id": depot_id, "jawaban": "berbeda", "tanggal_jawab": {"$gte": dari}}).to_list(None)
    baru = A.hitung_radar(depot=depot, customers=customers, sales=sales, trips=trips, confirmations=konf, dari=dari, sampai=hari_ini)
    lama = await d.flags.find({"depot_id": depot_id, "tanggal": {"$gte": dari}}).to_list(None)
    A.gabung_status(baru, lama)
    await d.flags.delete_many({"depot_id": depot_id, "tanggal": {"$gte": dari}})
    if baru:
        await d.flags.insert_many([{**f, "_id": id_baru(), "depot_id": depot_id, **penanda_demo(depot)} for f in baru])


async def nama_kurir(depot_id: str) -> dict[str, dict]:
    kurir = await db().users.find({"depot_id": depot_id, "peran": "kurir"}).to_list(None)
    return {k["_id"]: {"id": k["_id"], "nama": k["nama"], "warna": k.get("warna"), "aktif": k.get("aktif", True)} for k in kurir}


def status_kelompok(flags: list[dict]) -> str:
    if flags and all(f["status"] == "sudah_dicek_aman" for f in flags):
        return "sudah_dicek_aman"
    if any(f["status"] == "terbukti" for f in flags):
        return "terbukti"
    return "baru"


def urutan_kode(f: dict) -> tuple:
    return (int(f["kode"][1:]), f["kunci"])


async def kelompok_radar(depot: dict, dari: str, sampai: str, kurir_id: str | None = None) -> list[dict]:
    q = {"depot_id": depot["_id"], "tanggal": {"$gte": dari, "$lte": sampai}}
    if kurir_id:
        q["kurir_id"] = kurir_id
    flags = await db().flags.find(q).to_list(None)
    kurir = await nama_kurir(depot["_id"])
    grup: dict[tuple, list] = defaultdict(list)
    for f in flags:
        grup[(f["tanggal"], f["kurir_id"])].append(f)
    hasil = []
    for (t, k), isi in sorted(grup.items(), key=lambda kv: (kv[0][0], kurir.get(kv[0][1], {}).get("nama", "")), reverse=True):
        isi.sort(key=urutan_kode)
        hasil.append({
            "tanggal": t, "kurir": kurir.get(k, {"id": k, "nama": "Kurir"}), "risiko": A.tingkat_risiko(isi),
            **A.dua_angka(isi), "status": status_kelompok(isi),
            "tanda": [{"id": f["_id"], "kode": f["kode"], "penjelasan": f["penjelasan"], "perkiraan_rupiah": f["perkiraan_rupiah"],
                       "masuk_ke": f["masuk_ke"], "status": f["status"], "trip_id": f.get("trip_id"), "sale_id": f.get("sale_id")} for f in isi],
        })
    return hasil


async def dasbor(depot: dict) -> dict:
    d, depot_id, hari_ini = db(), depot["_id"], tanggal_wib()
    dari = A.geser_tanggal(hari_ini, -(HARI_RINGKASAN - 1))
    sales = await d.sales.find({"depot_id": depot_id, "tanggal": {"$gte": A.geser_tanggal(dari, -A.R1_JENDELA_HARI), "$lte": hari_ini}}).to_list(None)
    flags = await d.flags.find({"depot_id": depot_id, "tanggal": {"$gte": dari, "$lte": hari_ini}}).to_list(None)
    trips_hari_ini = await d.trips.find({"depot_id": depot_id, "tanggal": hari_ini}).to_list(None)
    kurir = await nama_kurir(depot_id)
    harian = A.statistik_harian(sales)
    tanggal = A.daftar_tanggal(dari, hari_ini)

    flag_per = defaultdict(list)
    for f in flags:
        flag_per[(f["kurir_id"], f["tanggal"])].append(f)

    def jumlah(kid, daftar_t):
        s = {"total": 0, "toko": 0, "verif": 0, "rumah": 0}
        for t in daftar_t:
            for k, v in harian.get((kid, t), {}).items():
                s[k] += v
        return s

    kartu = []
    aktif_ids = {k for (k, t) in harian if t >= dari} | {kid for kid, info in kurir.items() if info["aktif"]}
    for kid in sorted(aktif_ids, key=lambda x: kurir.get(x, {}).get("nama", "")):
        tiga_puluh, hari = jumlah(kid, tanggal), jumlah(kid, [hari_ini])
        semua_flag = [f for t in tanggal for f in flag_per[(kid, t)]]
        strip = [{"tanggal": t, "risiko": A.tingkat_risiko(flag_per[(kid, t)])} for t in tanggal]
        kartu.append({
            "kurir": kurir.get(kid, {"id": kid, "nama": "Kurir"}),
            "hari_ini": {**hari, "porsi_toko": hari["toko"] / hari["total"] if hari["total"] else None,
                         "persen_terverifikasi": hari["verif"] / hari["toko"] if hari["toko"] else None,
                         "risiko": A.tingkat_risiko(flag_per[(kid, hari_ini)])},
            "tiga_puluh_hari": {**tiga_puluh, "porsi_toko": tiga_puluh["toko"] / tiga_puluh["total"] if tiga_puluh["total"] else None,
                                "persen_terverifikasi": tiga_puluh["verif"] / tiga_puluh["toko"] if tiga_puluh["toko"] else None,
                                **A.dua_angka(semua_flag)},
            "hari_risiko_tinggi": sum(1 for x in strip if x["risiko"] == "tinggi"),
            "hari_risiko_sedang": sum(1 for x in strip if x["risiko"] == "sedang"),
            "strip": strip,
        })

    penjualan_rit = defaultdict(list)
    for s in sales:
        if s["tanggal"] == hari_ini and s.get("trip_id"):
            penjualan_rit[s["trip_id"]].append(s)
    seharusnya = disetor = di_jalan = 0
    for t in trips_hari_ini:
        seharusnya += A.hitung_setoran(t, penjualan_rit[t["_id"]])["uang_seharusnya"]
        if t["status"] == "aktif":
            di_jalan += 1
        else:
            disetor += t.get("uang_disetor") or 0
    flag_hari_ini = [f for f in flags if f["tanggal"] == hari_ini]
    semua_hari_ini = {"total": 0, "toko": 0, "rumah": 0}
    for (_, t), v in harian.items():
        if t == hari_ini:
            for k in semua_hari_ini:
                semua_hari_ini[k] += v[k]

    perawatan = await d.maintenance.find({"depot_id": depot_id}).to_list(None)
    pengingat = []
    for p in perawatan:
        if not p.get("tanggal_terakhir"):
            continue
        sisa = A.selisih_hari(hari_ini, A.geser_tanggal(p["tanggal_terakhir"], p["interval_hari"]))
        if sisa <= 7:
            pengingat.append({"komponen": p["komponen"], "sisa_hari": sisa})
    kepatuhan = await d.compliance.find_one({"depot_id": depot_id})
    if kepatuhan and kepatuhan.get("slhs_berlaku_sampai"):
        sisa = A.selisih_hari(hari_ini, kepatuhan["slhs_berlaku_sampai"])
        if sisa <= 30:
            pengingat.append({"komponen": "SLHS", "sisa_hari": sisa})

    return {
        "depot": {"nama": depot["nama"], "is_demo": depot.get("is_demo", False)},
        "rentang": {"dari": dari, "sampai": hari_ini},
        **A.dua_angka(flags),
        "rincian_bocor": _rincian_bocor(flags),
        "hari_ini": {
            "tanggal": hari_ini, **semua_hari_ini, "uang_seharusnya": seharusnya, "uang_disetor": disetor, "rit_di_jalan": di_jalan,
            **A.dua_angka(flag_hari_ini), "tanda_baru": sum(1 for f in flag_hari_ini if f["status"] == "baru"),
            "rit_belum_dicek": sum(1 for t in trips_hari_ini if not t.get("muatan_dicek")),
        },
        "kurir": kartu,
        "tren": {"tanggal": tanggal, "garis_dasar": [A.garis_dasar(t, harian, depot.get("garis_dasar_toko", 50)) for t in tanggal],
                 "seri": [{"kurir": k["kurir"], "porsi": [(harian[(k["kurir"]["id"], t)]["toko"] / harian[(k["kurir"]["id"], t)]["total"])
                                                          if harian.get((k["kurir"]["id"], t), {}).get("total") else None for t in tanggal]}
                          for k in kartu]},
        "pengingat": pengingat,
        "persetujuan_menunggu": await d.approvals.count_documents({"depot_id": depot_id, "status": "menunggu"}),
    }


def _rincian_bocor(flags: list[dict]) -> dict:
    hasil = defaultdict(int)
    for f in A.aktif(flags):
        if f["masuk_ke"] == A.BOCOR and f["perkiraan_rupiah"]:
            hasil[f["kode"]] += f["perkiraan_rupiah"]
    return dict(hasil)
