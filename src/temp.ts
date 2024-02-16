export {};

const splitByCplRegex = /(CODE\d{8})/g;
const s = `alksndmjasdfn CODE` + `00001001 111 lksndlne CODE` + `11111111 2222 slmsdlkmsdlkm`;

const expectedR = [
    [
        { s: `alksndmjasdfn ` },
        { s: `CODE` + `00001002`, t: "cpl" },
        { s: ` 111 lksndlne ` },
        { s: `CODE` + `11111111`, t: "cpl" },
        { s: ` 2222 slmsdlkmsdlkm` },
    ],
];

function main() {
    const r = s.split(splitByCplRegex);
    console.log(r);
}

main();
