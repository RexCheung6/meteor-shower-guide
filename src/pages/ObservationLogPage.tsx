import { useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import showersData from "../data/showers.json";
import { localizedName, type Locale } from "../lib/locale";
import { useLocation } from "../context/LocationContext";
import { loadObservationRecords, removeObservationRecord, saveObservationRecord, type ObservationRecord } from "../lib/observations";

export default function ObservationLogPage() {
  const { t } = useTranslation();
  const { locale } = useParams();
  const current: Locale = locale === "en" ? "en" : "zh";
  const { location } = useLocation();
  const showers = showersData;
  const nextShower = useMemo(() => showers.find((shower) => new Date(shower.peakUTC) > new Date()) ?? showers[showers.length - 1], [showers]);
  const [records, setRecords] = useState<ObservationRecord[]>(loadObservationRecords);
  const [showerId, setShowerId] = useState(nextShower.id);
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [count, setCount] = useState("");
  const [notes, setNotes] = useState("");
  const [photo, setPhoto] = useState<{ data: string; name: string } | null>(null);
  const [error, setError] = useState(false);

  const readPhoto = (file: File) => {
    if (file.size > 2_000_000) {
      setError(true);
      return;
    }
    const reader = new FileReader();
    reader.onload = () => setPhoto({ data: String(reader.result), name: file.name });
    reader.readAsDataURL(file);
  };

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    setError(false);
    try {
      const record: ObservationRecord = {
        id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
        showerId,
        date,
        location: localizedName(location.name, current),
        count: count.trim() ? Math.max(0, Number(count)) : null,
        notes: notes.trim(),
        photoData: photo?.data,
        photoName: photo?.name,
        createdAt: Date.now()
      };
      saveObservationRecord(record);
      setRecords(loadObservationRecords());
      setCount("");
      setNotes("");
      setPhoto(null);
    } catch {
      setError(true);
    }
  };

  return (
    <div className="page">
      <section className="card">
        <h1>{t("log.title")}</h1>
        <p className="muted">{t("log.subtitle")}</p>
      </section>
      <section className="card">
        <h2>{t("log.newRecord")}</h2>
        <form className="log-form" onSubmit={submit}>
          <label>{t("log.shower")}
            <select value={showerId} onChange={(event) => setShowerId(event.target.value)}>
              {showers.map((shower) => <option value={shower.id} key={shower.id}>{localizedName(shower.names, current)}</option>)}
            </select>
          </label>
          <label>{t("log.date")}<input type="date" value={date} onChange={(event) => setDate(event.target.value)} required /></label>
          <label>{t("log.count")}<input type="number" min="0" step="1" value={count} onChange={(event) => setCount(event.target.value)} placeholder={t("log.countPlaceholder")} /></label>
          <label>{t("log.notes")}<textarea value={notes} onChange={(event) => setNotes(event.target.value)} rows={3} placeholder={t("log.notesPlaceholder")} /></label>
          <label>{t("log.photo")}<input type="file" accept="image/*" onChange={(event) => event.target.files?.[0] && readPhoto(event.target.files[0])} /></label>
          {photo && <p className="muted">{photo.name}</p>}
          {error && <p className="form-error">{t("log.saveError")}</p>}
          <button type="submit" className="btn-primary">{t("log.save")}</button>
        </form>
      </section>
      <section className="card">
        <h2>{t("log.history")}</h2>
        {records.length === 0 ? <p className="muted">{t("log.empty")}</p> : <div className="observation-record-list">
          {records.map((record) => {
            const shower = showers.find((item) => item.id === record.showerId);
            return <article className="observation-record" key={record.id}>
              <div className="observation-record-head"><div><h3>{shower ? localizedName(shower.names, current) : record.showerId}</h3><span className="muted">{record.date} · {record.location}</span></div><button type="button" className="btn-small" onClick={() => { removeObservationRecord(record.id); setRecords(loadObservationRecords()); }}>{t("log.delete")}</button></div>
              {record.count !== null && <p>{t("log.countValue", { count: record.count })}</p>}
              {record.notes && <p>{record.notes}</p>}
              {record.photoData && <img className="observation-photo" src={record.photoData} alt={record.photoName ?? t("log.photo")} />}
            </article>;
          })}
        </div>}
      </section>
    </div>
  );
}

