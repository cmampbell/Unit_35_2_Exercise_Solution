process.env.NODE_ENV = 'test';

const request = require('supertest');
const app = require('../app');
const db = require('../db');

const testCompanyInfo = {'name' : 'TestingCo', 'code' :'test', 'description' : 'Company used for testing purposes'};
const testInvoiceInfo = ['test', 400, false, null];

let testCompany;
let testInvoice;

beforeEach(async () => {
    testCompany = await db.query(`INSERT INTO companies (name, code, description) 
    VALUES ($1, $2, $3) 
    RETURNING code, name, description`, [testCompanyInfo.name, testCompanyInfo.code, testCompanyInfo.description])
    testInvoice = await db.query(`INSERT INTO invoices (comp_Code, amt, paid, paid_date) 
    VALUES ($1, $2, $3, $4) 
    RETURNING id, comp_code, amt, paid, add_date, paid_date`, testInvoiceInfo)
});

afterEach(async () => {
    await db.query(`DELETE FROM companies`)
    await db.query(`DELETE FROM invoices`)
});

afterAll(async ()=> await db.end());

describe('GET /invoices', () => {
    test('Does GET /invoices return all invoices', async ()=> {
        const resp = await request(app).get('/invoices');

        expect(resp.statusCode).toBe(200);
        expect(resp.header['content-type']).toContain('application/json')

        expect(resp.body).toEqual({'invoices': expect.any(Array) });
        expect(resp.body.invoices.length).toEqual(1)
    })

    test('Does GET /invoices return 404 if there are no invoices', async ()=> {
        await db.query(`DELETE FROM invoices`)
        const resp = await request(app).get('/invoices');

        expect(resp.statusCode).toBe(404);
        expect(resp.header['content-type']).toContain('application/json')
        expect(resp.body).toEqual({'error': {'message' :'No results found', 'status': 404}})
    })
})

describe('GET /invoices/:id', () => {
    test('Does GET /invoices/:id return correct invoice', async ()=> {
        const resp = await request(app).get(`/invoices/${testInvoice.rows[0].id}`)

        expect(resp.statusCode).toBe(200);
        expect(resp.header['content-type']).toContain('application/json');
        expect(resp.body).toEqual({'invoice': expect.any(Object) });
    })

    test('Does GET /invoices/:id return 404 if invoice not found', async ()=> {
        const resp = await request(app).get('/invoices/0');

        expect(resp.statusCode).toBe(404);
        expect(resp.header['content-type']).toContain('application/json');

        expect(resp.body).toEqual({'error': {'message' :'No results found', 'status': 404}})
    })
})

describe('POST /invoices', () => {
    test('Does POST /invoices create a new invoice', async ()=> {
        const newInvoice = {'comp_code': 'test', 'amt': 5000};
        const resp = await request(app).post('/invoices').send(newInvoice);

        expect(resp.statusCode).toBe(201);
        expect(resp.header['content-type']).toContain('application/json');

        expect(resp.body.invoice).toEqual({'add_date': expect.any(String), 'amt': 5000, 'comp_code': 'test', 'id': expect.any(Number), 'paid': false, 'paid_date': null})
    })

    test('Does POST /invoices return 400 if required info is not sent', async () =>{
        const badInvoice = {'comp_code': ''};
        const resp = await request(app).post('/invoices').send(badInvoice);

        expect(resp.statusCode).toBe(400);
        expect(resp.header['content-type']).toContain('application/json');

        expect(resp.body).toEqual({'error': {'message' : 'Bad request', 'status': 400}})
    })
})

describe('PATCH /invoices/:id', () => {
    test('Does PATCH /invoices/:id update the invoice', async () => {
        const resp = await request(app).patch(`/invoices/${testInvoice.rows[0].id}`).send({'amt': 6, 'paid': false});

        expect(resp.statusCode).toBe(200);
        expect(resp.header['content-type']).toContain('application/json');

        expect(resp.body).toEqual({'invoice': expect.any(Object) });
        expect(resp.body.invoice.amt).toBe(6);
    })

    test('Does PATCH /invoices/:id update the invoice to paid if paid submitted', async() => {
        const resp = await request(app).patch(`/invoices/${testInvoice.rows[0].id}`).send({'amt': 600, 'paid':true})

        expect(resp.statusCode).toBe(200);
        expect(resp.header['content-type']).toContain('application/json');

        expect(resp.body).toEqual({'invoice': expect.any(Object) });
        expect(resp.body.invoice.paid).toBe(true);
    })

    test('Does PATCH /invoices/:id return 404 if there is no invoice with id', async () => {
        const resp = await request(app).patch('/invoices/0').send({'amt': 6})

        expect(resp.statusCode).toBe(404);
        expect(resp.header['content-type']).toContain('application/json');

        expect(resp.body).toEqual({'error': {'message' : 'No result found for 0', 'status': 404}})
    })

    test('Does PATCH /invoices/:id return 400 if required info is not sent', async () =>{
        const resp = await request(app).patch(`/invoices/${testInvoice.rows[0].id}`).send({'amt': ''});

        expect(resp.statusCode).toBe(400);
        expect(resp.header['content-type']).toContain('application/json');

        expect(resp.body).toEqual({'error': {'message' : 'No amount to update', 'status': 400}})
    })
})

describe('DELETE /invoices/:id', () => {
    test('Does DELETE /invoices/:id delete the invoice', async () => {
        const resp = await request(app).delete(`/invoices/${testInvoice.rows[0].id}`)

        expect(resp.statusCode).toBe(200);
        expect(resp.header['content-type']).toContain('application/json');

        expect(resp.body).toEqual({'msg': 'Deleted', 'invoice': expect.any(Object) });
    })

    test('Does DELETE /invoices/:id return 404 if no invoice found', async () => {
        const resp = await request(app).delete(`/invoices/0`)

        expect(resp.statusCode).toBe(404);
        expect(resp.header['content-type']).toContain('application/json');

        expect(resp.body).toEqual({'error': {'message' : 'No result found for 0', 'status': 404}})
    })
})