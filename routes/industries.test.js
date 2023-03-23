process.env.NODE_ENV = 'test';

const request = require('supertest');
const app = require('../app');
const db = require('../db');

const testCompanyInfo = {'name' : 'TestingCo', 'code' :'test', 'description' : 'Company used for testing purposes'};
const testInvoiceInfo = ['test', 400, false, null];
const testIndustryInfo = {'code': 'indu', 'industry': 'Testing'}

let testCompany;
let testInvoice;
let testIndustry;

beforeEach(async () => {
    testCompany = await db.query(`INSERT INTO companies (name, code, description) 
    VALUES ($1, $2, $3) 
    RETURNING code, name, description`, [testCompanyInfo.name, testCompanyInfo.code, testCompanyInfo.description])
    testInvoice = await db.query(`INSERT INTO invoices (comp_Code, amt, paid, paid_date) 
    VALUES ($1, $2, $3, $4) 
    RETURNING id, comp_code, amt, paid, add_date, paid_date`, testInvoiceInfo)
    testIndustry = await db.query(`INSERT INTO industries
    VALUES ($1, $2)`, [testIndustryInfo.code, testIndustryInfo.industry])
    await db.query(`INSERT INTO company_industries (comp_code, ind_code)
    VALUES ('test', 'indu')`)

});

afterEach(async () => {
    await Promise.all([
        db.query(`DELETE FROM company_industries`),
        db.query(`DELETE FROM industries`),
        db.query(`DELETE FROM companies`),
        db.query(`DELETE FROM invoices`)
    ])
});

afterAll(async ()=> {
    await db.end()
})

describe('GET /', () => {
    test('Does GET / return all industries and their companies', async() => {
        const resp = await request(app).get('/industries')

        expect(resp.statusCode).toBe(200);
        expect(resp.body).toEqual(expect.any(Object));

        expect(Object.keys(resp.body)).toContain(testIndustryInfo.industry)
    })

    test('Does GET / return 404 if there are no industries', async() => {
        await db.query(`DELETE FROM industries`)
        const resp = await request(app).get('/industries')

        expect(resp.statusCode).toBe(404);
        expect(resp.body).toEqual({'error': {'message' :'No industries found', 'status': 404}})
    })
})

describe('POST /', () => {
    test('Does POST / add a new industry', async () => {
        const resp = await request(app).post('/industries').send({'code': 'foo', 'industry': 'Good stuff'})

        expect(resp.statusCode).toBe(201);
        expect(resp.body).toEqual({'industry': {'code': 'foo', 'industry': 'Good stuff'}})

        const results = await db.query(`SELECT code FROM industries`);

        expect(results.rows.length).toBe(2);
    })

    test('Does POST / return 400 if required data not sent', async() => {
        const resp = await request(app).post('/industries').send({'code': ''})

        expect(resp.statusCode).toBe(400)
        expect(resp.body).toEqual({'error': {'message':'code and industry required', 'status':400}})
    })
})

describe('POST /addcompany', () => {
    test('Does POST /addcompany add a company to an industry', async() => {
        const resp = await request(app).post('/industries/addcompany').send({'compCode': 'test', 'indCode': 'indu'})

        expect(resp.statusCode).toBe(201);
        expect(resp.body).toEqual({'comp_code': 'test', "ind_code": 'indu'})
    })

    test('Does POST /addcompany return 400 if company or industry do not exist', async() => {
        const resp = await request(app).post('/industries/addcompany').send({'compCode': 'fake', 'indCode': 'bad'})

        expect(resp.statusCode).toBe(400);
        expect(resp.body).toEqual({'error': {'message':'Company or industry does not exist', 'status':400}})
    })

    test('Does POST /addcompany return 400 if required info not sent', async() => {
        const resp = await request(app).post('/industries/addcompany').send({'compCode': ''})

        expect(resp.statusCode).toBe(400);
        expect(resp.body).toEqual({'error': {'message':'code and industry required', 'status':400}})
    })
})