import type { CheckResult } from '../types';
import { CheckStatus } from '../types';

export const generateReport = (results: Record<string, CheckResult>) => {
    const report: any = {
        timestamp: Date.now(),
    };

    const mapStatus = (status: CheckStatus | undefined) => {
        if (status === CheckStatus.SUCCESS) return 'ok';
        if (status === CheckStatus.FAIL) return 'fail';
        return undefined;
    };
    
    report.ui = mapStatus(results['ui-health']?.status);
    report.bff = mapStatus(results['bff-health']?.status);
    report.port = results['port-conflict']?.status === CheckStatus.SUCCESS ? 'open' : 'occupied';
    report.json_syntax = mapStatus(results['json-syntax']?.status);
    report.dependency_path = mapStatus(results['dependency-path']?.status);
    
    const envMismatch = results['env-mismatch'];
    const envCompleteness = results['env-completeness'];
    const envIssues = [];
    if (envMismatch?.status === CheckStatus.FAIL) {
        envIssues.push({ type: 'mismatch', message: envMismatch.message });
    }
    if (envCompleteness?.status === CheckStatus.FAIL) {
        envIssues.push({ type: 'missing', message: envCompleteness.message });
    }

    if (envIssues.length > 0) {
        report.env = { issues: envIssues };
    } else if (envMismatch?.status === CheckStatus.SUCCESS && envCompleteness?.status === CheckStatus.SUCCESS) {
        report.env = 'ok';
    }

    Object.keys(report).forEach(key => report[key] === undefined && delete report[key]);

    return JSON.stringify(report, null, 2);
};
