import { Head } from '@inertiajs/react';
import { useAudit } from '@/hooks/useAudit';
import AuditNav from '@/components/audit/AuditNav';
import InputScreen from '@/screens/InputScreen';
import LoadingScreen from '@/screens/LoadingScreen';
import ReportScreen from '@/screens/ReportScreen';

export default function Audit() {
    const {
        screen,
        auditId,
        report,
        submitError,
        liveFindings,
        currentStage,
        submitUrl,
        submitFile,
        reset,
    } = useAudit();

    return (
        <>
            <Head title="AuditHawk" />
            <div
                className="audit-root min-h-screen bg-[#060608]"
                style={{
                    backgroundImage: [
                        'radial-gradient(ellipse 60% 40% at 50% -10%, rgba(0,229,255,0.06) 0%, transparent 70%)',
                        'radial-gradient(ellipse 40% 30% at 90% 80%, rgba(167,139,250,0.04) 0%, transparent 60%)',
                    ].join(', '),
                }}
            >
                <AuditNav />

                {screen === 'input' && (
                    <InputScreen
                        onSubmitUrl={submitUrl}
                        onSubmitFile={submitFile}
                        error={submitError}
                    />
                )}

                {screen === 'loading' && (
                    <LoadingScreen
                        auditId={auditId}
                        currentStage={currentStage}
                        liveFindings={liveFindings}
                    />
                )}

                {screen === 'report' && report && (
                    <ReportScreen report={report} onReset={reset} />
                )}
            </div>
        </>
    );
}

Audit.layout = null;
