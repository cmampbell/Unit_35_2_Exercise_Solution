const express = require('express');
const { copyDone } = require('pg-protocol/dist/messages');
const db = require("../db");
const ExpressError = require('../expressError');

const router = new express.Router();

router.get('/', async (req, res, next) => {
    try{
        const results = await db.query(`SELECT id, comp_code FROM invoices;`)
        if (results.rows.length === 0) throw new ExpressError('No results found', 404)
        return res.json({invoices: results.rows })
    } catch (err) {
        return next(err)
    }
})

router.get('/:id', async (req, res, next) => {
    try{
        const id = req.params.id;
        const results = await db.query(
            `SELECT * FROM invoices 
            JOIN companies ON code = invoices.comp_code 
            WHERE invoices.id = $1;`, [id]);

        if (results.rows.length === 0) throw new ExpressError('No results found', 404);

        const invoice = results.rows[0];

        return res.json({invoice :{
            'id' : invoice.id, 
            'amt' : invoice.amt, 
            'paid' : invoice.paid, 
            'add_date' : invoice.add_date,
            'paid_date': invoice.paid_date,
            'company' : {
                'code': invoice.code,
                'name': invoice.name,
                'description' : invoice.description,
            }
        }}) 
    } catch (err) {
        return next(err);
    }
})

router.post('/', async (req, res, next) => {
    try{
        const {comp_code: compCode , amt} = req.body;
        if(!compCode || !amt) throw new ExpressError(`Bad request`, 400)

        const results = await db.query(
            `INSERT INTO invoices (comp_Code, amt, paid, paid_date) 
            VALUES ($1, $2, $3, $4) 
            RETURNING id, comp_code, amt, paid, add_date, paid_date`, [compCode, amt, false, null])

        return res.status(201).json({invoice: results.rows[0]});

    } catch (err){
        return next(err)
    }
})

router.patch('/:id', async (req, res, next) => {
    try {
        const id = req.params.id;

        if (req.body.paid === true){
            const result = await db.query(`
            UPDATE invoices
            SET paid = $2, paid_date = CURRENT_DATE
            WHERE id = $1
            RETURNING id, comp_code, amt, paid, add_date, paid_date`, [id, true ])

            return res.json({invoice: result.rows[0]})
        }
        const found = await db.query(`SELECT * FROM invoices WHERE id=$1;`, [id]);
        if (found.rows.length === 0) throw new ExpressError(`No result found for ${id}`, 404);

        const {amt, paid} = req.body;
        if (!amt) throw new ExpressError(`No amount to update`, 400)

        const result = await db.query(
            `UPDATE invoices
            SET amt = $1
            WHERE id = $2
            RETURNING id, comp_code, amt, paid, add_date, paid_date`, [amt, id ]
            )

       return res.json({invoice: result.rows[0]});

    } catch (err) {
        return next(err)
    }
})

router.delete('/:id', async (req, res, next) => {
    try {
        const id = req.params.id;
        const found = await db.query(`SELECT * FROM invoices WHERE id=$1;`, [id]);
        if(found.rows.length === 0) throw new ExpressError(`No result found for ${id}`, 404);

        const results = await db.query(`DELETE FROM invoices WHERE id = $1 RETURNING *`, [id]);
        return res.json({msg: 'Deleted', invoice: results.rows[0]});
    } catch (err) {
        return next(err);
    }
})

module.exports = router;