import { CHECKS } from '../constants';
import { CheckStatus } from '../types';
import type { CheckResult } from '../types';

interface ReportJson {
    timestamp: number;
    ui?: 'ok' | 'fail';
    bff?: 'ok' | 'fail';
    port?: 'open' | 'occupied';
    env?: 'ok' | { issues: {type: string; message: string}[] };
    json_syntax?: 'ok' | 'fail';
    dependency_path?: 'ok' | 'fail';
}

export const mapReportToResults = (report: ReportJson): Record<string, CheckResult> => {
    const results: Record<string, CheckResult> = {};

    const checkMap: Record<string, (r: ReportJson) => Partial<CheckResult>> = {
        'ui-health': (r) => ({
            status: r.ui === 'ok' ? CheckStatus.SUCCESS : CheckStatus.FAIL,
            message: r.ui === 'ok' ? 'UI is available.' : 'UI health check failed.',
        }),
        'bff-health': (r) => ({
            status: r.bff === 'ok' ? CheckStatus.SUCCESS : CheckStatus.FAIL,
            message: r.bff === 'ok' ? 'BFF is healthy.' : 'BFF health check failed.',
        }),
        'port-conflict': (r) => ({
            status: r.port === 'open' ? CheckStatus.SUCCESS : CheckStatus.FAIL,
            message: r.port === 'open' ? 'Required port is available.' : 'Port is occupied.',
        }),
        'json-syntax': (r) => ({
            status: r.json_syntax === 'ok' ? CheckStatus.SUCCESS : CheckStatus.FAIL,
            message: r.json_syntax === 'ok' ? 'JSON syntax is valid.' : 'JSON syntax error detected.',
        }),
        'dependency-path': (r) => ({
            status: r.dependency_path === 'ok' ? CheckStatus.SUCCESS : CheckStatus.FAIL,
            message: r.dependency_path === 'ok' ? 'Dependency paths are resolved.' : 'Dependency path error.',
        }),
        'env-mismatch': (r) => {
            const issue = r.env && typeof r.env === 'object' ? r.env.issues.find(i => i.type === 'mismatch') : undefined;
            return {
                status: issue ? CheckStatus.FAIL : CheckStatus.SUCCESS,
                message: issue ? issue.message : 'Environment URL configuration is correct.',
            };
        },
        'env-completeness': (r) => {
            const issue = r.env && typeof r.env === 'object' ? r.env.issues.find(i => i.type === 'missing') : undefined;
            return {
                status: issue ? CheckStatus.FAIL : CheckStatus.SUCCESS,
                message: issue ? issue.message : 'All required environment variables are present.',
            };
        },
    };

    CHECKS.forEach(check => {
        const mapper = checkMap[check.id];
        if (mapper) {
            const partialResult = mapper(report);
            results[check.id] = {
                checkId: check.id,
                status: partialResult.status || CheckStatus.PENDING,
                message: partialResult.message || 'No data in report.',
                suggestion: partialResult.suggestion,
            };
        } else {
             results[check.id] = {
                checkId: check.id,
                status: CheckStatus.PENDING,
                message: 'Check not found in report.',
            };
        }
    });

    return results;
};
