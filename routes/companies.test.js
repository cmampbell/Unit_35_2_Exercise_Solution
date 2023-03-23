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
    VALUES ('indu', 'Industry Test')`)
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

afterAll(async ()=> await db.end());

describe('GET /companies', () => {
    test('Does GET /companies return all users', async () => {
        const resp = await request(app).get('/companies')

        expect(resp.statusCode).toBe(200);
        expect(resp.header['content-type']).toContain('application/json')

        expect(resp.body).toEqual({'companies': expect.any(Array) });
        expect(resp.body.companies.length).toEqual(1)

        expect(resp.body.companies[0]).toEqual({'code': 'test', 'name': 'TestingCo'})
    })

    test('Does GET /companies throw an error if there are no companies', async () => {
        await db.query(`DELETE FROM companies`);

        const resp = await request(app).get('/companies')

        expect(resp.statusCode).toBe(404);
        expect(resp.body).toEqual({'error': {'message' :'No results found', 'status': 404}})
    })
})

describe('GET /companies/:code', () => {
    test('Does GET /companies/:code return correct company', async () => {
        const resp = await request(app).get(`/companies/${testCompanyInfo.code}`)

        expect(resp.statusCode).toBe(200);
        expect(resp.header['content-type']).toContain('application/json')

        expect(resp.body).toEqual({'company': testCompany.rows[0], 'invoices': expect.any(Array), 'industries': (expect.any(Array)) });
    })

    test('Does /companies/:code return 404 if company not found', async ()=>  {
        const resp = await request(app).get(`/companies/0`);

        expect(resp.statusCode).toBe(404);
        expect(resp.body).toEqual({'error': {'message' :'No result found for 0', 'status': 404}})
    })
})

describe('POST /companies', () => {
    test('Does POST /companies create a new company and return new company info', async () => {
        const newCompany = {'name': 'Dummy Co', 'description': 'dummy test company'};
        const resp = await request(app).post(`/companies`).send(newCompany);

        expect(resp.statusCode).toBe(201);
        expect(resp.header['content-type']).toContain('application/json')

        expect(resp.body).toEqual({'company': expect.any(Object) });
        expect(resp.body.company).toEqual({'code': 'dummyco', ...newCompany});

        const all = await request(app).get('/companies');

        expect(all.body.companies.length).toBe(2);
    })

    test('Does POST /companies return 400 if sent incomplete info', async ()=>  {
        const resp = await request(app).post(`/companies`).send({'name': 'bobobo'})

        expect(resp.statusCode).toBe(400);
        expect(resp.body).toEqual({'error': {'message' :'Bad request', 'status': 400}})
    })

    test('Does POST /companies return 400 if sent all field but empty info', async ()=>  {
        const resp = await request(app).post(`/companies`).send({'name': '', 'code': '', 'description': ''})

        expect(resp.statusCode).toBe(400);
        expect(resp.body).toEqual({'error': {'message' :'Bad request', 'status': 400}})
    })
    
})

describe('PATCH /companies/:code', () => {
    test('Does PATCH /companies/:code update a company and return the new company info', async () => {
        const resp = await request(app).patch(`/companies/${testCompanyInfo.code}`).send({'name': 'bobobo', 'description' : 'testing company'});

        expect(resp.statusCode).toBe(200);
        expect(resp.header['content-type']).toContain('application/json')

        expect(resp.body).toEqual({'company': expect.any(Object) });
        expect(resp.body.company).toEqual({'code': 'test', 'name': 'bobobo', 'description': 'testing company' });
    })

    test('Does PATCH /companies/:code return company info if supplied info matches current info', async () => {
        const resp = await request(app).patch(`/companies/${testCompanyInfo.code}`).send({'name': testCompanyInfo.name, 'description' : testCompanyInfo.description});

        expect(resp.statusCode).toBe(200);
        expect(resp.header['content-type']).toContain('application/json')

        expect(resp.body).toEqual({'company': expect.any(Object) });
        expect(resp.body.company).toEqual(testCompanyInfo);
    })

    test('Does PATCH /companies/:code return 400 if user does not supply required info', async () => {
        const resp = await request(app).patch(`/companies/${testCompanyInfo.code}`).send({'description' : 'testing company'});

        expect(resp.statusCode).toBe(400);
        expect(resp.header['content-type']).toContain('application/json')
        expect(resp.body).toEqual({'error': {'message' :'Please provide name and description', 'status': 400}})
    })

    test('Does PATCH /companies/:code return 404 if company not found', async () => {
        const resp = await request(app).patch(`/companies/0`).send({'name': 'zero', 'description' : 'testing company'});

        expect(resp.statusCode).toBe(404);
        expect(resp.header['content-type']).toContain('application/json')
        expect(resp.body).toEqual({'error': {'message' :'No result found for 0', 'status': 404}})
    })
})

describe('DELETE /companies/:code', () => {
    test('Does DELETE /companies/:code delete a company', async () => {
        const resp = await request(app).delete(`/companies/${testCompanyInfo.code}`);

        expect(resp.statusCode).toBe(200);
        expect(resp.header['content-type']).toContain('application/json')

        expect(resp.body).toEqual({'msg': 'Deleted', 'company': expect.any(Object) });

        const all = await request(app).get('/companies');

        expect(all.body).toEqual({'error': {'message' :'No results found', 'status': 404}})
    })

    test('Does DELETE /companies/:code throw 404 if no company found', async () =>{
        const resp = await request(app).delete(`/companies/0`);

        expect(resp.statusCode).toBe(404);
        expect(resp.header['content-type']).toContain('application/json')
        expect(resp.body).toEqual({'error': {'message' :'No result found for 0', 'status': 404}})
    })
})