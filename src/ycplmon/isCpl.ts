const cplRegexp = /^COD[ER]\d{8}$/;

export function isCplAt(s: string, p: number): boolean {
    return cplRegexp.test(s.slice(p, p + 12));
}
