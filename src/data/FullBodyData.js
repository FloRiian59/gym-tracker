const FullBodyData = {
    id: "weekend-full-body",
    day: "Weekend",
    dayIndex: [6, 0],
    muscles: ["Dos", "Épaules", "Pecs", "Triceps", "Biceps", "Jambes"],
    exercises: {
        Dos: [
            { id: "vertical-pull", name: "Tirage Vertical" },
            { id: "vertical-pull-ul", name: "Tirage Vertical Unilatéral" },
            { id: "horizontal-pull", name: "Tirage Horizontal" },
            { id: "pull-over", name: "Pull Over" },
            { id: "back-extension", name: "Extension Lombaire" },
        ],
        Épaules: [
            { id: "military-press-db", name: "Développé Militaire Haltères" },
            { id: "military-press-smith", name: "Développé Militaire Smith" },
            { id: "lateral-raises-db", name: "Élévation Latérale Haltères" },
            { id: "lateral-raises-pulley", name: "Élévation Latérale Poulie" },
            { id: "rear-shoulder-pull", name: "Tirage Arrière d'Épaule" },
            { id: "rear-shoulder", name: "Arrière d'Épaule Machine" },
        ],
        Pecs: [
            { id: "bench-press", name: "Couché Barre" },
            { id: "bench-db", name: "Couché Haltères" },
            { id: "incline-smith", name: "Incliné Smith" },
            { id: "incline-db", name: "Incliné Haltères" },
            { id: "pec-fly", name: "Pec Fly" },
        ],
        Triceps: [
            { id: "neutral-press-db", name: "Développé Couché Haltères (Prise Neutre)" },
            { id: "rope-extension", name: "Extension Corde" },
            { id: "rod-extension", name: "Extension Barre poulie" },
            { id: "rope-extension-ul", name: "Extension Corde Unilatéral" },
        ],
        Biceps: [
            { id: "baysian-curl", name: "Bayesian Curl" },
            { id: "biceps-curl", name: "Biceps Curl" },
            { id: "hammer-curl", name: "Curl Marteau" },
            { id: "hammer-curl-pulley", name: "Curl Marteau Poulie" },
            { id: "spider-curl", name: "Curl Spider" },
            { id: "forearm-curl", name: "Curl Avant Bras Unilatéral" },
        ],
        Jambes: [
            { id: "leg-press", name: "Presse à Cuisses" },
            { id: "leg-extension", name: "Leg Extension" },
            { id: "leg-curl", name: "Leg Curl" },
            { id: "lying-leg-curl", name: "Leg Curl Allongé" },
            { id: "adductor", name: "Adducteur" },
            { id: "abductor", name: "Abducteur" },
        ],
    },
};

export default FullBodyData;
