import { useState, useEffect } from "react";
import { supabase } from "../supabaseClient";
import {
  getProfile,
  updateProfile,
  getTemplates,
  createTemplate,
  renameTemplate,
  deleteTemplate,
  addExerciseToTemplate,
  removeExerciseFromTemplate,
  getExercisesGrouped,
  getMuscles,
  createExercise,
} from "../queries";

const THEMES = [
  { id: "premium", label: "Premium", swatch: "#d4af37" },
  { id: "nike", label: "Nike", swatch: "#e11d27" },
  { id: "neon", label: "Néon", swatch: "#a855f7" },
  { id: "minimal", label: "Minimal", swatch: "#f5f5f5" },
];

/* ── Helper : réorganiser les exercices d'un template ── */
const reorderExercises = async (templateId, exercises) => {
  await Promise.all(
    exercises.map((exo, i) =>
      supabase
        .from("session_template_exercises")
        .update({ position: i })
        .eq("id", exo.templateExerciseId),
    ),
  );
};

/* ─── Sous-page : détail d'un template ─────────────────── */
const TemplateDetail = ({
  template,
  allExercises,
  muscles,
  onBack,
  onUpdated,
  onExerciseCreated,
}) => {
  const [name, setName] = useState(template.name);
  const [exercises, setExercises] = useState(template.exercises);
  const [saving, setSaving] = useState(false);
  const [addDrawer, setAddDrawer] = useState(false);
  const [filterMuscle, setFilterMuscle] = useState("");
  const [renaming, setRenaming] = useState(false);
  const [selected, setSelected] = useState(new Set());
  const [showNewExo, setShowNewExo] = useState(false);
  const [newExoName, setNewExoName] = useState("");
  const [newExoMuscle, setNewExoMuscle] = useState("");
  const [creatingExo, setCreatingExo] = useState(false);

  const muscleNames = Object.keys(allExercises).sort();
  const alreadyAdded = new Set(exercises.map((e) => e.exercise_id));

  const availableExos = Object.entries(allExercises)
    .filter(([muscle]) => !filterMuscle || muscle === filterMuscle)
    .sort(([a], [b]) => a.localeCompare(b))
    .flatMap(([muscle, exos]) =>
      exos
        .filter((exo) => !alreadyAdded.has(exo.id))
        .map((exo) => ({ ...exo, muscleName: muscle })),
    );

  const toggleSelect = (id) => {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const handleAddSelected = async () => {
    if (selected.size === 0) return;
    setSaving(true);
    try {
      const toAdd = availableExos.filter((e) => selected.has(e.id));
      const added = [];
      for (let i = 0; i < toAdd.length; i++) {
        const result = await addExerciseToTemplate(
          template.id,
          toAdd[i].id,
          exercises.length + i,
        );
        added.push({
          ...result,
          name: toAdd[i].name,
          muscleName: toAdd[i].muscleName,
        });
      }
      setExercises((prev) => [...prev, ...added]);
      setSelected(new Set());
      onUpdated();
      setAddDrawer(false);
      setFilterMuscle("");
    } catch (err) {
      console.error("Erreur ajout :", err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleRename = async () => {
    if (!name.trim() || name === template.name) {
      setRenaming(false);
      return;
    }
    setSaving(true);
    try {
      await renameTemplate(template.id, name);
      onUpdated();
      setRenaming(false);
    } catch (err) {
      console.error("Erreur renommage :", err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleCreateExercise = async () => {
    if (!newExoName.trim() || !newExoMuscle) return;
    setCreatingExo(true);
    try {
      const muscleEntry = muscles.find((m) => m.name === newExoMuscle);
      if (!muscleEntry) throw new Error("Muscle introuvable");
      const created = await createExercise(newExoName, muscleEntry.id);
      const added = await addExerciseToTemplate(
        template.id,
        created.id,
        exercises.length,
      );
      setExercises((prev) => [
        ...prev,
        { ...added, name: created.name, muscleName: newExoMuscle },
      ]);
      onExerciseCreated();
      onUpdated();
      setNewExoName("");
      setNewExoMuscle("");
      setShowNewExo(false);
      setAddDrawer(false);
    } catch (err) {
      console.error("Erreur création exo :", err.message);
      alert("Erreur lors de la création.");
    } finally {
      setCreatingExo(false);
    }
  };

  const handleRemove = async (te) => {
    setSaving(true);
    try {
      await removeExerciseFromTemplate(te.templateExerciseId);
      setExercises((prev) =>
        prev.filter((e) => e.templateExerciseId !== te.templateExerciseId),
      );
      onUpdated();
    } catch (err) {
      console.error("Erreur suppression :", err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleMove = async (index, direction) => {
    const newExos = [...exercises];
    const target = index + direction;
    if (target < 0 || target >= newExos.length) return;
    [newExos[index], newExos[target]] = [newExos[target], newExos[index]];
    setExercises(newExos);
    try {
      await reorderExercises(template.id, newExos);
      onUpdated();
    } catch (err) {
      console.error("Erreur réorganisation :", err.message);
      setExercises(exercises);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm(`Supprimer la séance "${template.name}" ?`)) return;
    setSaving(true);
    try {
      await deleteTemplate(template.id);
      onUpdated();
      onBack();
    } catch (err) {
      console.error("Erreur suppression template :", err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <div className="session-meta" style={{ marginBottom: 4 }}>
        <button
          className="btn btn--ghost"
          style={{ padding: "6px 10px", fontSize: 13 }}
          onClick={onBack}
        >
          <i className="ti ti-arrow-left" aria-hidden="true" /> Retour
        </button>
        <button
          className="btn btn--danger"
          style={{ padding: "6px 10px", fontSize: 13 }}
          onClick={handleDelete}
          disabled={saving}
        >
          <i className="ti ti-trash" aria-hidden="true" /> Supprimer
        </button>
      </div>

      <div style={{ marginBottom: 28 }}>
        {renaming ?
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleRename()}
              autoFocus
              style={{
                fontSize: 20,
                fontFamily: "var(--font-display)",
                fontWeight: 700,
              }}
            />
            <button
              className="btn btn--primary"
              onClick={handleRename}
              disabled={saving}
            >
              {saving ? "…" : "OK"}
            </button>
            <button
              className="btn btn--ghost"
              onClick={() => {
                setName(template.name);
                setRenaming(false);
              }}
            >
              Annuler
            </button>
          </div>
        : <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div className="session-title" style={{ marginBottom: 0 }}>
              {name}
            </div>
            <button
              className="btn--icon"
              onClick={() => setRenaming(true)}
              aria-label="Renommer"
            >
              <i className="ti ti-pencil" aria-hidden="true" />
            </button>
          </div>
        }
      </div>

      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: 12,
        }}
      >
        <h3>Exercices</h3>
        <span style={{ fontSize: 12, color: "var(--text3)" }}>
          {exercises.length} exercice{exercises.length > 1 ? "s" : ""}
        </span>
      </div>

      {exercises.length === 0 ?
        <div className="empty-state" style={{ padding: "24px 0" }}>
          <i className="ti ti-barbell" aria-hidden="true" />
          <p className="empty-state__sub">
            Aucun exercice — ajoute-en ci-dessous
          </p>
        </div>
      : <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 6,
            marginBottom: 16,
          }}
        >
          {exercises.map((exo, i) => (
            <div
              key={exo.templateExerciseId || i}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                padding: "10px 14px",
                background: "var(--bg2)",
                border: "0.5px solid var(--border2)",
                borderRadius: "var(--radius-md)",
              }}
            >
              <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                <button
                  className="btn--icon"
                  style={{
                    width: 24,
                    height: 24,
                    fontSize: 14,
                    opacity: i === 0 ? 0.2 : 1,
                  }}
                  onClick={() => handleMove(i, -1)}
                  disabled={i === 0 || saving}
                  aria-label="Monter"
                >
                  <i className="ti ti-chevron-up" aria-hidden="true" />
                </button>
                <button
                  className="btn--icon"
                  style={{
                    width: 24,
                    height: 24,
                    fontSize: 14,
                    opacity: i === exercises.length - 1 ? 0.2 : 1,
                  }}
                  onClick={() => handleMove(i, 1)}
                  disabled={i === exercises.length - 1 || saving}
                  aria-label="Descendre"
                >
                  <i className="ti ti-chevron-down" aria-hidden="true" />
                </button>
              </div>
              <span style={{ flex: 1 }}>
                <span
                  style={{
                    fontSize: 14,
                    fontWeight: 500,
                    color: "var(--text)",
                  }}
                >
                  {exo.name}
                </span>
                {exo.muscleName && (
                  <span
                    style={{
                      fontSize: 11,
                      color: "var(--text3)",
                      marginLeft: 8,
                    }}
                  >
                    {exo.muscleName}
                  </span>
                )}
              </span>
              <button
                className="btn--icon"
                style={{
                  width: 28,
                  height: 28,
                  color: "var(--danger)",
                  borderColor: "rgba(239,68,68,.25)",
                  flexShrink: 0,
                }}
                onClick={() => handleRemove(exo)}
                disabled={saving}
                aria-label="Retirer"
              >
                <i className="ti ti-x" aria-hidden="true" />
              </button>
            </div>
          ))}
        </div>
      }

      <button
        className="btn btn--ghost"
        style={{ width: "100%", marginBottom: 32 }}
        onClick={() => {
          setAddDrawer(true);
          setShowNewExo(false);
          setSelected(new Set());
        }}
      >
        <i className="ti ti-plus" aria-hidden="true" /> Ajouter des exercices
      </button>

      {addDrawer && (
        <>
          <div
            className="drawer-overlay"
            onClick={() => {
              setAddDrawer(false);
              setShowNewExo(false);
              setFilterMuscle("");
              setSelected(new Set());
            }}
          />
          <div
            className="drawer"
            style={{ maxHeight: "85vh", overflowY: "auto" }}
          >
            <div className="drawer-handle" />
            <div className="drawer-header">
              <span className="drawer-title">Ajouter des exercices</span>
              <button
                className="drawer-close"
                onClick={() => {
                  setAddDrawer(false);
                  setShowNewExo(false);
                  setFilterMuscle("");
                  setSelected(new Set());
                }}
                aria-label="Fermer"
              >
                <i className="ti ti-x" aria-hidden="true" />
              </button>
            </div>

            {showNewExo ?
              <div style={{ marginBottom: 16 }}>
                <div
                  style={{
                    fontSize: 12,
                    fontWeight: 500,
                    color: "var(--text3)",
                    textTransform: "uppercase",
                    letterSpacing: ".06em",
                    marginBottom: 12,
                  }}
                >
                  Nouvel exercice
                </div>
                <div className="form-group" style={{ marginBottom: 10 }}>
                  <label>
                    Nom de l'exercice
                    <input
                      value={newExoName}
                      onChange={(e) => setNewExoName(e.target.value)}
                      placeholder="ex: Curl Araignée, Hip Thrust..."
                      autoFocus
                    />
                  </label>
                </div>
                <div className="form-group" style={{ marginBottom: 16 }}>
                  <label>
                    Groupe musculaire
                    <select
                      value={newExoMuscle}
                      onChange={(e) => setNewExoMuscle(e.target.value)}
                    >
                      <option value="">Choisir un muscle…</option>
                      {muscles.map((m) => (
                        <option key={m.id} value={m.name}>
                          {m.name}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>
                <div style={{ display: "flex", gap: 8 }}>
                  <button
                    className="btn btn--primary"
                    style={{ flex: 1 }}
                    onClick={handleCreateExercise}
                    disabled={
                      creatingExo || !newExoName.trim() || !newExoMuscle
                    }
                  >
                    {creatingExo ? "Création…" : "Créer et ajouter"}
                  </button>
                  <button
                    className="btn btn--ghost"
                    onClick={() => {
                      setShowNewExo(false);
                      setNewExoName("");
                      setNewExoMuscle("");
                    }}
                  >
                    Annuler
                  </button>
                </div>
                <div className="divider" style={{ margin: "16px 0" }} />
              </div>
            : <button
                className="drawer-item"
                style={{
                  marginBottom: 12,
                  borderColor: "var(--accent-border)",
                  color: "var(--accent)",
                  background: "var(--accent-bg)",
                }}
                onClick={() => setShowNewExo(true)}
              >
                <span style={{ fontWeight: 600 }}>
                  <i
                    className="ti ti-sparkles"
                    aria-hidden="true"
                    style={{ marginRight: 6 }}
                  />
                  Créer un nouvel exercice
                </span>
                <i className="ti ti-chevron-right" aria-hidden="true" />
              </button>
            }

            <div style={{ marginBottom: 12 }}>
              <select
                value={filterMuscle}
                onChange={(e) => setFilterMuscle(e.target.value)}
              >
                <option value="">Tous les muscles</option>
                {muscleNames.map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </select>
            </div>

            <div
              className="drawer-list"
              style={{ marginBottom: selected.size > 0 ? 80 : 0 }}
            >
              {availableExos.map((exo) => {
                const isSelected = selected.has(exo.id);
                return (
                  <button
                    key={exo.id}
                    className="drawer-item"
                    style={
                      isSelected ?
                        {
                          borderColor: "var(--accent-border)",
                          background: "var(--accent-bg)",
                        }
                      : {}
                    }
                    onClick={() => toggleSelect(exo.id)}
                  >
                    <span>
                      <span style={{ color: "var(--text)", fontWeight: 500 }}>
                        {exo.name}
                      </span>
                      <span
                        style={{
                          fontSize: 11,
                          color: "var(--text3)",
                          marginLeft: 8,
                        }}
                      >
                        {exo.muscleName}
                      </span>
                    </span>
                    <div
                      style={{
                        width: 20,
                        height: 20,
                        borderRadius: 4,
                        flexShrink: 0,
                        border: `1.5px solid ${isSelected ? "var(--accent)" : "var(--border2)"}`,
                        background:
                          isSelected ? "var(--accent)" : "transparent",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      {isSelected && (
                        <i
                          className="ti ti-check"
                          style={{ fontSize: 13, color: "var(--bg)" }}
                          aria-hidden="true"
                        />
                      )}
                    </div>
                  </button>
                );
              })}
            </div>

            {selected.size > 0 && (
              <div
                style={{
                  position: "sticky",
                  bottom: 0,
                  padding: "12px 0 4px",
                  background: "var(--bg2)",
                  borderTop: "0.5px solid var(--border)",
                }}
              >
                <button
                  className="btn btn--primary"
                  style={{ width: "100%" }}
                  onClick={handleAddSelected}
                  disabled={saving}
                >
                  {saving ?
                    "Ajout…"
                  : `Ajouter ${selected.size} exercice${selected.size > 1 ? "s" : ""}`
                  }
                </button>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
};

/* ─── Page principale Profil ────────────────────────────── */
const ProfilePage = ({ theme, onThemeChange, user }) => {
  const [profile, setProfile] = useState(null);
  const [templates, setTemplates] = useState([]);
  const [allExercises, setAllExercises] = useState({});
  const [muscles, setMuscles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [subpage, setSubpage] = useState(null);
  const [editingName, setEditingName] = useState(false);
  const [username, setUsername] = useState("");
  const [savingName, setSavingName] = useState(false);
  const [newName, setNewName] = useState("");
  const [creating, setCreating] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const [prof, tpls, exos, musc] = await Promise.all([
        getProfile(),
        getTemplates(),
        getExercisesGrouped(),
        getMuscles(),
      ]);
      setProfile(prof);
      setUsername(prof.username);
      setTemplates(tpls);
      setAllExercises(exos);
      setMuscles(musc);
    } catch (err) {
      console.error("Erreur chargement profil :", err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const refreshTemplates = async () => {
    const tpls = await getTemplates();
    setTemplates(tpls);
  };
  const refreshExercises = async () => {
    const exos = await getExercisesGrouped();
    setAllExercises(exos);
  };

  const handleSaveName = async () => {
    if (!username.trim() || username === profile.username) {
      setEditingName(false);
      return;
    }
    setSavingName(true);
    try {
      const updated = await updateProfile(profile.id, username);
      setProfile(updated);
      setEditingName(false);
    } catch (err) {
      console.error("Erreur mise à jour profil :", err.message);
    } finally {
      setSavingName(false);
    }
  };

  const handleCreateTemplate = async () => {
    if (!newName.trim()) return;
    setCreating(true);
    try {
      const created = await createTemplate(newName);
      setTemplates((prev) => [...prev, created]);
      setNewName("");
      setSubpage({ template: created });
    } catch (err) {
      console.error("Erreur création template :", err.message);
    } finally {
      setCreating(false);
    }
  };

  /* ── Déconnexion ── */
  const handleLogout = async () => {
    setLoggingOut(true);
    try {
      await supabase.auth.signOut();
      // App.jsx détecte automatiquement la déconnexion via onAuthStateChange
    } catch (err) {
      console.error("Erreur déconnexion :", err.message);
      setLoggingOut(false);
    }
  };

  const initials = (profile?.username || user?.email || "?")
    .split(" ")
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  if (loading)
    return (
      <div className="empty-state">
        <i
          className="ti ti-loader-2"
          style={{ animation: "spin 1s linear infinite" }}
          aria-hidden="true"
        />
        <p className="empty-state__sub">Chargement…</p>
        <style>{`@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}`}</style>
      </div>
    );

  if (subpage?.template) {
    const currentTemplate =
      templates.find((t) => t.id === subpage.template.id) || subpage.template;
    return (
      <TemplateDetail
        template={currentTemplate}
        allExercises={allExercises}
        muscles={muscles}
        onBack={() => {
          setSubpage(null);
          refreshTemplates();
        }}
        onUpdated={refreshTemplates}
        onExerciseCreated={refreshExercises}
      />
    );
  }

  return (
    <div>
      <div className="session-title">Profil</div>

      {/* ── Mon compte ── */}
      <div style={{ marginBottom: 32 }}>
        <h3 style={{ marginBottom: 16 }}>Mon compte</h3>

        {/* Avatar + infos */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 16,
            marginBottom: 20,
          }}
        >
          <div
            style={{
              width: 56,
              height: 56,
              borderRadius: "50%",
              background: "var(--accent-bg)",
              border: "2px solid var(--accent-border)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontFamily: "var(--font-display)",
              fontSize: 20,
              fontWeight: 700,
              color: "var(--accent)",
            }}
          >
            {initials}
          </div>
          <div>
            <div
              style={{ fontSize: 16, fontWeight: 600, color: "var(--text)" }}
            >
              {profile?.username || "Mon profil"}
            </div>
            <div style={{ fontSize: 12, color: "var(--text3)", marginTop: 2 }}>
              {user?.email}
            </div>
          </div>
        </div>

        {/* Nom d'utilisateur */}
        <div className="card" style={{ marginBottom: 10 }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <div style={{ flex: 1 }}>
              <div
                style={{
                  fontSize: 11,
                  color: "var(--text3)",
                  textTransform: "uppercase",
                  letterSpacing: ".08em",
                  marginBottom: 4,
                }}
              >
                Nom d'affichage
              </div>
              {editingName ?
                <div
                  style={{
                    display: "flex",
                    gap: 8,
                    alignItems: "center",
                    marginTop: 8,
                  }}
                >
                  <input
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleSaveName()}
                    autoFocus
                    style={{ fontSize: 15 }}
                  />
                  <button
                    className="btn btn--primary"
                    onClick={handleSaveName}
                    disabled={savingName}
                    style={{ padding: "8px 14px" }}
                  >
                    {savingName ? "…" : "OK"}
                  </button>
                  <button
                    className="btn btn--ghost"
                    onClick={() => {
                      setUsername(profile.username);
                      setEditingName(false);
                    }}
                    style={{ padding: "8px 14px" }}
                  >
                    ✕
                  </button>
                </div>
              : <div
                  style={{
                    fontSize: 15,
                    color: "var(--text)",
                    fontWeight: 500,
                  }}
                >
                  {profile?.username}
                </div>
              }
            </div>
            {!editingName && (
              <button
                className="btn--icon"
                onClick={() => setEditingName(true)}
                aria-label="Modifier le nom"
              >
                <i className="ti ti-pencil" aria-hidden="true" />
              </button>
            )}
          </div>
        </div>

        {/* Email */}
        <div className="card" style={{ marginBottom: 12 }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <div>
              <div
                style={{
                  fontSize: 11,
                  color: "var(--text3)",
                  textTransform: "uppercase",
                  letterSpacing: ".08em",
                  marginBottom: 4,
                }}
              >
                Email
              </div>
              <div
                style={{ fontSize: 15, color: "var(--text)", fontWeight: 500 }}
              >
                {user?.email}
              </div>
            </div>
            <i
              className="ti ti-mail"
              style={{ color: "var(--text3)", fontSize: 18 }}
              aria-hidden="true"
            />
          </div>
        </div>

        {/* Déconnexion */}
        <button
          className="btn btn--danger"
          style={{ width: "100%" }}
          onClick={handleLogout}
          disabled={loggingOut}
        >
          {loggingOut ?
            <>
              <i
                className="ti ti-loader-2"
                style={{ animation: "spin .8s linear infinite" }}
                aria-hidden="true"
              />{" "}
              Déconnexion…
            </>
          : <>
              <i className="ti ti-logout" aria-hidden="true" /> Se déconnecter
            </>
          }
        </button>
      </div>

      {/* ── Apparence ── */}
      <div style={{ marginBottom: 32 }}>
        <h3 style={{ marginBottom: 16 }}>Apparence</h3>
        <div className="theme-grid">
          {THEMES.map((t) => (
            <button
              key={t.id}
              className={`theme-option ${theme === t.id ? "theme-option--active" : ""}`}
              onClick={() => onThemeChange(t.id)}
            >
              <div className="theme-swatch" style={{ background: t.swatch }} />
              <span className="theme-option__name">{t.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* ── Mes séances ── */}
      <div>
        <h3 style={{ marginBottom: 16 }}>Mes séances</h3>
        <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
          <input
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleCreateTemplate()}
            placeholder="Nom de la séance… ex: Push, Pec Day 1"
            style={{ flex: 1 }}
          />
          <button
            className="btn btn--primary"
            onClick={handleCreateTemplate}
            disabled={creating || !newName.trim()}
            style={{ whiteSpace: "nowrap" }}
          >
            {creating ?
              "…"
            : <>
                <i className="ti ti-plus" aria-hidden="true" /> Créer
              </>
            }
          </button>
        </div>

        {templates.length === 0 ?
          <div className="empty-state" style={{ padding: "32px 0" }}>
            <i className="ti ti-layout-list" aria-hidden="true" />
            <p className="empty-state__title">Aucune séance créée</p>
            <p className="empty-state__sub">
              Crée ta première séance type ci-dessus
            </p>
          </div>
        : <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {templates.map((t) => (
              <button
                key={t.id}
                className="drawer-item"
                onClick={() => setSubpage({ template: t })}
              >
                <span
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "flex-start",
                    gap: 3,
                  }}
                >
                  <span
                    style={{
                      color: "var(--text)",
                      fontWeight: 600,
                      fontSize: 14,
                    }}
                  >
                    {t.name}
                  </span>
                  <span style={{ fontSize: 11, color: "var(--text3)" }}>
                    {t.exercises.length === 0 ?
                      "Aucun exercice — configure cette séance"
                    : t.exercises.map((e) => e.name).join(" · ")}
                  </span>
                </span>
                <i className="ti ti-chevron-right" aria-hidden="true" />
              </button>
            ))}
          </div>
        }
      </div>

      <style>{`@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}`}</style>
    </div>
  );
};

export default ProfilePage;
