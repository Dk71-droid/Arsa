import type { Student, TujuanPembelajaran, Assessment } from '../../types';

export const calculateTpCompletion = (tp: TujuanPembelajaran, students: Student[]): { tuntasCount: number, totalStudents: number, notTuntasStudents: Student[] } => {
    if (!tp.kktp || tp.kktp.rubrik.length === 0 || students.length === 0) {
        return { tuntasCount: 0, totalStudents: students.length, notTuntasStudents: students };
    }

    const requiredAspek = tp.kktp.rubrik.map(r => r.aspek);
    let tuntasCount = 0;
    const notTuntasStudents: Student[] = [];

    students.forEach(student => {
        // Find all the latest assessments for each required aspect for this student and TP.
        const latestAssessments = new Map<string, Assessment>();
        student.assessments
            .filter(a => a.tpId === tp.id)
            .forEach(a => {
                const existing = latestAssessments.get(a.aspek);
                if (!existing || a.pertemuan > existing.pertemuan) {
                    latestAssessments.set(a.aspek, a);
                }
            });

        // Check if the student is tuntas based on the latest assessments.
        let isStudentTuntas = true;
        for (const aspek of requiredAspek) {
            const latestAssessment = latestAssessments.get(aspek);
            // If any aspect is not assessed or is below level 3, student is not tuntas.
            if (!latestAssessment || latestAssessment.level < 3) {
                isStudentTuntas = false;
                break;
            }
        }

        if (isStudentTuntas) {
            tuntasCount++;
        } else {
            notTuntasStudents.push(student);
        }
    });

    return { tuntasCount, totalStudents: students.length, notTuntasStudents };
};

export const findLingeringWeakness = (tp: TujuanPembelajaran, students: Student[]): { aspectName: string; nonTuntasCount: number } | null => {
    if (!tp.kktp || tp.kktp.rubrik.length === 0 || students.length === 0) {
        return null;
    }
    
    // Create a map for each student's latest assessments for this TP for efficiency
    const latestAssessmentsByStudent = new Map<number, Map<string, Assessment>>();
    students.forEach(student => {
        const studentAssessments = new Map<string, Assessment>();
        student.assessments
            .filter(a => a.tpId === tp.id)
            .forEach(a => {
                const existing = studentAssessments.get(a.aspek);
                if (!existing || a.pertemuan > existing.pertemuan) {
                    studentAssessments.set(a.aspek, a);
                }
            });
        latestAssessmentsByStudent.set(student.id, studentAssessments);
    });

    let weaknesses: { aspectName: string; nonTuntasCount: number }[] = [];

    for (const aspekRubrik of tp.kktp.rubrik) {
        const aspek = aspekRubrik.aspek;
        let nonTuntasCount = 0;

        for (const student of students) {
            const studentAssessments = latestAssessmentsByStudent.get(student.id);
            const latestAssessment = studentAssessments?.get(aspek);

            if (!latestAssessment || latestAssessment.level < 3) {
                nonTuntasCount++;
            }
        }
        
        if (nonTuntasCount > 0) {
            weaknesses.push({ aspectName: aspek, nonTuntasCount });
        }
    }

    if (weaknesses.length === 0) {
        return null;
    }

    // Sort to find the aspect with the most non-tuntas students
    weaknesses.sort((a, b) => b.nonTuntasCount - a.nonTuntasCount);
    
    // Return the biggest weakness
    return weaknesses[0];
};