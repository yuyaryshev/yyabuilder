export interface IntInterval {
    a: number; // Включая
    b: number; // Не включая
}

export type IntId = number;

export interface IntervalsSqlRow {
    id: number;
    m: number;
    c: number;
}

export class IntIdManager {
    protected _intervals: IntInterval[];
    changed: boolean;
    constructor(public readonly defaultInterval: IntInterval = { a: 1, b: 100000000 }) {
        this._intervals = [defaultInterval] || [];
        this.removeInvalidIntervals();
        this.changed = false;
    }

    removeInvalidIntervals() {
        for (let i = 0; i < this.intervals.length; i++) {
            const { a, b } = this.intervals[i];
            if (a >= b) {
                this.intervals.splice(i, 1);
                i--;
                this.changed = true;
            }
        }
    }

    get intervals() {
        return this._intervals;
    }

    set intervals(v: IntInterval[]) {
        this._intervals = v;
        this.changed = false;
        this.removeInvalidIntervals();
    }

    removeId(id: IntId) {
        const ln = this.intervals.length;
        for (let i = 0; i < ln; i++) {
            const interval = this.intervals[i];
            if (interval.a <= id && id < interval.b) {
                this.changed = true;
                if (interval.a === id) {
                    interval.a++;
                    if (interval.a >= interval.b) this.intervals.splice(i, 1);
                } else {
                    this.intervals.splice(i, 1);
                    const newIntervs: IntInterval[] = [];
                    if (interval.a < id) this.intervals.push({ a: interval.a, b: id });

                    if (id + 1 < interval.b) this.intervals.push({ a: id + 1, b: interval.b });
                }
                break;
            }
        }
    }

    newId(): IntId {
        const ln = this.intervals.length;
        if (!ln) return 0;

        this.changed = true;
        let minIntervalIndex = 0;
        let minInterval = this.intervals[0];
        let minSize = minInterval.b - minInterval.a;

        for (let i = 1; i < ln; i++) {
            if (minSize == 1) break;

            const interval = this.intervals[i];
            const size = interval.b - interval.a;
            if (size < minSize) {
                minInterval = interval;
                minSize = size;
                minIntervalIndex = i;
            }
        }

        const r = minInterval.a++;
        if (minInterval.a >= minInterval.b) this.intervals.splice(minIntervalIndex, 1);

        return r;
    }

    clear() {
        this._intervals = [];
        this.changed = false;
    }

    makeIntervalsSql(tableName: string, limit: number = 10000): string {
        return `
            select *
            from
                (
                select 
                    id, 
                    max(a) m, 
                    count(1) c
                from
                    (
                    select id id, 0 a from ${tableName}
                    union all
                    select id+1 id, 1 a from ${tableName}
                    union all
                    select id-1 id, -1 a from ${tableName}
                    ) q
                group by id
                having count(1) <3
                ) q
            where c=2 or c=1 and m=0
            order by id
            limit ${limit}
            `;
    }

    intervalsSqlRowsToIntervals(orderedIntervalsSqlRows: IntervalsSqlRow[]) {
        for (const r of orderedIntervalsSqlRows) {
            if (r.c === 1) {
                // TODO C=1 => точка
            } else if (r.c === 2) {
                if (r.m === 0) {
                    // TODO C=2 => интервал, m=0 начало
                } else if (r.m === 1) {
                    // TODO C=2 => интервал, m=1 конец
                } else {
                    throw new Error(`CODE00000154 Invalid row in intervalsSqlRowsToIntervals. Use correct sql!`);
                }
            } else {
                throw new Error(`CODE00000156 Invalid row in intervalsSqlRowsToIntervals. Use correct sql!`);
            }
        }
    }

    // TODO Функция:Задать интервалы
    // TODO Функция:Очистить интервалы
    // TODO Функция:Добавить интервалы
    // TODO Функция:Исключить интервалы
}
