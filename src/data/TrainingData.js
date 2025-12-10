const TrainingData = [
    {
        id: "monday-pecs-triceps",
        day: "Lundi",
        dayIndex: 1,
        muscles: ["Pecs", "Triceps"],
        exercises: {
            Pecs: [
                { id: "bench-press", name: "Couché Barre" },
                { id: "bench-db", name: "Couché Haltères" },
                { id: "incline-smith", name: "Incliné Smith" },
                { id: "incline-db", name: "Incliné Haltères" },
                { id: "pec-fly", name: "Pec Fly" },
            ],
            Triceps: [
                { id: "rope-extension", name: "Extension Corde" },
                { id: "rod-extension", name: "Extension Barre poulie" },
                { id: "rope-extension-ul", name: "Extension Corde Unilatéral" },
            ]
        }
    },
    {
        id: "tuesday-back-forearms",
        day: "Mardi",
        dayIndex: 2,
        muscles: ["Dos", "Avant-bras"],
        exercises: {
            Dos: [
                { id: "vertical-pull", name: "Tirage Vertical" },
                { id: "vertical-pull-ul", name: "Tirage Vertical Unilatéral" },
                { id: "horizontal-pull", name: "Tirage Horizontal" },
                { id: "pull-over", name: "Pull Over" },
                { id: "back-extension", name: "Extension Lombaire" },
            ],
            "Avant-bras": [
                { id: "hammer-curl", name: "Curl Marteau" },
                { id: "spider-curl", name: "Curl Spider" },
                { id: "forearm-curl", name: "Curl Avant Bras Unilatéral" },
            ]
        }
    },
    {
        id: "wednesday-shoulders",
        day: "Mercredi",
        dayIndex: 3,
        muscles: ["Épaules"],
        exercises: {
            Épaules: [
                { id: "military-press-db", name: "Développé Militaire Haltères" },
                { id: "military-press-smith", name: "Développé Militaire Smith" },
                { id: "lateral-raises-db", name: "Élévation Latérale Haltères" },
                { id: "lateral-raises-pulley", name: "Élévation Latérale Poulie" },
                { id: "rear-shoulder-pull", name: "Tirage Arrière d'Épaule" },
                { id: "rear-shoulder", name: "Arrière d'Épaule Machine" },
            ]
        }
    },
    {
        id: "thursday-biceps-triceps",
        day: "Jeudi",
        dayIndex: 4,
        muscles: ["Biceps", "Triceps"],
        exercises: {
            Biceps: [
                { id: "baysian-curl", name: "Bayesian Curl" },
                { id: "biceps-curl", name: "Biceps Curl" },
                { id: "hammer-curl", name: "Curl Marteau" },
                { id: "hammer-curl-pulley", name: "Curl Marteau Poulie" },
            ],
            Triceps: [
                { id: "neutral-press-db", name: "Développé Couché Haltères (Prise Neutre)" },
                { id: "rope-extension", name: "Extension Corde" },
                { id: "rod-extension", name: "Extension Barre poulie" },
                { id: "rope-extension-ul", name: "Extension Corde Unilatéral" },
            ]
        }
    },
    {
        id: "friday-pecs",
        day: "Vendredi",
        dayIndex: 5,
        muscles: ["Pecs"],
        exercises: {
            Pecs: [
                { id: "bench-press", name: "Couché Barre" },
                { id: "bench-db", name: "Couché Haltères" },
                { id: "incline-smith", name: "Incliné Smith" },
                { id: "incline-db", name: "Incliné Haltères" },
                { id: "pec-fly", name: "Écarté Machine" },
            ]
        }
    }
]

export default TrainingData;
