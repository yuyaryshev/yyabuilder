export function sorterFuncSrc(fields: string | string[]) {
    let s = "0";
    if (!Array.isArray(fields)) fields = [fields];

    for (let i = fields.length - 1; i >= 0; i--) {
        let field = fields[i];
        let desc: boolean = false;
        if (field.endsWith("-")) {
            field = field.slice(0, -1);
            desc = true;
        } else if (field.endsWith("+")) {
            field = field.slice(0, -1);
        }

        if (!desc) {
            s = `(a.${field} < b.${field} ? -1 : a.${field} > b.${field} ? 1 : ${s})`;
        } else {
            s = `(a.${field} < b.${field} ? 1 : a.${field} > b.${field} ? -1 : ${s})`;
        }
    }

    return "return " + s;
}

export function sortByFunc(fields: string | string[]) {
    return new Function("a", "b", sorterFuncSrc(fields)) as (a: any, b: any) => number;
}

export function sortObjects(objectsArray: any[], fields: string | string[]) {
    return objectsArray.sort(sortByFunc(fields));
}

export type ObjectArraySorter<T> = (array: T[]) => T[];
export function objectArraySorter(fields: string | string[]): ObjectArraySorter<any> {
    const v_sortByFunc = sortByFunc(fields);
    const rf = (array: any[]): any[] => {
        if (Array.isArray(array)) {
            return array.sort(v_sortByFunc);
        }
        return array;
    };
    return rf;
}
