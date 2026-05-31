import { supabase } from "./supabaseClient";

/* ── Helper : récupère l'ID de l'utilisateur connecté ── */
const getUserId = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Non connecté");
    return user.id;
};

/* ─────────────────────────────────────────────────────────
   MUSCLES
───────────────────────────────────────────────────────── */

/** Récupère tous les groupes musculaires triés par nom */
export const getMuscles = async () => {
    const { data, error } = await supabase
        .from("muscles")
        .select("*")
        .order("name");
    if (error) throw error;
    return data;
};

/* ─────────────────────────────────────────────────────────
   EXERCISES
───────────────────────────────────────────────────────── */

/**
 * Récupère tous les exercices avec leur muscle associé
 * Retourne un objet groupé par nom de muscle :
 * { "Biceps": [{ id, name, muscle_id }], "Dos": [...] }
 */
export const getExercisesGrouped = async () => {
    const { data, error } = await supabase
        .from("exercises")
        .select("id, name, muscle_id, muscles(name)")
        .order("name");
    if (error) throw error;

    return data.reduce((acc, exo) => {
        // Supabase peut retourner muscles comme objet OU tableau selon la version
        const muscleRaw = exo.muscles;
        const muscleName = Array.isArray(muscleRaw)
            ? (muscleRaw[0]?.name || "Autre")
            : (muscleRaw?.name || "Autre");
        if (!acc[muscleName]) acc[muscleName] = [];
        acc[muscleName].push({ id: exo.id, name: exo.name, muscle_id: exo.muscle_id, muscleName });
        return acc;
    }, {});
};

/**
 * Récupère les exercices d'un muscle spécifique
 * @param {string} muscleId - UUID du muscle
 */
export const getExercisesByMuscle = async (muscleId) => {
    const { data, error } = await supabase
        .from("exercises")
        .select("id, name, muscle_id")
        .eq("muscle_id", muscleId)
        .order("name");
    if (error) throw error;
    return data;
};

/**
 * Crée un nouvel exercice
 * @param {string} name      - Nom de l'exercice
 * @param {string} muscleId  - UUID du muscle
 */
export const createExercise = async (name, muscleId) => {
    const { data, error } = await supabase
        .from("exercises")
        .insert({ name: name.trim(), muscle_id: muscleId, user_id: (await getUserId()) })
        .select()
        .single();
    if (error) throw error;
    return data;
};

/**
 * Supprime un exercice par son ID
 * @param {string} exerciseId - UUID de l'exercice
 */
export const deleteExercise = async (exerciseId) => {
    const { error } = await supabase
        .from("exercises")
        .delete()
        .eq("id", exerciseId);
    if (error) throw error;
};

/* ─────────────────────────────────────────────────────────
   SESSIONS
───────────────────────────────────────────────────────── */

/**
 * Récupère ou crée la séance du jour
 * Une seule séance par date — si elle existe déjà on la retourne
 * @param {string} date         - Format "YYYY-MM-DD"
 * @param {string} sessionType  - "classic" | "full-body"
 * @param {string} label        - Label lisible ex: "Pecs / Triceps"
 */
export const createSession = async (date, sessionType = "classic", label = "") => {
    const userId = await getUserId();
    const { data, error } = await supabase
        .from("sessions")
        .insert({ session_date: date, session_type: sessionType, label, user_id: userId })
        .select()
        .single();
    if (error) throw error;
    return data;
};

/**
 * Récupère toutes les sessions du jour (peut y en avoir plusieurs)
 * Retourne un tableau trié par created_at ASC
 */
export const getSessionsByDate = async (date) => {
    const { data, error } = await supabase
        .from("sessions")
        .select(`
      id,
      session_date,
      session_type,
      label,
      sets (
        id,
        set_number,
        weight_kg,
        reps,
        rpe,
        is_warmup,
        is_pr,
        exercise_id,
        exercises ( name )
      )
    `)
        .eq("session_date", date)
        .eq("user_id", await getUserId())
        .order("created_at", { ascending: true });
    if (error) throw error;
    return data || [];
};

/**
 * Récupère toutes les séances avec leurs séries (pour l'historique)
 * Triées de la plus récente à la plus ancienne
 */
export const getAllSessions = async () => {
    const { data, error } = await supabase
        .from("sessions")
        .select(`
      id,
      session_date,
      session_type,
      label,
      sets (
        id,
        set_number,
        weight_kg,
        reps,
        rpe,
        is_warmup,
        is_pr,
        exercise_id,
        exercises ( name )
      )
    `)
        .eq("user_id", await getUserId())
        .order("session_date", { ascending: false });
    if (error) throw error;
    return data;
};

/**
 * Récupère la séance d'une date précise avec toutes ses séries
 * @param {string} date - Format "YYYY-MM-DD"
 */
export const getSessionByDate = async (date) => {
    const sessions = await getSessionsByDate(date);
    // Retourne la dernière session du jour qui a des sets
    const withSets = sessions.filter(s => s.sets && s.sets.length > 0);
    return withSets.length > 0 ? withSets[withSets.length - 1] : (sessions.length > 0 ? sessions[sessions.length - 1] : null);
};

/* ─────────────────────────────────────────────────────────
   SETS (séries)
───────────────────────────────────────────────────────── */

/**
 * Récupère toutes les séries d'une séance, groupées par exercice
 * Retourne : { [exerciseId]: { exoName, series: [...] } }
 * @param {string} sessionId - UUID de la séance
 */
export const getSetsBySession = async (sessionId) => {
    const { data, error } = await supabase
        .from("sets")
        .select(`
      id,
      set_number,
      weight_kg,
      reps,
      rpe,
      is_warmup,
      is_pr,
      exercise_id,
      exercises ( name )
    `)
        .eq("session_id", sessionId)
        .order("created_at");
    if (error) throw error;

    // On groupe par exercise_id pour correspondre à la structure qu'utilisait le localStorage
    return data.reduce((acc, set) => {
        const exoId = set.exercise_id;
        if (!acc[exoId]) {
            acc[exoId] = { exoName: set.exercises?.name || "Inconnu", series: [] };
        }
        acc[exoId].series.push({
            id: set.id,
            serie: set.set_number,
            charge: set.weight_kg,
            reps: set.reps,
            rpe: set.rpe,
            isWarmup: set.is_warmup,
            isPR: set.is_pr,
        });
        return acc;
    }, {});
};

/**
 * Ajoute une série à une séance
 * @param {string} sessionId   - UUID de la séance
 * @param {string} exerciseId  - UUID de l'exercice
 * @param {object} setData     - { serie, charge, reps, rpe, isWarmup, isPR }
 */
export const addSet = async (sessionId, exerciseId, setData) => {
    const userId = await getUserId();
    const { data, error } = await supabase
        .from("sets")
        .insert({
            session_id: sessionId,
            exercise_id: exerciseId,
            user_id: userId,
            set_number: setData.isWarmup ? null : setData.serie,
            weight_kg: setData.charge,
            reps: setData.reps,
            rpe: setData.rpe || null,
            is_warmup: setData.isWarmup,
            is_pr: setData.isPR && !setData.isWarmup,
        })
        .select()
        .single();
    if (error) throw error;
    return data;
};

/**
 * Modifie une série existante
 * @param {string} setId    - UUID de la série
 * @param {object} setData  - { serie, charge, reps, rpe, isWarmup, isPR }
 */
export const updateSet = async (setId, setData) => {
    const { data, error } = await supabase
        .from("sets")
        .update({
            set_number: setData.isWarmup ? null : setData.serie,
            weight_kg: setData.charge,
            reps: setData.reps,
            rpe: setData.rpe || null,
            is_warmup: setData.isWarmup,
            is_pr: setData.isPR && !setData.isWarmup,
        })
        .eq("id", setId)
        .select()
        .single();
    if (error) throw error;
    return data;
};

/**
 * Supprime une série
 * @param {string} setId - UUID de la série
 */
export const deleteSet = async (setId) => {
    const { error } = await supabase
        .from("sets")
        .delete()
        .eq("id", setId);
    if (error) throw error;
};

/* ─────────────────────────────────────────────────────────
   PROFILE
───────────────────────────────────────────────────────── */

/**
 * Récupère le profil (il n'y en a qu'un)
 * Si aucun profil n'existe, en crée un par défaut
 */
export const getProfile = async () => {
    const userId = await getUserId();
    const { data: rows, error } = await supabase
        .from("profile")
        .select("*")
        .eq("user_id", userId)
        .limit(1);
    if (error) throw error;

    if (rows && rows.length > 0) return rows[0];

    // Aucun profil pour cet utilisateur → on en crée un
    const { data: created, error: createError } = await supabase
        .from("profile")
        .insert({ username: "Mon profil", user_id: userId })
        .select()
        .single();
    if (createError) throw createError;
    return created;
};

/**
 * Met à jour le nom du profil
 * @param {string} profileId - UUID du profil
 * @param {string} username  - Nouveau nom
 */
export const updateProfile = async (profileId, username) => {
    const { data, error } = await supabase
        .from("profile")
        .update({ username: username.trim() })
        .eq("id", profileId)
        .select()
        .single();
    if (error) throw error;
    return data;
};

/* ─────────────────────────────────────────────────────────
   SESSION TEMPLATES
───────────────────────────────────────────────────────── */

/**
 * Récupère tous les templates avec leurs exercices
 * Retourne : [{ id, name, exercises: [{ id, name, position, exercise_id }] }]
 */
export const getTemplates = async () => {
    const userId = await getUserId();
    const { data, error } = await supabase
        .from("session_templates")
        .select(`
      id,
      name,
      created_at,
      session_template_exercises (
        id,
        position,
        exercise_id,
        exercises ( id, name, muscles(name) )
      )
    `)
        .eq("user_id", userId)
        .order("created_at");
    if (error) throw error;

    return data.map(t => ({
        id: t.id,
        name: t.name,
        exercises: (t.session_template_exercises || [])
            .sort((a, b) => a.position - b.position)
            .map(te => ({
                templateExerciseId: te.id,
                exercise_id: te.exercise_id,
                position: te.position,
                name: te.exercises?.name || "Inconnu",
                muscleName: te.exercises?.muscles?.name || "",
            })),
    }));
};

/**
 * Crée un nouveau template
 * @param {string} name - Nom du template (ex: "Push", "Pull")
 */
export const createTemplate = async (name) => {
    const { data, error } = await supabase
        .from("session_templates")
        .insert({ name: name.trim(), user_id: (await getUserId()) })
        .select()
        .single();
    if (error) throw error;
    return { id: data.id, name: data.name, exercises: [] };
};

/**
 * Renomme un template
 * @param {string} templateId - UUID du template
 * @param {string} name       - Nouveau nom
 */
export const renameTemplate = async (templateId, name) => {
    const { data, error } = await supabase
        .from("session_templates")
        .update({ name: name.trim() })
        .eq("id", templateId)
        .select()
        .single();
    if (error) throw error;
    return data;
};

/**
 * Supprime un template (et ses exercices liés via cascade)
 * @param {string} templateId - UUID du template
 */
export const deleteTemplate = async (templateId) => {
    const { error } = await supabase
        .from("session_templates")
        .delete()
        .eq("id", templateId);
    if (error) throw error;
};

/**
 * Ajoute un exercice à un template
 * @param {string} templateId  - UUID du template
 * @param {string} exerciseId  - UUID de l'exercice (Supabase)
 * @param {number} position    - Ordre dans la liste
 */
export const addExerciseToTemplate = async (templateId, exerciseId, position = 0) => {
    const { data, error } = await supabase
        .from("session_template_exercises")
        .insert({ template_id: templateId, exercise_id: exerciseId, position, user_id: (await getUserId()) })
        .select(`
      id,
      position,
      exercise_id,
      exercises ( id, name, muscles(name) )
    `)
        .single();
    if (error) throw error;
    return {
        templateExerciseId: data.id,
        exercise_id: data.exercise_id,
        position: data.position,
        name: data.exercises?.name || "Inconnu",
        muscleName: data.exercises?.muscles?.name || "",
    };
};

/**
 * Retire un exercice d'un template
 * @param {string} templateExerciseId - UUID de la ligne session_template_exercises
 */
export const removeExerciseFromTemplate = async (templateExerciseId) => {
    const { error } = await supabase
        .from("session_template_exercises")
        .delete()
        .eq("id", templateExerciseId);
    if (error) throw error;
};

/**
 * Démarre une séance à partir d'un template
 * Crée la session du jour si elle n'existe pas encore
 * @param {string} date         - "YYYY-MM-DD"
 * @param {string} templateName - Nom lisible pour le label
 */
export const startSessionFromTemplate = async (date, templateName) => {
    return await createSession(date, "classic", templateName);
};