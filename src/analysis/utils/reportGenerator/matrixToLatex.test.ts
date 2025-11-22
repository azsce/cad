import { expect, test, describe } from "bun:test";
import { matrix } from "mathjs";
import { matrixToLatex } from "./matrixToLatex";

describe("matrixToLatex", () => {
    test("formats integers without decimal points", () => {
        const m = matrix([[1, 2], [3, 4]]);
        const latex = matrixToLatex(m);
        expect(latex).toBe(String.raw`\begin{pmatrix} 1 & 2 \\ 3 & 4 \end{pmatrix}`);
    });

    test("formats decimals with trimmed zeros", () => {
        const m = matrix([[1.5, 2.1234], [3.1, 4]]);
        const latex = matrixToLatex(m);
        // 1.500 -> 1.5
        // 2.1234 -> 2.123 (rounded to 3 decimals)
        // 3.10 -> 3.1
        // 4.0 -> 4
        expect(latex).toBe(String.raw`\begin{pmatrix} 1.5 & 2.123 \\ 3.1 & 4 \end{pmatrix}`);
    });

    test("formats zero correctly", () => {
        const m = matrix([[0, 0.00000000001]]);
        const latex = matrixToLatex(m);
        expect(latex).toBe(String.raw`\begin{pmatrix} 0 & 0 \end{pmatrix}`);
    });
});
