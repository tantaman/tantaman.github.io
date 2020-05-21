"use strict";
const { solveQP } = require("./quadprog");

module.exports = function(qmat, cvec, amat, bvec, meq = 0, factorized = false) {
    const Dmat = [null].concat(qmat.map(row => [null].concat(row)));
    const dvec = [null].concat(cvec.map(v => -v));
    const Amat = [null].concat(amat.length === 0 ? new Array(qmat.length).fill([null]) : amat[0].map((_, i) => [null].concat(amat.map(row => -row[i]))));
    const bvecp = [null].concat(bvec.map(v => -v));
    const {
        solution,
        Lagrangian: lagrangian,
        value: boxedVal,
        unconstrained_solution: unconstrained,

        iterations: iters,
        iact,
        message
    } = solveQP(Dmat, dvec, Amat, bvecp, meq, [, +factorized]); // eslint-disable-line no-sparse-arrays

    if (message.length > 0) {
        throw new Error(message);
    } else {
        solution.shift();
        lagrangian.shift();
        unconstrained.shift();
        iact.push(0);
        const active = iact.slice(1, iact.indexOf(0)).map(v => v - 1);
        const [, value] = boxedVal;
        const [, iterations, inactive] = iters;

        return {
            solution,
            lagrangian,
            unconstrained,
            iterations,
            inactive,
            active,
            value
        };
    }
};
