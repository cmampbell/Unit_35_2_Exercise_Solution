const express = require('express');
const slugify = require('slugify')
const db = require("../db");
const ExpressError = require('../expressError');

const router = new express.Router();

router.get('/', async (req, res, next) => {
    try{
        const results = await db.query(`SELECT code, name FROM companies;`)
        if (results.rows.length === 0) throw new ExpressError('No results found', 404)
        return res.json({companies: results.rows })
    } catch (err) {
        return next(err)
    }
})

router.get('/:code', async (req, res, next) => {
    try{
        const code = req.params.code
        const company = await db.query(`SELECT * FROM companies WHERE code=$1;`, [code])

        if (company.rows.length === 0) throw new ExpressError(`No result found for ${code}`, 404)

        const invoices = await db.query(`SELECT * FROM invoices WHERE comp_code=$1`, [code])

        const industry = await db.query(`
            SELECT i.industry 
            FROM companies as c 
            JOIN company_industries as ci ON ci.comp_code = c.code 
            JOIN industries as i ON ci.ind_code = i.code`)

        const industries = industry.rows.map((ind) => ind.industry)
        return res.json({company: company.rows[0], invoices: invoices.rows, industries})
    } catch (err) {
        return next(err)
    }
})

router.post('/', async (req, res, next) => {
    try{
        // we use slugify to make the code from name
        const {name, description } = req.body;
        if(!name || !description) throw new ExpressError(`Bad request`, 400)

        const code = slugify(name, {replacement: '', lower: true })
        const results = await db.query(
            `INSERT INTO companies (name, code, description) 
            VALUES ($1, $2, $3) 
            RETURNING code, name, description`, [name, code, description])
        return res.status(201).json({company: results.rows[0]})
    } catch (err) {
        return next(err);
    }
})

router.patch('/:code', async (req, res, next) => {
    try {
        const code = req.params.code
        const { name, description } = req.body;

        if(!name || !description) throw new ExpressError('Please provide name and description', 400)

        const found = await db.query(`SELECT * FROM companies WHERE code=$1;`, [code]);

        if (found.rows.length === 0) throw new ExpressError(`No result found for ${code}`, 404);

        const company = found.rows[0];

        if(company.name != name || company.description != description ){
            const results = await db.query(
                `UPDATE companies
                SET name = $1, description = $2
                WHERE code = $3
                RETURNING code, name, description`, [name, description, code]
                )

            return res.json({company: results.rows[0]})
        } 
        else {
            return res.json({company: company})
        }
    } catch(err) {
        return next(err)
    }
})

router.delete('/:code', async (req, res, next) => {
    try{
        const code = req.params.code;
        const found = await db.query(`SELECT * FROM companies WHERE code=$1;`, [code])
        if (found.rows.length === 0) throw new ExpressError(`No result found for ${code}`, 404)

        const results = await db.query(`DELETE FROM companies WHERE code = $1 RETURNING name, code`, [code])
        return res.json({msg: 'Deleted', company: results.rows[0]})
    } catch (err) {
        return next(err)
    }
})

module.exports = router;