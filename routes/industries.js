const express = require('express');
const db = require("../db");
const ExpressError = require('../expressError');

const router = new express.Router();

router.get('/', async (req, res, next) => {
    try {
        const industriesResults = await db.query(`
        SELECT i.code, i.industry, c.code as company FROM industries as i
        LEFT JOIN company_industries AS ci ON ci.ind_code = i.code
        LEFT JOIN companies AS c ON ci.comp_code = c.code
        `)

        if (industriesResults.rows.length === 0) throw new ExpressError('No industries found', 404);

        let industries = {};

        for (let industryData of industriesResults.rows) {
            if (!industries[industryData.industry]) {
                industries[industryData.industry] = ['None'];
                if (industryData.company) {
                    industries[industryData.industry].pop();
                    industries[industryData.industry].push(industryData.company)
                }
            } else {
                industries[industryData.industry].push(industryData.company)
            }
        }

        return res.json(industries)
    } catch (err) {
        return next(err);
    }
})

router.post('/', async (req, res, next) => {
    try{
    const { code, industry } = req.body;

    if (!code || !industry) throw new ExpressError('code and industry required', 400);

    const newIndustry = await db.query(`
        INSERT INTO industries
        VALUES ($1, $2)
        RETURNING code, industry`, [code, industry])

    return res.status(201).json({ 'industry': newIndustry.rows[0] })
    } catch (err) {
        return next(err);
    }
})

router.post('/addcompany', async (req, res, next) => {
    try {
        const { compCode, indCode } = req.body;
        if (!compCode || !indCode ) throw new ExpressError('code and industry required', 400);

        const checkComp = await db.query(`SELECT code FROM companies`)
        const checkInd = await db.query(`SELECT code FROM industries`)

        const compFound = checkComp.rows.find((elem) => compCode === elem.code)
        const indFound = checkInd.rows.find((elem) => indCode === elem.code)

        if (!compFound || !indFound) throw new ExpressError('Company or industry does not exist', 400)

        const newCompanyIndustry = await db.query(`
            INSERT INTO company_industries (comp_code, ind_code)
            VALUES ($1, $2)
            RETURNING comp_code, ind_code`, [compCode, indCode])

        return res.status(201).json(newCompanyIndustry.rows[0])
    } catch (err) {
        return next(err)
    }
})

module.exports = router;