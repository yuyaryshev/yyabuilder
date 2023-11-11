export {};

const splitByCplRegex = /(CODE\d{8})/g;
const s = `alksndmjasdfn CODE00000000 111 lksndlne CODE11111111 2222 slmsdlkmsdlkm`;

const expectedR = [
    [
        { s: `alksndmjasdfn ` },
        { s: `CODE00000000`, t: "cpl" },
        { s: ` 111 lksndlne ` },
        { s: `CODE11111111`, t: "cpl" },
        { s: ` 2222 slmsdlkmsdlkm` },
    ],
];

function main() {
    const r = s.split(splitByCplRegex);
    console.log(r);
}

main();
