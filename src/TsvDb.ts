// TsvDb.ts
import fs from "fs";
import { objectArraySorter } from "./sortBy.js";
import * as windows1251 from "./win1251.js";

export interface TsvRow {
    [key: string]: string | number | undefined;
}

export function checkKeys(a: any, skipUndefined?: boolean): any {
    const invalidKeys: string[] = [];
    for (let k in a) {
        if (k !== k.toLowerCase()) {
            invalidKeys.push(k);
        }
        if (a[k] === "" || a[k] === null || a[k] === undefined) {
            if (skipUndefined) {
                delete a[k];
            } else {
                a[k] = undefined;
            }
        } else if ((a[k] as any) === true) {
            a[k] = 1;
        } else if ((a[k] as any) === false) {
            a[k] = 0;
        }
    }

    if (invalidKeys.length) {
        throw new Error(`CODE00000013 Invalid keys in TsvRow! Must be lowercase: ${invalidKeys.join(",")}`);
    }

    return a;
}

export function removeLns(s: string): string {
    if (typeof s === "string") {
        const r = s.split("\t").join(" ").split(universalLineSplitter).join(" ").split("\r").join(" ");
        return r;
    }

    return s;
}

export interface TsvTypeDef {
    pkCols: string[];
}
export interface TsvDbOpts {
    tsvFilePath: string;
    typeCol: string | undefined;
    typeDefs: { [key: string]: TsvTypeDef };
    orderby?: readonly string[];
    columns?: readonly string[];
    removeOnExport?: readonly string[];
    encoding?: BufferEncoding;
}

(global as any).strCharCodes = (s: string) => {
    const codes: number[] = [];
    for (let i = 0; i < s.length; i++) {
        codes.push(s.codePointAt(i)!);
    }
    return codes.join(" ");
};

export const columnNameRegexpValidator = /^[a-z_][a-z0-9_]*$/;

export function removeBOMprefix(s: string): string {
    if (s.charCodeAt(0) === 65533 && s.charCodeAt(1) === 65533) {
        return s.slice(2);
    }
    return s;
}

export function addBOMprefix(s: string): string {
    if (s.charCodeAt(0) === 65533 && s.charCodeAt(1) === 65533) {
        return s;
    }

    return "\ufeff" + s; //"\uFEFF" + s;
}

export const universalLineSplitter = /\r?\n/;

export class TsvDb {
    private rows: { [key: string]: TsvRow } = {};
    private tsvFilePath: string;
    private allPkCols: string[] = [];
    private typeCol: string | undefined;
    private typeDefs: { [key: string]: TsvTypeDef };
    private sortFunc: (array: any[]) => any[];
    private sortedRows: undefined | TsvRow[];
    private removeOnExport: string[];
    private encoding?: BufferEncoding;

    private cols: (keyof TsvRow)[] = [];
    private existingCols: { [key: string]: boolean };

    constructor(opts: TsvDbOpts) {
        this.encoding = opts.encoding;
        this.tsvFilePath = opts.tsvFilePath;
        this.typeCol = opts.typeCol;
        this.typeDefs = opts.typeDefs;
        this.removeOnExport = [...(opts.removeOnExport || [])];

        this.existingCols = {};

        if (opts.columns) {
            for (let columnName of opts.columns) {
                this.upsertColumn(columnName);
            }
        }

        for (let k of this.removeOnExport) {
            this.existingCols[k] = false;
        }

        this.sortFunc = (a: any[]) => a;
        if (opts.orderby && opts.orderby.length) {
            this.sortFunc = objectArraySorter([...opts.orderby]);
            for (let columnName of opts.orderby) {
                if (columnName.endsWith("+") || columnName.endsWith("-")) {
                    columnName = columnName.slice(0, -1);
                    this.upsertColumn(columnName);
                }
            }
        }

        for (let type in this.typeDefs) {
            for (let columnName of this.typeDefs[type].pkCols) {
                this.upsertColumn(columnName);
            }
        }
        for (let c of ["tsv_line"]) {
            this.upsertColumn(c);
        }
    }

    upsertColumn(columnName: string, isPk?: boolean) {
        if (!(columnName in this.existingCols)) {
            if (!columnNameRegexpValidator.test(columnName)) {
                if (columnName !== columnName.toLowerCase()) {
                    throw new Error(`CODE00001445 Invalid columnName='${columnName}' - must be lower case!`);
                }
                throw new Error(`CODE00001446 Invalid columnName='${columnName}'! Contains banned chars! or isn't starting with a letter!`);
            }
            this.cols.push(columnName);
            this.existingCols[columnName] = true;
            if (isPk) {
                this.allPkCols.push(columnName);
            }
        }
    }

    getRecType(row: TsvRow) {
        const type = this.typeCol ? row[this.typeCol] || "default" : "default";
        return type;
    }

    expectRecPkCols(row: TsvRow) {
        const type = this.typeCol ? row[this.typeCol] || "default" : "default";
        const pkCols = this.typeDefs[type];
        if (!pkCols) {
            throw new Error(`CODE00001447 TsvDb.expectRecPk failed! Type=${type} not found!`);
        }
        return pkCols;
    }

    expectRecPk(row: TsvRow) {
        const type = this.typeCol ? row[this.typeCol] || "default" : "default";
        const typeDef = this.typeDefs[type];
        if (!typeDef) {
            throw new Error(`CODE00001448 TsvDb.expectRecPk failed! Type=${type} not found!`);
        }

        const pkParts: string[] = [];
        for (let cn of typeDef.pkCols) {
            const v = row[cn];
            if (typeof v === "string") {
                pkParts.push(v);
            } else if (typeof v === "number") {
                pkParts.push(v + "");
            } else {
                throw new Error(`CODE00001449 TsvDb.expectRecPk failed! col=${cn} has value ${JSON.stringify(v)} which can't be part of pk!`);
            }
        }
        const pk = pkParts.join(":");
        return pk;
    }

    upsert(row: TsvRow, skipUndefined?: boolean) {
        checkKeys(row, skipUndefined);

        const pk = this.expectRecPk(row);

        for (let k in row) {
            this.upsertColumn(k);
        }

        const existingRow = this.rows[pk];
        if (!existingRow) {
            this.rows[pk] = { ...row };
        } else {
            Object.assign(existingRow, row);
        }
    }

    deleteUnknownCols(row: TsvRow): TsvRow {
        for (let k in row) {
            if (!this.existingCols[k]) {
                delete row[k];
            }
        }
        return row;
    }

    markAllAsDeleted() {
        const deleted_ts = new Date().toISOString();
        for (const k in this.rows) {
            if (this.rows[k].deleted_ts === undefined) {
                this.rows[k].deleted_ts = deleted_ts;
            }
        }
    }

    getAll(): TsvRow[] {
        if (this.sortedRows) {
            return this.sortedRows;
        }

        this.sortedRows = Object.values(this.rows);
        this.sortedRows = this.sortFunc(this.sortedRows);
        return this.sortedRows;
    }

    *scan() {
        for (let k in this.rows) {
            yield this.rows[k];
        }
    }

    importTsv(opts?: { deleteUnknownColumns?: boolean }) {
        let tsvData: string;
        let effectiveEncoding: BufferEncoding | undefined = this.encoding;
        if (effectiveEncoding === undefined) {
            const dataBuf = fs.readFileSync(this.tsvFilePath);

            effectiveEncoding = (dataBuf[0] === 239 && dataBuf[1] === 187 && dataBuf[2] === 191 ? "utf-8" : 1251) as any;

            if ((effectiveEncoding as any) === 1251) {
                tsvData = windows1251.decode(dataBuf);
            } else {
                tsvData = removeBOMprefix(fs.readFileSync(this.tsvFilePath, effectiveEncoding as BufferEncoding));
            }
        } else {
            tsvData = removeBOMprefix(fs.readFileSync(this.tsvFilePath, effectiveEncoding));
        }

        if (tsvData.length < 100 && !tsvData.trim().length) {
            // Empty file
            return;
        }

        const [headerStr, ...rows] = tsvData
            .split(universalLineSplitter)
            .map((line) => line.split("\t"))
            .filter((line) => line[0].length || line.join("").trim().length);

        const fileCols = headerStr.map((c) => c.trim().toLowerCase());

        for (const fileCol of fileCols) {
            if (!opts?.deleteUnknownColumns) {
                this.upsertColumn(fileCol);
            }
        }

        for (const pkCol of this.allPkCols) {
            if (fileCols.indexOf(pkCol) < 0) {
                throw new Error(`CODE00001000 TsvDb.importTsv failed because file '${this.tsvFilePath}' is missing pk column '${pkCol}'`);
            }
        }

        let tsv_line: number = 1;
        for (let fileRow of rows) {
            const row: any = {};
            for (let i = 0; i < fileCols.length; i++) {
                row[fileCols[i]] = fileRow[i];
            }
            if (opts?.deleteUnknownColumns) {
                this.deleteUnknownCols(row);
            }

            row.tsv_line = tsv_line++;
            this.upsert(row, true);
        }
    }

    exportTsv() {
        const queryResult = this.getAll();
        const cols = this.cols;
        const header = cols.join("\t") + "\n";
        const tsvContent = addBOMprefix(header + queryResult.map((row) => cols.map((col) => removeLns((row as any)[col])).join("\t")).join("\n"));
        fs.writeFileSync(this.tsvFilePath, tsvContent, this.encoding || "utf-8");
    }

    get(rowPk: Partial<TsvRow>): undefined | TsvRow {
        const pk = this.expectRecPk(rowPk as any);
        return this.rows[pk];
    }

    expect(rowPk: Partial<TsvRow>): TsvRow {
        const pk = this.expectRecPk(rowPk as any);
        const r = this.rows[pk];
        if (!r) {
            throw new Error(`CODE00000948 Expected row pk=${pk} not found in tsv!`);
        }
        return r;
    }
}
