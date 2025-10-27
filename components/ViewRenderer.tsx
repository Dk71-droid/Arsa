import React from 'react';
import { Welcome } from './Welcome';
import { DashboardView } from './DashboardView';
import { SettingsView } from './SettingsView';
import { AttendanceView } from './AttendanceView';
import { FormativeAssessor } from './FormativeAssessor';
import { SummativeAssessor } from './SummativeAssessor';
import { ReportView } from './ReportView';
import { RancanganPembelajaranView } from './RancanganPembelajaranView';
import { AssessmentMenuView } from './AssessmentMenuView';
import { HtmlPreviewView } from './HtmlPreviewView';
import { HafalanView } from './HafalanView';

import { useAppData } from '../hooks/useAppData';

export const ViewRenderer: React.FC = () => {
    const { activeView } = useAppData();

    switch(activeView) {
        case 'dashboard':
            return <DashboardView />;
        case 'settings':
            return <SettingsView />;
        case 'rancanganPembelajaran':
            return <RancanganPembelajaranView />;
        case 'absensi':
            return <AttendanceView />;
        case 'assessor':
            return <FormativeAssessor />;
        case 'summativeAssessor':
            return <SummativeAssessor />;
        case 'reportView':
            return <ReportView />;
        case 'hafalan':
            return <HafalanView />;
        case 'assessmentMenuView':
            return <AssessmentMenuView />;
        case 'htmlPreview':
            return <HtmlPreviewView />;
        default:
            return <Welcome />;
    }
};