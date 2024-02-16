import { TsvDb, TsvDbOpts, TsvRow } from "./TsvDb.js";

export interface CplRecord extends TsvRow {
    cpl: string;
    text?: string;
    path?: string;
    package?: string;
    class?: string;
    function?: string;
    severity?: string;
    deleted_ts?: string;
    a?: string;
    sem_ids?: string;
    cat?: string;

    file_path?: string;
    file_line?: string | number;
    file_line_pos?: string | number;
    source_pos?: string | number;
    expectation?: string;
    ylog_name?: string;
    cpl_comment?: string;
    has_ylog_on?: string | number;
    anchor_key?: string;
}

export const defaultCplTableColumns: readonly (keyof CplRecord)[] = Object.freeze([
    "path",
    "package",
    "class",
    "function",
    "severity",
    "deleted_ts",
    "a",
    "sem_ids",
    "cat",

    "file_path",
    "file_line",
    "file_line_pos",
    "source_pos",
    "expectation",
    "ylog_name",
    "cpl_comment",
    "has_ylog_on",

    "text",
    "anchor_key",
] as const);

export const cplDbOrderBy = ["file_path", "source_pos"] as const;

export function makeCplDbOpts(tsvPath: string): TsvDbOpts {
    const r: TsvDbOpts = {
        tsvFilePath: tsvPath,
        columns: defaultCplTableColumns as any,
        typeCol: undefined,
        typeDefs: { default: { pkCols: ["cpl"] } },
        orderby: ["file_path", "source_pos"],
    };
    return r;
}
