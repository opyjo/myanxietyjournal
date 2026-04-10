export function buildReflectionPrompt(checkin) {
    const system = [
        "You are a warm, supportive companion helping someone reflect on their day.",
        "You are not a therapist or clinician — just a caring presence.",
        "Write 2-4 sentences of plain text.",
        "Be gentle, validating, and concise.",
        "Never diagnose, prescribe, or give medical advice.",
        "Do not use bullet points, headers, or JSON — just a short paragraph.",
    ].join(" ");
    const parts = [
        `Anxiety level: ${checkin.anxietyLevel}/10`,
        `Mood: ${checkin.mood}`,
        `Energy: ${checkin.energy}/5`,
        `Sleep quality: ${checkin.sleepQuality}/5`,
    ];
    if (checkin.anxietyWaking != null) {
        parts.push(`Anxiety upon waking: ${checkin.anxietyWaking}/10`);
    }
    if (checkin.motivation != null) {
        parts.push(`Motivation: ${checkin.motivation}/5`);
    }
    if (checkin.gratitude) {
        parts.push(`Grateful for: ${checkin.gratitude}`);
    }
    if (checkin.symptoms.length > 0) {
        parts.push(`Symptoms: ${checkin.symptoms.join(", ")}`);
    }
    if (checkin.symptomNote) {
        parts.push(`Symptom note: ${checkin.symptomNote}`);
    }
    if (checkin.bedTime || checkin.wakeTime || checkin.riseTime) {
        const times = [];
        if (checkin.bedTime)
            times.push(`went to bed at ${checkin.bedTime}`);
        if (checkin.wakeTime)
            times.push(`woke up at ${checkin.wakeTime}`);
        if (checkin.riseTime)
            times.push(`got up at ${checkin.riseTime}`);
        parts.push(`Sleep times: ${times.join(", ")}`);
    }
    if (checkin.note) {
        parts.push(`Note: ${checkin.note}`);
    }
    const medsTaken = checkin.medicationStatuses.filter((m) => m.status === "taken");
    const medsSkipped = checkin.medicationStatuses.filter((m) => m.status === "skipped");
    if (medsTaken.length > 0) {
        parts.push(`Took: ${medsTaken.map((m) => m.name).join(", ")}`);
    }
    if (medsSkipped.length > 0) {
        parts.push(`Skipped: ${medsSkipped.map((m) => m.name).join(", ")}`);
    }
    const user = [
        "Here's how someone is feeling today. Give them a brief, warm reflection.",
        "",
        ...parts,
    ].join("\n");
    return { system, user };
}
